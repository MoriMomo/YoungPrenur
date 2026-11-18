"""
Live inference for the delay-risk models.

- Per-task late probability (XGBClassifier) and expected slip days (XGBRegressor).
- Per-task root-cause drivers from XGBoost's built-in SHAP contributions (pred_contribs).
- Project-level risk via Monte Carlo simulation of slips propagated through the CPM network.
"""

import json
import os
from functools import lru_cache
from typing import Any, Dict, List

import numpy as np
import xgboost as xgb

from ml.features import FEATURE_NAMES, feature_label, feature_matrix

ART_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "artifacts")
N_SIMULATIONS = 2000
# Committed due date = CPM baseline + project buffer (Critical Chain convention).
DEFAULT_PROJECT_BUFFER_RATIO = 0.15


@lru_cache(maxsize=1)
def _models():
    clf = xgb.Booster()
    clf.load_model(os.path.join(ART_DIR, "delay_risk_classifier.json"))
    reg = xgb.Booster()
    reg.load_model(os.path.join(ART_DIR, "delay_slip_regressor.json"))
    with open(os.path.join(ART_DIR, "model_card.json"), encoding="utf-8") as f:
        card = json.load(f)
    return clf, reg, card


def model_card() -> Dict[str, Any]:
    return _models()[2]


def models_available() -> bool:
    try:
        _models()
        return True
    except Exception:
        return False


COMPLETED_WORDS = ("completed", "complete", "done", "closed", "finished", "selesai")


def is_completed(t: Dict[str, Any]) -> bool:
    status = str(t.get("status_declared") or t.get("status") or "").lower()
    return any(w in status for w in COMPLETED_WORDS)


def _risk_level(p: float) -> str:
    return "HIGH" if p >= 0.6 else ("MEDIUM" if p >= 0.35 else "LOW")


