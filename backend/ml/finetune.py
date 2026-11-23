"""Warm-start fine-tuning and Platt calibration for MDIP XGBoost delay-risk models."""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
from pathlib import Path

import numpy as np
import pandas as pd
import xgboost as xgb
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import brier_score_loss, f1_score, mean_absolute_error, roc_auc_score

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from ml.adapters import load_dslib_snapshot_pairs, load_levy_production_schedules  # noqa: E402
from ml.features import FEATURE_NAMES, feature_matrix  # noqa: E402
from schedule_parser.base import ScheduleParseError  # noqa: E402
from schedule_parser.cpm import compute_cpm  # noqa: E402
from schedule_parser.tables import normalize_rows  # noqa: E402

ARTIFACTS_DIR = Path(__file__).resolve().parent / "artifacts"


def _extract_year_from_id(project_id: str) -> int:
    m = re.search(r"(20\d{2})", project_id)
    return int(m.group(1)) if m else 2018


def _sigmoid(x: np.ndarray) -> np.ndarray:
    return 1.0 / (1.0 + np.exp(-np.clip(x, -40.0, 40.0)))


def build_training_dataset(
    pairs: list[tuple[str, pd.DataFrame, pd.DataFrame]],
    late_tolerance_days: float = 0.25,
) -> tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
    """Run MDIP normalize_rows + compute_cpm + feature_matrix on snapshots and align final labels."""
    X_chunks: list[np.ndarray] = []
    y_late_list: list[int] = []
    y_slip_list: list[float] = []
    group_list: list[str] = []

    for snap_id, snap_df, final_df in pairs:
        try:
            cpm_tasks = compute_cpm(normalize_rows(snap_df))
        except ScheduleParseError:
            continue

        X_snap = np.asarray(feature_matrix(cpm_tasks), dtype=np.float32)
        final_map = final_df.set_index("WBS_Code").to_dict(orient="index")

        valid_rows: list[int] = []
        for i, t in enumerate(cpm_tasks):
            if str(t.get("status_declared", "")).lower() == "completed" or float(t["planned_days"]) <= 0.0:
                continue
            final_rec = final_map.get(t["code"])
            if not final_rec or str(final_rec["Status"]).lower() != "completed":
                continue

            planned = float(t["planned_days"])
            final_actual = float(final_rec["Actual_Forecast_Days"])
            slip = max(0.0, final_actual - planned)
            is_late = int(slip > late_tolerance_days)

            valid_rows.append(i)
            y_late_list.append(is_late)
            y_slip_list.append(slip)
            group_list.append(snap_id.split("__")[0])

        if valid_rows:
            X_chunks.append(X_snap[valid_rows])

    if not X_chunks:
        raise RuntimeError("No valid training rows produced from provided datasets.")

    return (
        np.vstack(X_chunks),
        np.asarray(y_late_list, dtype=np.int32),
        np.asarray(y_slip_list, dtype=np.float32),
        np.asarray(group_list),
    )


def fit_platt_calibrator(clf: xgb.XGBClassifier, X_cal: np.ndarray, y_cal: np.ndarray) -> dict[str, float]:
    """Fit a 2-parameter Platt calibrator on raw XGBoost log-odds margins."""
    raw_margins = clf.get_booster().predict(xgb.DMatrix(X_cal, feature_names=FEATURE_NAMES), output_margin=True)
    lr = LogisticRegression(C=10.0, solver="lbfgs")
    lr.fit(raw_margins.reshape(-1, 1), y_cal)
    return {
        "slope": float(lr.coef_[0][0]),
        "intercept": float(lr.intercept_[0]),
    }


def predict_calibrated_proba(clf: xgb.XGBClassifier, X: np.ndarray, cal: dict[str, float]) -> np.ndarray:
    raw_margins = clf.get_booster().predict(xgb.DMatrix(X, feature_names=FEATURE_NAMES), output_margin=True)
    return _sigmoid(cal["slope"] * raw_margins + cal["intercept"])


