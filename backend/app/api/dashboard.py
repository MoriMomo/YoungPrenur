"""Dashboard overview, export, production lines and performance analytics.
"""

import time
from typing import Any, Dict

from fastapi import APIRouter, Depends, Query

from app import state
from app.config import DEFAULT_PROJECT_NAME, DEFAULT_SCHEDULE_FILENAME
from app.services.insights import _compute_overview_kpis, _compute_performance_series, _compute_production_lines, compute_live_decisions
from app.security import require_user
from app.state import risk_headline

router = APIRouter()


@router.get("/api/v1/analytics/performance")
def get_performance_metric(
    metric: str = Query("output", enum=["output", "oee", "downtime"]),
    user: Dict[str, Any] = Depends(require_user),
):
    return _compute_performance_series(metric, state.get_analysis(user["id"]))


@router.get("/api/v1/dashboard/lines")
def get_production_lines(user: Dict[str, Any] = Depends(require_user)):
    return _compute_production_lines(state.get_analysis(user["id"]))


@router.get("/api/v1/dashboard/overview")
def get_overview(role: str = "Operations Manager", user: Dict[str, Any] = Depends(require_user)):
    analysis = state.get_analysis(user["id"])
    computed = _compute_overview_kpis(analysis, user["id"])
    live_decisions = compute_live_decisions(analysis, user["id"])
    return {
        "success": True,
        "active_role": role,
        "header": {
            "title": f"Operations Cockpit ({role})",
            "sub": f"Live telemetry & XGBoost schedule intelligence ({analysis.get('filename', DEFAULT_SCHEDULE_FILENAME)})",
        },
        "kpis": computed["kpis"],
        "decision_actions": live_decisions,
        "metrics": {
            "schedule_attainment": computed["attainment"],
            "quality_yield": computed["quality_yield"],
            "avg_oee": computed["avg_oee"],
            "overall_delay_probability": analysis["overall_delay_probability"],
            "estimated_project_slippage_days": analysis["estimated_project_slippage_days"],
            "open_decisions": computed["pending_decisions"],
        },
        "source": "fastapi_sqlite_live",
    }


@router.get("/api/v1/dashboard/export")
def export_summary(role: str = "Operations Manager", user: Dict[str, Any] = Depends(require_user)):
    analysis = state.get_analysis(user["id"])
    computed = _compute_overview_kpis(analysis, user["id"])
    return {
        "role": role,
        "project": analysis.get("project_name", DEFAULT_PROJECT_NAME),
        "filename": analysis.get("filename", DEFAULT_SCHEDULE_FILENAME),
        "export_date": time.strftime("%Y-%m-%d %H:%M:%S"),
        "platform": "MDIP AI Manufacturing Copilot (SQLite + XGBoost Live)",
        "summary": (
            f"Schedule Attainment: {computed['attainment']:.1f}% | "
            f"Delay Risk: {risk_headline(analysis)} | "
            f"Quality Yield: {computed['quality_yield']:.1f}% | "
            f"Open HITL: {computed['pending_decisions']}"
        ),
    }