def score_tasks(tasks: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Adds delay_risk, risk_level, expected_slip_days and drivers to each CPM-processed task."""
    if not tasks:
        return tasks
    clf, reg, _ = _models()
    dm = xgb.DMatrix(np.array(feature_matrix(tasks), dtype=float), feature_names=FEATURE_NAMES)
    proba = clf.predict(dm)
    slip = np.maximum(0.0, reg.predict(dm))
    contribs = clf.predict(dm, pred_contribs=True)[:, :-1]  # drop bias column

    for i, t in enumerate(tasks):
        if is_completed(t):
            # Outcome already known: no remaining risk, actual duration is final.
            t.update(delay_risk=0.0, risk_level="LOW", drivers=[], completed=True,
                     expected_slip_days=round(max(0.0, t["actual_days"] - t["planned_days"]), 2))
            t["_contribs"] = np.zeros(len(FEATURE_NAMES))
            continue
        p = float(proba[i])
        positive = sorted(
            ((FEATURE_NAMES[j], float(c)) for j, c in enumerate(contribs[i]) if c > 0.05),
            key=lambda x: x[1], reverse=True)
        t["delay_risk"] = round(p, 3)
        t["risk_level"] = _risk_level(p)
        t["expected_slip_days"] = round(float(slip[i]), 2)
        t["completed"] = False
        t["drivers"] = [{"feature": f, "label": feature_label(f), "contribution": round(c, 3)} for f, c in positive[:3]]
        t["_contribs"] = contribs[i]
    return tasks


def _derive_status(t: Dict[str, Any]) -> str:
    declared = t.get("status_declared") or t.get("status")
    if declared:
        return declared
    if t["variance_days"] > 0:
        return f"Delayed (+{int(t['variance_days'])}d)"
    if t["delay_risk"] >= 0.6:
        return "At Risk"
    return "On Track" if t["start_day"] == 0 else "Scheduled"


def simulate_project(tasks: List[Dict[str, Any]], buffer_days: float = None, seed: int = 7) -> Dict[str, float]:
    """
    Monte Carlo: sample each task's slip, re-run the CPM forward pass, measure project finish slip.
    delay_probability = P(finish later than the committed due date = baseline + project buffer).
    """
    rng = np.random.default_rng(seed)
    order = sorted(range(len(tasks)), key=lambda i: tasks[i]["start_day"])
    index = {t["code"]: i for i, t in enumerate(tasks)}
    planned = np.array([t["planned_days"] for t in tasks], dtype=float)
    p = np.array([t["delay_risk"] for t in tasks])
    exp_slip = np.array([t["expected_slip_days"] for t in tasks])
    # Slip size given that the task is late: conditional mean ~ E[slip] / P(late).
    cond_mean = np.clip(exp_slip / np.maximum(p, 0.05), 0.5, 15.0)

    late = rng.random((N_SIMULATIONS, len(tasks))) < p
    size = rng.gamma(2.0, cond_mean / 2.0, size=(N_SIMULATIONS, len(tasks)))
    durations = planned + late * size
    for i, t in enumerate(tasks):
        if t.get("completed"):
            durations[:, i] = t["actual_days"]

    def finish(dur: np.ndarray) -> np.ndarray:
        ef = np.zeros_like(dur)
        for i in order:
            preds = [index[c] for c in tasks[i].get("predecessors", []) if c in index]
            es = ef[:, preds].max(axis=1) if preds else 0.0
            ef[:, i] = es + dur[:, i]
        return ef.max(axis=1)

    baseline_end = float(finish(planned[None, :])[0])
    project_slip = finish(durations) - baseline_end
    if buffer_days is None:
        buffer_days = round(baseline_end * DEFAULT_PROJECT_BUFFER_RATIO, 1)
    return {
        "baseline_duration_days": round(baseline_end, 1),
        "project_buffer_days": float(buffer_days),
        "delay_probability": round(float((project_slip > buffer_days).mean()), 4),
        "any_slip_probability": round(float((project_slip > 0.5).mean()), 4),
        "expected_slip_days": round(float(project_slip.mean()), 2),
        "p50_slip_days": round(float(np.percentile(project_slip, 50)), 2),
        "p80_slip_days": round(float(np.percentile(project_slip, 80)), 2),
        "simulations": N_SIMULATIONS,
    }


def project_risk_drivers(tasks: List[Dict[str, Any]], total_slip: float, top_n: int = 4) -> List[Dict[str, Any]]:
    """Aggregate positive SHAP contributions across tasks (weighted by risk) into project drivers."""
    totals: Dict[str, float] = {}
    for t in tasks:
        for j, c in enumerate(t["_contribs"]):
            if c > 0:
                label = feature_label(FEATURE_NAMES[j])
                totals[label] = totals.get(label, 0.0) + float(c) * t["delay_risk"]
    s = sum(totals.values()) or 1.0
    ranked = sorted(totals.items(), key=lambda kv: kv[1], reverse=True)[:top_n]
    drivers = []
    for label, v in ranked:
        share = v / s
        days = share * total_slip
        drivers.append({
            "factor": label,
            "weight": f"{share:.0%}",
            "impact": f"{'High' if share >= 0.2 else 'Medium'} (+{days:.1f}d)",
        })
    return drivers


def analyze_schedule(tasks: List[Dict[str, Any]], project_name: str, buffer_days: float = None) -> Dict[str, Any]:
    """Score CPM-processed tasks and build the /risks/prediction payload."""
    score_tasks(tasks)
    sim = simulate_project(tasks, buffer_days)
    drivers = project_risk_drivers(tasks, sim["expected_slip_days"])
    card = model_card()
    out_tasks = []
    for t in tasks:
        out_tasks.append({
            "code": t["code"],
            "task": t["task"],
            "start_day": t["start_day"],
            "planned_days": int(round(t["planned_days"])),
            "actual_days": int(round(t["actual_days"])),
            "float_days": t["float_days"],
            "critical": t["critical"],
            "delay_risk": t["delay_risk"],
            "risk_level": t["risk_level"],
            "expected_slip_days": t["expected_slip_days"],
            "status": _derive_status(t),
            "variance_days": max(0, int(round(t["variance_days"]))),
            "upstream_slip_days": t["upstream_slip_days"],
            "predecessors": t.get("predecessors", []),
            "work_center": t.get("work_center", ""),
            "owner": t.get("owner", ""),
            "drivers": t["drivers"],
        })
    return {
        "project_name": project_name,
        "overall_delay_probability": round(sim["delay_probability"] * 100, 1),
        "critical_path_tasks_count": sum(1 for t in tasks if t["critical"]),
        "high_risk_tasks_count": sum(1 for t in tasks if t["delay_risk"] >= 0.6),
        "estimated_project_slippage_days": sim["p50_slip_days"],
        "p80_slippage_days": sim["p80_slip_days"],
        "baseline_duration_days": sim["baseline_duration_days"],
        "project_buffer_days": sim["project_buffer_days"],
        "any_slip_probability": round(sim["any_slip_probability"] * 100, 1),
        "simulations": sim["simulations"],
        "risk_drivers": drivers,
        "tasks": out_tasks,
        "methodology": (
            f"CPM + XGBoost delay-risk model (test ROC-AUC {card['test_metrics']['roc_auc']:.2f}) "
            f"+ Monte Carlo ({sim['simulations']:,} runs vs. {sim['project_buffer_days']:.1f}d project buffer)"
        ),
        "model": {
            "name": card["model"],
            "trained_at": card["trained_at"],
            "training_data": card["training_data"],
            "test_metrics": card["test_metrics"],
        },
    }
