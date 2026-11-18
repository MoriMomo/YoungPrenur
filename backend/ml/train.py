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

import numpy as np
import pandas as pd
from sklearn.metrics import (accuracy_score, brier_score_loss, f1_score, mean_absolute_error,
                             precision_score, recall_score, roc_auc_score)
from sklearn.model_selection import GroupShuffleSplit
from xgboost import XGBClassifier, XGBRegressor

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from ml.features import FEATURE_NAMES, feature_label  # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))
DATA_PATH = os.path.join(HERE, "data", "synthetic_wbs_tasks.csv")
ART_DIR = os.path.join(HERE, "artifacts")
SEED = 42


def legacy_rule_score(df: pd.DataFrame) -> np.ndarray:
    """The previous hand-written heuristic, kept as a baseline."""
    s = 0.15 + np.minimum(0.45, df["upstream_slip_days"] * 0.1) + 0.25 * df["external_dependency"]
    s += 0.10 * (df["planned_days"] > 14)
    return np.minimum(s, 0.98).to_numpy()


def main():
    df = pd.read_csv(DATA_PATH)
    X = df[FEATURE_NAMES].to_numpy(dtype=float)
    y = df["late"].to_numpy()
    y_slip = df["realized_slip_days"].to_numpy()

    split = GroupShuffleSplit(n_splits=1, test_size=0.2, random_state=SEED)
    train_idx, test_idx = next(split.split(X, y, groups=df["project_id"]))

    params = dict(n_estimators=300, max_depth=4, learning_rate=0.05, subsample=0.9,
                  colsample_bytree=0.9, random_state=SEED, n_jobs=2)
    clf = XGBClassifier(**params, eval_metric="logloss")
    clf.fit(X[train_idx], y[train_idx])
    reg = XGBRegressor(**params, objective="reg:squarederror")
    reg.fit(X[train_idx], y_slip[train_idx])

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

    card = {
        "model": "XGBoost gradient-boosted trees (classifier + slip regressor)",
        "target": "Activity finishes later than its CPM total float (+0.5d tolerance)",
        "trained_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "training_data": "Synthetic project-manufacturing schedules (ml/generate_dataset.py); "
                         "to be replaced with partner historical planned-vs-actual data",
        "n_tasks": int(len(df)),
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

    print(json.dumps(metrics, indent=2))
    print("Top drivers:", ", ".join(f"{i['label']} {i['importance']:.0%}" for i in importance[:5]))


if __name__ == "__main__":
    main()
