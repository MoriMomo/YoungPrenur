"""Schedule analyses (CPM + XGBoost + Monte Carlo): the plant baseline plus one workspace per user.

Every signed-in user starts on the plant baseline schedule. Uploading a schedule gives that user
their own analysis; nobody else's view changes. Read it with `get_analysis(user_id)` and replace it
with `set_analysis(user_id, analysis)`.
"""

import os
import threading
from datetime import datetime, timezone
from typing import Any, Dict, Optional

import database
from app.config import DEFAULT_PROJECT_NAME, DEFAULT_SCHEDULE_FILENAME, DEFAULT_SCHEDULE_PATH
from ml.predictor import analyze_schedule, watch_threshold
from schedule_parser import compute_cpm, parse_schedule_file


def _analyze_default_schedule_file() -> Dict[str, Any]:
    if not os.path.exists(DEFAULT_SCHEDULE_PATH):
        raise RuntimeError(f"Baseline schedule file not found: {DEFAULT_SCHEDULE_PATH}")
    with open(DEFAULT_SCHEDULE_PATH, "rb") as f:
        content = f.read()
    tasks = parse_schedule_file(content, DEFAULT_SCHEDULE_FILENAME)
    return {
        "source": "file",
        "filename": DEFAULT_SCHEDULE_FILENAME,
        **analyze_schedule(tasks, DEFAULT_PROJECT_NAME),
    }


def _load_baseline_analysis() -> Dict[str, Any]:
    database.init_db()
    saved = database.load_active_analysis()
    if saved and saved.get("source") != "upload" and isinstance(saved.get("tasks"), list) and saved["tasks"]:
        return saved
    analysis = _analyze_default_schedule_file()
    database.save_active_analysis(analysis)
    return analysis


# The plant baseline every user sees until they upload their own schedule.
BASELINE_ANALYSIS: Dict[str, Any] = _load_baseline_analysis()

# user id -> that user's own analysis, or None when they are on the baseline (cache of user_schedules).
_USER_ANALYSES: Dict[str, Optional[Dict[str, Any]]] = {}
_LOCK = threading.Lock()


def get_analysis(user_id: Optional[str] = None) -> Dict[str, Any]:
    """The schedule analysis this user is working on (the baseline if they have not uploaded one)."""
    if not user_id:
        return BASELINE_ANALYSIS
    with _LOCK:
        if user_id in _USER_ANALYSES:
            own = _USER_ANALYSES[user_id]
            return own if own is not None else BASELINE_ANALYSIS
    saved = database.load_user_analysis(user_id)
    own = saved if saved and isinstance(saved.get("tasks"), list) and saved["tasks"] else None
    with _LOCK:
        _USER_ANALYSES[user_id] = own
    return own if own is not None else BASELINE_ANALYSIS


def set_analysis(user_id: str, analysis: Dict[str, Any]) -> None:
    """Make `analysis` this user's own schedule."""
    with _LOCK:
        _USER_ANALYSES[user_id] = analysis
    database.save_user_analysis(user_id, analysis)


def reset_analysis(user_id: str) -> None:
    """Put this user back on the plant baseline schedule."""
    with _LOCK:
        _USER_ANALYSES[user_id] = None
    database.delete_user_analysis(user_id)


def _re_score(analysis: Dict[str, Any]) -> Dict[str, Any]:
    """Re-run CPM + the current XGBoost/Monte Carlo models on an analysis's task list."""
    tasks_in = []
    for t in analysis.get("tasks", []):
        tasks_in.append({
            "code": t["code"],
            "task": t["task"],
            "planned_days": float(t["planned_days"]),
            "actual_days": float(t["actual_days"]),
            "predecessors": list(t.get("predecessors", [])),
            "pred_links": list(t["pred_links"]) if t.get("pred_links") else None,
            "has_dependency_column": True,
            "work_center": t.get("work_center", ""),
            "resource_utilization": t.get("resource_utilization"),
            "owner": t.get("owner", ""),
            "status_declared": t.get("status", ""),
        })
    if not tasks_in:
        return analysis
    return {
        "source": analysis.get("source", "file"),
        "filename": analysis.get("filename", DEFAULT_SCHEDULE_FILENAME),
        "extraction_method": analysis.get("extraction_method"),
        "document_summary": analysis.get("document_summary"),
        "document_excerpt": analysis.get("document_excerpt"),
        **analyze_schedule(compute_cpm(tasks_in), analysis.get("project_name", DEFAULT_PROJECT_NAME)),
    }


def re_score_all() -> None:
    """After retraining: re-score the baseline and every user schedule currently in memory."""
    global BASELINE_ANALYSIS
    BASELINE_ANALYSIS = _re_score(BASELINE_ANALYSIS)
    database.save_active_analysis(BASELINE_ANALYSIS)
    with _LOCK:
        owned = [(uid, a) for uid, a in _USER_ANALYSES.items() if a is not None]
    for uid, analysis in owned:
        set_analysis(uid, _re_score(analysis))


def risk_headline(analysis: Dict[str, Any]) -> str:
    return f"{analysis['overall_delay_probability']:.1f}% (+{analysis['estimated_project_slippage_days']:.1f}d)"


def uploaded_project_row(analysis: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """An IRoom progress row describing the user's uploaded schedule (None for the baseline)."""
    if analysis.get("source") != "upload":
        return None
    tasks = analysis.get("tasks", [])
    completed_count = sum(
        1 for t in tasks if any(w in str(t.get("status", "")).lower() for w in ("complet", "done", "finish"))
    )
    pct = round((completed_count / max(1, len(tasks))) * 100) if tasks else 0
    if pct == 0 and tasks:
        on_track = sum(1 for t in tasks if float(t.get("delay_risk", 0)) < watch_threshold())
        pct = round((on_track / len(tasks)) * 100)
    slip = float(analysis.get("estimated_project_slippage_days", 0.0))
    prob = float(analysis.get("overall_delay_probability", 0.0))
    high_tasks = [t for t in tasks if float(t.get("delay_risk", 0)) >= 0.5]
    lead_milestone = high_tasks[0]["task"] if high_tasks else (tasks[0]["task"] if tasks else "Active WBS")
    status_label = "Critical Risk" if prob >= 55.0 else ("Delayed" if slip > 0.5 else "On Schedule")
    return {
        "id": "prj-active",
        "projectCode": "PRJ-UPLOADED",
        "name": analysis.get("project_name", DEFAULT_PROJECT_NAME),
        "customer": "Uploaded Master Schedule",
        "currentMilestone": lead_milestone,
        "progressPercent": max(15, min(95, pct or 50)),
        "targetCompletion": datetime.now(timezone.utc).strftime("%d %b %Y"),
        "delayVarianceDays": round(slip, 1),
        "status": status_label,
    }
