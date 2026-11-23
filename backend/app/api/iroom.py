"""IRoom system connector endpoints (/api/v1/iroom/...).
"""

from typing import Any, Dict, List

from fastapi import APIRouter, Body, Depends, HTTPException, Path, Query

import database
from app import state
from app.security import require_user
from app.services.insights import _compute_iroom_overview
from seed_data import INITIAL_IROOM_DATA

router = APIRouter()


@router.get("/api/v1/iroom/materials")
def get_iroom_materials(user: Dict[str, Any] = Depends(require_user)):
    return database.get_stream("materials", workspace=user["id"])


@router.get("/api/v1/iroom/progress")
def get_iroom_progress(user: Dict[str, Any] = Depends(require_user)):
    """User-uploaded schedule project row plus this user's own progress records."""
    own = state.uploaded_project_row(state.get_analysis(user["id"]))
    return ([own] if own else []) + database.get_stream("progress", workspace=user["id"])


@router.get("/api/v1/iroom/drawings")
def get_iroom_drawings(user: Dict[str, Any] = Depends(require_user)):
    return database.get_stream("drawings", workspace=user["id"])


@router.get("/api/v1/iroom/quotations")
def get_iroom_quotations(user: Dict[str, Any] = Depends(require_user)):
    return database.get_stream("quotations", workspace=user["id"])


@router.get("/api/v1/iroom/operations")
def get_iroom_operations(user: Dict[str, Any] = Depends(require_user)):
    return database.get_stream("operations", workspace=user["id"])


@router.post("/api/v1/iroom/load-sample")
def load_sample_iroom(user: Dict[str, Any] = Depends(require_user)):
    """Explicitly load the sample IRoom stream records into this user's workspace."""
    counts = {
        stream: database.upsert_stream_records(stream, items, workspace=user["id"])
        for stream, items in INITIAL_IROOM_DATA.items()
    }
    return {"success": True, "counts": counts}


@router.delete("/api/v1/iroom")
def clear_iroom(user: Dict[str, Any] = Depends(require_user)):
    """Clear all IRoom stream records in this user's workspace back to blank."""
    database.clear_stream_records(user["id"])
    return {"success": True}


@router.post("/api/v1/iroom/{stream}")
def ingest_iroom_stream(
    stream: str = Path(..., description="One of: materials, progress, drawings, quotations, operations"),
    records: List[Dict[str, Any]] = Body(...),
    replace: bool = Query(False, description="Replace existing stream records instead of upserting"),
    user: Dict[str, Any] = Depends(require_user),
):
    """Ingest user-scoped IRoom JSON telemetry records into SQLite/Supabase."""
    if stream not in database.VALID_STREAMS:
        raise HTTPException(
            status_code=404,
            detail=f"Unknown IRoom stream '{stream}'. Expected one of: {', '.join(database.VALID_STREAMS)}",
        )
    count = database.upsert_stream_records(stream, records, replace=replace, workspace=user["id"])
    return {
        "success": True,
        "stream": stream,
        "ingested": count,
        "total_records": len(database.get_stream(stream, workspace=user["id"])),
        "replace": replace,
    }


@router.get("/api/v1/iroom/overview")
def get_iroom_overview(user: Dict[str, Any] = Depends(require_user)):
    own = state.uploaded_project_row(state.get_analysis(user["id"]))
    return _compute_iroom_overview([own] if own else None, workspace=user["id"])
