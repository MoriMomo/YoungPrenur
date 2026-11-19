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
from typing import Any, Dict, Optional

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
    pid = str(project_id or f"hist_{stem}")

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


def train_models() -> Dict[str, Any]:
    """Train classifier + slip regressor (combining synthetic baseline with weighted real history)."""
    df_syn = pd.read_csv(DATA_PATH)
    df_syn["project_id"] = "syn_" + df_syn["project_id"].astype(str)
    df_syn["sample_weight"] = 1.0
    n_syn_tasks = int(len(df_syn))
    n_syn_projects = int(df_syn["project_id"].nunique())

    n_real_tasks = 0
    n_real_projects = 0
    if os.path.exists(HIST_PATH) and os.path.getsize(HIST_PATH) > 0:
        df_hist = pd.read_csv(HIST_PATH)
        if len(df_hist) > 0:
            df_hist["project_id"] = df_hist["project_id"].astype(str)
            df_hist["sample_weight"] = HISTORICAL_SAMPLE_WEIGHT
            n_real_tasks = int(len(df_hist))
            n_real_projects = int(df_hist["project_id"].nunique())
            df = pd.concat([df_syn, df_hist], ignore_index=True)
        else:
            df = df_syn
    else:
        df = df_syn

    X = df[FEATURE_NAMES].to_numpy(dtype=float)
    y = df["late"].to_numpy()
    y_slip = df["realized_slip_days"].to_numpy()
    weights = df["sample_weight"].to_numpy(dtype=float)

    split = GroupShuffleSplit(n_splits=1, test_size=0.2, random_state=SEED)
    train_idx, test_idx = next(split.split(X, y, groups=df["project_id"]))

    params = dict(n_estimators=300, max_depth=4, learning_rate=0.05, subsample=0.9,
                  colsample_bytree=0.9, random_state=SEED, n_jobs=2)
    clf = XGBClassifier(**params, eval_metric="logloss")
    clf.fit(X[train_idx], y[train_idx], sample_weight=weights[train_idx])
    reg = XGBRegressor(**params, objective="reg:squarederror")
    reg.fit(X[train_idx], y_slip[train_idx], sample_weight=weights[train_idx])

    proba = clf.predict_proba(X[test_idx])[:, 1]
    pred = (proba >= 0.5).astype(int)
    baseline = legacy_rule_score(df.iloc[test_idx])
    slip_pred = np.maximum(0, reg.predict(X[test_idx]))

    metrics = {
        "roc_auc": round(float(roc_auc_score(y[test_idx], proba)), 4),
        "f1": round(float(f1_score(y[test_idx], pred)), 4),
        "precision": round(float(precision_score(y[test_idx], pred)), 4),
        "recall": round(float(recall_score(y[test_idx], pred)), 4),
        "accuracy": round(float(accuracy_score(y[test_idx], pred)), 4),
        "brier": round(float(brier_score_loss(y[test_idx], proba)), 4),
        "baseline_rule_roc_auc": round(float(roc_auc_score(y[test_idx], baseline)), 4),
        "slip_mae_days": round(float(mean_absolute_error(y_slip[test_idx], slip_pred)), 3),
    }

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
        "model": "XGBoost gradient-boosted trees (classifier + slip regressor)",
        "target": "Activity finishes later than its CPM total float (+0.5d tolerance)",
        "trained_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "training_data": data_desc,
        "n_tasks": int(len(df)),
        "n_real_tasks": n_real_tasks,
        "n_synthetic_tasks": n_syn_tasks,
        "n_projects": int(df["project_id"].nunique()),
        "n_train": int(len(train_idx)),
        "n_test": int(len(test_idx)),
        "late_rate": round(float(y.mean()), 4),
        "features": FEATURE_NAMES,
        "hyperparameters": params,
        "test_metrics": metrics,
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
