"""Dashboard overview, export, production lines and performance analytics.
"""

import time

from fastapi import APIRouter, Query

from app import state
from app.config import DEFAULT_PROJECT_NAME, DEFAULT_SCHEDULE_FILENAME
from app.services.insights import _compute_overview_kpis, _compute_performance_series, _compute_production_lines, compute_live_decisions
from app.state import _risk_headline

router = APIRouter()


@router.get("/api/v1/analytics/performance")
def get_performance_metric(metric: str = Query("output", enum=["output", "oee", "downtime"])):
    return _compute_performance_series(metric)


@router.get("/api/v1/dashboard/lines")
def get_production_lines():
    return _compute_production_lines()


@router.get("/api/v1/dashboard/overview")
def get_overview(role: str = "Operations Manager"):
    computed = _compute_overview_kpis()
    live_decisions = compute_live_decisions()
    return {
        "success": True,
        "active_role": role,
        "header": {
            "title": f"Operations Cockpit ({role})",
            "sub": f"Live telemetry & XGBoost schedule intelligence ({state.ACTIVE_ANALYSIS.get('filename', DEFAULT_SCHEDULE_FILENAME)})",
        },
        "kpis": computed["kpis"],
        "decision_actions": live_decisions,
        "metrics": {
            "schedule_attainment": computed["attainment"],
            "quality_yield": computed["quality_yield"],
            "avg_oee": computed["avg_oee"],
            "overall_delay_probability": state.ACTIVE_ANALYSIS["overall_delay_probability"],
            "estimated_project_slippage_days": state.ACTIVE_ANALYSIS["estimated_project_slippage_days"],
            "open_decisions": computed["pending_decisions"],
        },
        "source": "fastapi_sqlite_live",
    }


@router.get("/api/v1/dashboard/export")
def export_summary(role: str = "Operations Manager"):
    computed = _compute_overview_kpis()
    return {
        "role": role,
        "project": state.ACTIVE_ANALYSIS.get("project_name", DEFAULT_PROJECT_NAME),
        "filename": state.ACTIVE_ANALYSIS.get("filename", DEFAULT_SCHEDULE_FILENAME),
        "export_date": time.strftime("%Y-%m-%d %H:%M:%S"),
        "platform": "MDIP AI Manufacturing Copilot (SQLite + XGBoost Live)",
        "summary": (
            f"Schedule Attainment: {computed['attainment']:.1f}% | "
            f"Delay Risk: {_risk_headline()} | "
            f"Quality Yield: {computed['quality_yield']:.1f}% | "
            f"Open HITL: {computed['pending_decisions']}"
        ),
    }
