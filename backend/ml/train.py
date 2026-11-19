"""
Train the MDIP delay-risk models on the synthetic WBS dataset.

- XGBClassifier: probability that an activity finishes late beyond its float.
- XGBRegressor:  expected slip in days at completion.

Train/test split is grouped by project so no project leaks across sets.
Writes model files and a model card with held-out metrics to ml/artifacts/.

Usage:  python -m ml.train  (from backend/)
"""

import json
import os
import sys
from datetime import datetime, timezone
from typing import Any, Dict, Optional, Tuple

import numpy as np
import pandas as pd
from sklearn.metrics import (accuracy_score, brier_score_loss, f1_score, mean_absolute_error,
                             precision_score, recall_score, roc_auc_score)
from sklearn.model_selection import GroupShuffleSplit
from xgboost import XGBClassifier, XGBRegressor

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from ml.features import FEATURE_NAMES, feature_label, task_features  # noqa: E402
from ml.predictor import is_completed  # noqa: E402
from schedule_parser import ScheduleParseError, parse_schedule_file  # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))
DATA_PATH = os.path.join(HERE, "data", "synthetic_wbs_tasks.csv")
HIST_PATH = os.path.join(HERE, "data", "historical_wbs_tasks.csv")
ART_DIR = os.path.join(HERE, "artifacts")
SEED = 42
HISTORICAL_SAMPLE_WEIGHT = 5.0


def legacy_rule_score(df: pd.DataFrame) -> np.ndarray:
    """The previous hand-written heuristic, kept as a baseline."""
    s = 0.15 + np.minimum(0.45, df["upstream_slip_days"] * 0.1) + 0.25 * df["external_dependency"]
    s += 0.10 * (df["planned_days"] > 14)
    return np.minimum(s, 0.98).to_numpy()


def ingest_historical_schedule(
    content: bytes,
    filename: str,
    project_id: Optional[str] = None,
) -> pd.DataFrame:
    """
    Parse a completed CSV/XLSX schedule, extract features/labels, and persist to historical_wbs_tasks.csv.

    Leakage guard: features describe what was known when each task *started* (its plan, float,
    work center, and the slip already realized by its predecessors). The task's own final
    duration is used only for the label, so `forecast_variance_days` is zero here.
    Tasks whose Status says they are not finished are skipped: their "actual" is a forecast,
    not an outcome. A file without a Status column is treated as fully completed.
    """
    tasks = parse_schedule_file(content, filename)
    stem = os.path.splitext(os.path.basename(filename))[0].strip() or "schedule"
    pid = project_id or f"hist_{stem}"

    finished = [t for t in tasks if not t.get("status_declared") or is_completed(t)]
    if not finished:
        raise ScheduleParseError(
            "No completed tasks found. Historical training data needs finished activities "
            "(Status = Completed/Done/Selesai, or no Status column)."
        )

    rows = []
    for t in finished:
        f = task_features({**t, "actual_days": t["planned_days"]})  # pre-start snapshot
        realized_slip = round(max(0.0, float(t["actual_days"]) - float(t["planned_days"])), 2)
        row: Dict[str, Any] = {name: f[name] for name in FEATURE_NAMES}
        row.update({
            "project_id": pid,
            "code": t["code"],
            "task": t["task"],
            "category": t.get("category", "other"),
            "realized_slip_days": realized_slip,
            "late": int(realized_slip > f["float_days"] + 0.5),
        })
        rows.append(row)

    new_df = pd.DataFrame(rows)
    os.makedirs(os.path.dirname(HIST_PATH), exist_ok=True)
    if os.path.exists(HIST_PATH) and os.path.getsize(HIST_PATH) > 0:
        existing = pd.read_csv(HIST_PATH)
        combined = pd.concat([existing, new_df], ignore_index=True)
        combined["project_id"] = combined["project_id"].astype(str)
        combined = combined.drop_duplicates(subset=["project_id", "code"], keep="last")
    else:
        combined = new_df
    combined.to_csv(HIST_PATH, index=False)
    return new_df


MODEL_PARAMS: Dict[str, Any] = dict(
    n_estimators=300,
    max_depth=4,
    learning_rate=0.05,
    subsample=0.9,
    colsample_bytree=0.9,
    random_state=SEED,
    n_jobs=2,
)


def _fit_pair(df_train: pd.DataFrame) -> Tuple[XGBClassifier, XGBRegressor]:
    """Fit late classifier on all training rows and conditional slip regressor on late==1 rows."""
    X_tr = df_train[FEATURE_NAMES].to_numpy(dtype=float)
    y_tr = df_train["late"].to_numpy()
    slip_tr = df_train["realized_slip_days"].to_numpy(dtype=float)
    w_tr = df_train["sample_weight"].to_numpy(dtype=float)

    clf = XGBClassifier(**MODEL_PARAMS, eval_metric="logloss")
    clf.fit(X_tr, y_tr, sample_weight=w_tr)

    late_mask = y_tr == 1
    reg = XGBRegressor(**MODEL_PARAMS, objective="reg:squarederror")
    if int(late_mask.sum()) >= 5:
        reg.fit(X_tr[late_mask], slip_tr[late_mask], sample_weight=w_tr[late_mask])
    else:
        reg.fit(X_tr, slip_tr, sample_weight=w_tr)
    return clf, reg