def tune_decision_threshold(y_true: np.ndarray, probs: np.ndarray) -> float:
    best_thr, best_f1 = 0.50, -1.0
    for thr in np.linspace(0.25, 0.75, 51):
        score = f1_score(y_true, (probs >= thr).astype(int), zero_division=0)
        if score > best_f1:
            best_f1 = score
            best_thr = float(thr)
    return round(best_thr, 3)


def finetune_models(
    X_train: np.ndarray,
    y_late_train: np.ndarray,
    y_slip_train: np.ndarray,
    X_val: np.ndarray,
    y_late_val: np.ndarray,
    y_slip_val: np.ndarray,
    base_artifacts_dir: Path,
    out_artifacts_dir: Path,
    replay_npz: Path | None = None,
    additional_trees: int = 60,
    lr: float = 0.02,
) -> dict:
    """Warm-start fine-tune MDIP XGBoost models via xgb_model continuation + Platt calibration."""
    out_artifacts_dir.mkdir(parents=True, exist_ok=True)
    base_clf_path = base_artifacts_dir / "delay_risk_classifier.json"
    base_reg_path = base_artifacts_dir / "delay_slip_regressor.json"

    sample_weight = np.ones(len(X_train), dtype=np.float32)
    if replay_npz and replay_npz.exists():
        rep = np.load(replay_npz)
        X_train = np.vstack([X_train, rep["X"]])
        y_late_train = np.concatenate([y_late_train, rep["y_late"]])
        y_slip_train = np.concatenate([y_slip_train, rep["y_slip"]])
        sample_weight = np.concatenate([sample_weight, np.full(len(rep["X"]), 2.0, dtype=np.float32)])

    pos_rate = float(np.mean(y_late_train))
    scale_pos_weight = (1.0 - pos_rate) / max(pos_rate, 1e-4)

    X_tr_df = pd.DataFrame(X_train, columns=FEATURE_NAMES)
    X_va_df = pd.DataFrame(X_val, columns=FEATURE_NAMES)

    clf = xgb.XGBClassifier(
        n_estimators=additional_trees,
        learning_rate=lr,
        max_depth=4,
        min_child_weight=5,
        subsample=0.8,
        colsample_bytree=0.8,
        reg_lambda=5.0,
        reg_alpha=0.5,
        scale_pos_weight=scale_pos_weight,
        objective="binary:logistic",
        eval_metric="logloss",
        random_state=42,
    )
    clf.fit(
        X_tr_df,
        y_late_train,
        sample_weight=sample_weight,
        eval_set=[(X_va_df, y_late_val)],
        xgb_model=str(base_clf_path) if base_clf_path.exists() else None,
        verbose=False,
    )

    mid = max(1, len(X_val) // 2)
    X_cal, y_late_cal = X_val[:mid], y_late_val[:mid]
    X_test, y_late_test, y_slip_test = X_val[mid:], y_late_val[mid:], y_slip_val[mid:]

    raw_probs = clf.predict_proba(pd.DataFrame(X_test, columns=FEATURE_NAMES))[:, 1]
    if len(np.unique(y_late_cal)) >= 2:
        platt_params = fit_platt_calibrator(clf, X_cal, y_late_cal)
        cal_probs = predict_calibrated_proba(clf, X_test, platt_params)
    else:
        platt_params = {"slope": 1.0, "intercept": 0.0}
        cal_probs = raw_probs
    best_thr = tune_decision_threshold(y_late_test, cal_probs)

    late_train_mask = y_late_train == 1
    late_val_mask = y_late_val == 1

    reg = xgb.XGBRegressor(
        n_estimators=additional_trees,
        learning_rate=lr,
        max_depth=4,
        min_child_weight=5,
        subsample=0.8,
        colsample_bytree=0.8,
        reg_lambda=5.0,
        objective="reg:squarederror",
        eval_metric="mae",
        random_state=42,
    )
    reg.fit(
        X_tr_df.loc[late_train_mask],
        y_slip_train[late_train_mask],
        sample_weight=sample_weight[late_train_mask],
        eval_set=[(X_va_df.loc[late_val_mask], y_slip_val[late_val_mask])],
        xgb_model=str(base_reg_path) if base_reg_path.exists() else None,
        verbose=False,
    )

    late_test_mask = y_late_test == 1
    if late_test_mask.any():
        preds = np.maximum(0.25, reg.predict(pd.DataFrame(X_test[late_test_mask], columns=FEATURE_NAMES)))
        slip_mae = float(mean_absolute_error(y_slip_test[late_test_mask], preds))
    else:
        slip_mae = 0.0

    clf.save_model(out_artifacts_dir / "delay_risk_classifier.json")
    reg.save_model(out_artifacts_dir / "delay_slip_regressor.json")

    auc = float(roc_auc_score(y_late_test, cal_probs)) if len(np.unique(y_late_test)) >= 2 else 0.5
    model_card = {
        "model": "XGBoost hurdle model (warm-start fine-tuned + Platt calibrated)",
        "version": "v1.1-finetuned",
        "decision_threshold": best_thr,
        "watch_threshold": round(max(0.20, best_thr * 0.70), 3),
        "platt_calibration": platt_params,
        "metrics_heldout": {
            "roc_auc": round(auc, 4),
            "brier_raw": round(float(brier_score_loss(y_late_test, raw_probs)), 4),
            "brier_calibrated": round(float(brier_score_loss(y_late_test, cal_probs)), 4),
            "conditional_slip_mae_days": round(slip_mae, 3),
            "n_train_tasks": int(len(X_train)),
            "n_test_tasks": int(len(X_test)),
        },
    }
    (out_artifacts_dir / "model_card.json").write_text(json.dumps(model_card, indent=2), encoding="utf-8")
    return model_card


def main() -> None:
    parser = argparse.ArgumentParser(description="Fine-tune MDIP XGBoost models on DSLIB + Levy data.")
    parser.add_argument("--dslib-dir", type=Path, help="Folder containing DSLIB v3.4 .xlsx workbooks")
    parser.add_argument("--levy-csv", type=Path, help="Path to Levy (2014) Production_Data.csv")
    parser.add_argument("--replay-npz", type=Path, default=None, help="Optional NPZ of original 51 tooling projects")
    parser.add_argument("--base-dir", type=Path, default=ARTIFACTS_DIR)
    parser.add_argument("--out-dir", type=Path, default=ARTIFACTS_DIR / "finetuned")
    parser.add_argument("--split-year", type=int, default=2023, help="Temporal cutoff year for DSLIB validation")
    args = parser.parse_args()

    train_pairs, val_pairs = [], []

    if args.dslib_dir and args.dslib_dir.exists():
        for xlsx in sorted(args.dslib_dir.glob("*.xlsx")):
            pairs = load_dslib_snapshot_pairs(xlsx)
            if _extract_year_from_id(xlsx.stem) < args.split_year:
                train_pairs.extend(pairs)
            else:
                val_pairs.extend(pairs)

    if args.levy_csv and args.levy_csv.exists():
        levy_tr, levy_va = load_levy_production_schedules(args.levy_csv)
        train_pairs.extend(levy_tr)
        val_pairs.extend(levy_va)

    X_tr, y_l_tr, y_s_tr, _ = build_training_dataset(train_pairs)
    X_va, y_l_va, y_s_va, _ = build_training_dataset(val_pairs)

    card = finetune_models(
        X_tr, y_l_tr, y_s_tr, X_va, y_l_va, y_s_va,
        base_artifacts_dir=args.base_dir,
        out_artifacts_dir=args.out_dir,
        replay_npz=args.replay_npz,
    )
    print(json.dumps(card, indent=2))


if __name__ == "__main__":
    main()
