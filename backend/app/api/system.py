"""Health and database status endpoints.
"""

from fastapi import APIRouter

import database
from app import state

router = APIRouter()


@router.get("/health")
def health_check():
    status = database.db_status()
    return {
        "status": "ok",
        "engine": "MDIP PoC v1.2 (Supabase/SQLite + CPM + XGBoost Delay-Risk + Grounded SOP RAG)",
        "deployment": "Hybrid SaaS / Internal Enterprise",
        "database": status["active_engine"],
        "supabase_project_ref": status["supabase_project_ref"],
    }


@router.get("/api/health")
def api_health_check():
    status = database.db_status()
    return {
        "status": "ok",
        "engine": "MDIP PoC v1.2 (Supabase/SQLite + CPM + XGBoost Delay-Risk + Grounded SOP RAG)",
        "live": True,
        "active_filename": state.ACTIVE_ANALYSIS.get("filename"),
        "database": status["active_engine"],
        "supabase_project_ref": status["supabase_project_ref"],
    }


@router.get("/api/v1/db/status")
def get_db_status():
    """Report active database persistence engine (Supabase Postgres or local SQLite fallback)."""
    return database.db_status()