def _eval_pair(clf: XGBClassifier, reg: XGBRegressor, df_eval: pd.DataFrame) -> Dict[str, Any]:
    """Evaluate classifier discrimination, hurdle E[slip], and conditional E[slip | late]."""
    X_ev = df_eval[FEATURE_NAMES].to_numpy(dtype=float)
    y_ev = df_eval["late"].to_numpy()
    slip_ev = df_eval["realized_slip_days"].to_numpy(dtype=float)

    proba = clf.predict_proba(X_ev)[:, 1]
    pred = (proba >= 0.5).astype(int)
    cond_pred = np.clip(reg.predict(X_ev), 0.5, 20.0)
    expected_slip_pred = proba * cond_pred
    baseline = legacy_rule_score(df_eval)

    has_both_classes = len(np.unique(y_ev)) >= 2
    late_eval = y_ev == 1

    return {
        "roc_auc": round(float(roc_auc_score(y_ev, proba)), 4) if has_both_classes else None,
        "f1": round(float(f1_score(y_ev, pred, zero_division=0)), 4),
        "precision": round(float(precision_score(y_ev, pred, zero_division=0)), 4),
        "recall": round(float(recall_score(y_ev, pred, zero_division=0)), 4),
        "accuracy": round(float(accuracy_score(y_ev, pred)), 4),
        "brier": round(float(brier_score_loss(y_ev, proba)), 4),
        "baseline_rule_roc_auc": round(float(roc_auc_score(y_ev, baseline)), 4) if has_both_classes else None,
        "slip_mae_days": round(float(mean_absolute_error(slip_ev, expected_slip_pred)), 3),
        "conditional_slip_mae_days": (
            round(float(mean_absolute_error(slip_ev[late_eval], cond_pred[late_eval])), 3)
            if int(late_eval.sum()) > 0
            else None
        ),
    }


def _real_source_name(pid: str) -> str:
    raw = pid[5:] if pid.startswith("real_") else pid
    prefix = raw.split("_", 1)[0].lower()
    return prefix if prefix in {"dslib", "cnc"} else "other"


def _split_real_projects(df_hist: pd.DataFrame) -> Tuple[pd.DataFrame, pd.DataFrame]:
    """Stratified project-level 80/20 split across real data sources."""
    df_tagged = df_hist.copy()
    df_tagged["_source"] = df_tagged["project_id"].astype(str).map(_real_source_name)
    tr_parts, te_parts = [], []
    for _, grp in df_tagged.groupby("_source", sort=True):
        if grp["project_id"].nunique() >= 2:
            splitter = GroupShuffleSplit(n_splits=1, test_size=0.2, random_state=SEED)
            tr_i, te_i = next(splitter.split(grp[FEATURE_NAMES], grp["late"], groups=grp["project_id"]))
            tr_parts.append(grp.iloc[tr_i])
            te_parts.append(grp.iloc[te_i])
        else:
            tr_parts.append(grp)
    df_tr = pd.concat(tr_parts, ignore_index=True) if tr_parts else df_tagged.iloc[0:0]
    df_te = pd.concat(te_parts, ignore_index=True) if te_parts else df_tagged.iloc[0:0]
    return df_tr, df_te


