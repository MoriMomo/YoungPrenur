"""Active schedule analysis (CPM + XGBoost + Monte Carlo) shared by all routers.

Other modules must read and assign it as `state.ACTIVE_ANALYSIS` (never `from app.state import
ACTIVE_ANALYSIS`), so every router sees the schedule most recently uploaded.
"""

import os
from datetime import datetime, timezone
from typing import Any, Dict

import database
from app.config import DEFAULT_PROJECT_NAME, DEFAULT_SCHEDULE_FILENAME, DEFAULT_SCHEDULE_PATH
from ml.predictor import analyze_schedule
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


def _load_initial_analysis() -> Dict[str, Any]:
    database.init_db()
    saved = database.load_active_analysis()
    if saved and isinstance(saved.get("tasks"), list) and len(saved["tasks"]) > 0:
        return saved
    analysis = _analyze_default_schedule_file()
    database.save_active_analysis(analysis)
    return analysis


ACTIVE_ANALYSIS: Dict[str, Any] = _load_initial_analysis()


def _re_score_active_analysis() -> None:
    """Re-run CPM + freshly trained XGBoost/Monte Carlo on the active task list."""
    global ACTIVE_ANALYSIS
    tasks_in = []
    for t in ACTIVE_ANALYSIS.get("tasks", []):
        tasks_in.append({
            "code": t["code"],
            "task": t["task"],
            "planned_days": float(t["planned_days"]),
            "actual_days": float(t["actual_days"]),
            "predecessors": list(t.get("predecessors", [])),
            "has_dependency_column": True,
            "work_center": t.get("work_center", ""),
            "owner": t.get("owner", ""),
            "status_declared": t.get("status", ""),
        })
    if not tasks_in:
        return
    updated = {
        "source": ACTIVE_ANALYSIS.get("source", "file"),
        "filename": ACTIVE_ANALYSIS.get("filename", DEFAULT_SCHEDULE_FILENAME),
        **analyze_schedule(compute_cpm(tasks_in), ACTIVE_ANALYSIS.get("project_name", DEFAULT_PROJECT_NAME)),
    }
    ACTIVE_ANALYSIS = updated
    database.save_active_analysis(updated)


def _risk_headline() -> str:
    a = ACTIVE_ANALYSIS
    return f"{a['overall_delay_probability']:.1f}% (+{a['estimated_project_slippage_days']:.1f}d)"


def _sync_active_project_progress(analysis: Dict[str, Any]) -> None:
    """Reflect active schedule analysis metrics into the IRoom progress table."""
    tasks = analysis.get("tasks", [])
    completed_count = sum(
        1 for t in tasks if any(w in str(t.get("status", "")).lower() for w in ("complet", "done", "finish"))
    )
    pct = round((completed_count / max(1, len(tasks))) * 100) if tasks else 0
    if pct == 0 and tasks:
        on_track = sum(1 for t in tasks if float(t.get("delay_risk", 0)) < 0.35)
        pct = round((on_track / len(tasks)) * 100)
    slip = float(analysis.get("estimated_project_slippage_days", 0.0))
    prob = float(analysis.get("overall_delay_probability", 0.0))
    high_tasks = [t for t in tasks if float(t.get("delay_risk", 0)) >= 0.5]
    lead_milestone = high_tasks[0]["task"] if high_tasks else (tasks[0]["task"] if tasks else "Active WBS")
    status_label = "Critical Risk" if prob >= 55.0 else ("Delayed" if slip > 0.5 else "On Schedule")

    if analysis.get("source") == "upload":
        database.upsert_stream_records(
            "progress",
            [
                {
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
            ],
        )