def train_models() -> Dict[str, Any]:
    """Train hurdle classifier + conditional slip regressor with separate synthetic and real metrics."""
    rng = np.random.default_rng(SEED)
    df_syn = pd.read_csv(DATA_PATH)
    df_syn["project_id"] = "syn_" + df_syn["project_id"].astype(str)
    df_syn["sample_weight"] = 1.0
    n_syn_tasks = len(df_syn)
    n_syn_projects = int(df_syn["project_id"].nunique())

    syn_split = GroupShuffleSplit(n_splits=1, test_size=0.2, random_state=SEED)
    syn_tr_pos, syn_te_pos = next(syn_split.split(df_syn[FEATURE_NAMES], df_syn["late"], groups=df_syn["project_id"]))
    df_syn_train = df_syn.iloc[syn_tr_pos].copy()
    prestart_mask = rng.random(len(df_syn_train)) < 0.5
    df_syn_train.loc[prestart_mask, "forecast_variance_days"] = 0.0
    df_syn_test = df_syn.iloc[syn_te_pos]

    df_hist = pd.DataFrame()
    if os.path.exists(HIST_PATH) and os.path.getsize(HIST_PATH) > 0:
        loaded = pd.read_csv(HIST_PATH)
        if len(loaded) > 0:
            loaded["project_id"] = "real_" + loaded["project_id"].astype(str)
            loaded["sample_weight"] = HISTORICAL_SAMPLE_WEIGHT
            df_hist = loaded

    n_real_tasks = len(df_hist)
    n_real_projects = int(df_hist["project_id"].nunique()) if n_real_tasks > 0 else 0
    real_validation_metrics: Optional[Dict[str, Any]] = None

    if n_real_projects == 0:
        clf, reg = _fit_pair(df_syn_train)
        synthetic_metrics = _eval_pair(clf, reg, df_syn_test)
        metrics = synthetic_metrics
        df_all = df_syn
        n_train, n_test = len(df_syn_train), len(df_syn_test)
    elif n_real_projects == 1:
        pre_clf, pre_reg = _fit_pair(df_syn_train)
        real_validation_metrics = {
            "evaluation_mode": "out_of_sample_single_project",
            "n_tasks": n_real_tasks,
            "n_projects": 1,
            **_eval_pair(pre_clf, pre_reg, df_hist),
        }
        df_train_all = pd.concat([df_syn_train, df_hist], ignore_index=True)
        clf, reg = _fit_pair(df_train_all)
        synthetic_metrics = _eval_pair(clf, reg, df_syn_test)
        metrics = synthetic_metrics
        df_all = pd.concat([df_syn, df_hist], ignore_index=True)
        n_train, n_test = len(df_train_all), len(df_syn_test)
    else:
        df_real_train, df_real_test = _split_real_projects(df_hist)

        df_train_all = pd.concat([df_syn_train, df_real_train.drop(columns=["_source"], errors="ignore")], ignore_index=True)
        df_test_all = pd.concat([df_syn_test, df_real_test.drop(columns=["_source"], errors="ignore")], ignore_index=True)
        clf, reg = _fit_pair(df_train_all)
        synthetic_metrics = _eval_pair(clf, reg, df_syn_test)
        by_source: Dict[str, Any] = {}
        for src, sub in df_real_test.groupby("_source", sort=True):
            by_source[str(src)] = {
                "n_tasks": len(sub),
                "n_projects": int(sub["project_id"].nunique()),
                **_eval_pair(clf, reg, sub),
            }
        real_validation_metrics = {
            "evaluation_mode": "held_out_real_projects",
            "n_tasks": len(df_real_test),
            "n_projects": int(df_real_test["project_id"].nunique()),
            **_eval_pair(clf, reg, df_real_test),
            "by_source": by_source,
        }
        metrics = _eval_pair(clf, reg, df_test_all)
        df_all = pd.concat([df_syn, df_hist], ignore_index=True)
        n_train, n_test = len(df_train_all), len(df_test_all)

    gain = clf.get_booster().get_score(importance_type="gain")
    total = sum(gain.values()) or 1.0
    importance = sorted(
        ({"feature": FEATURE_NAMES[int(k[1:])] if k.startswith("f") and k[1:].isdigit() else k,
          "importance": round(v / total, 4)} for k, v in gain.items()),
        key=lambda d: d["importance"], reverse=True)
    for item in importance:
        item["label"] = feature_label(item["feature"])

    os.makedirs(ART_DIR, exist_ok=True)
    clf.save_model(os.path.join(ART_DIR, "delay_risk_classifier.json"))
    reg.save_model(os.path.join(ART_DIR, "delay_slip_regressor.json"))

    if n_real_tasks > 0:
        data_desc = (
            f"{n_real_tasks} historical planned-vs-actual tasks ({n_real_projects} real projects, "
            f"{HISTORICAL_SAMPLE_WEIGHT:.0f}x weight) + {n_syn_tasks} synthetic tasks ({n_syn_projects} projects)"
        )
    else:
        data_desc = (
            "Synthetic project-manufacturing schedules (ml/generate_dataset.py); "
            "ingest historical planned-vs-actual schedules via POST /api/v1/ml/retrain"
        )

    card = {
        "model": "XGBoost hurdle model (late classifier + conditional slip regressor on late==1)",
        "target": "Activity finishes later than its CPM total float (+0.5d tolerance)",
        "trained_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "training_data": data_desc,
        "n_tasks": len(df_all),
        "n_real_tasks": n_real_tasks,
        "n_synthetic_tasks": n_syn_tasks,
        "n_projects": int(df_all["project_id"].nunique()),
        "n_train": n_train,
        "n_test": n_test,
        "late_rate": round(float(df_all["late"].mean()), 4),
        "features": FEATURE_NAMES,
        "hyperparameters": MODEL_PARAMS,
        "test_metrics": metrics,
        "synthetic_test_metrics": synthetic_metrics,
        "real_validation_metrics": real_validation_metrics,
        "feature_importance": importance,
    }
    with open(os.path.join(ART_DIR, "model_card.json"), "w", encoding="utf-8") as f:
        json.dump(card, f, indent=2)

    return card


def main():
    card = train_models()
    print(json.dumps(card["test_metrics"], indent=2))
    print("Top drivers:", ", ".join(f"{i['label']} {i['importance']:.0%}" for i in card["feature_importance"][:5]))


if __name__ == "__main__":
    main()
