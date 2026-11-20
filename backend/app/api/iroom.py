"""IRoom system connector endpoints (/api/v1/iroom/...).
"""

from typing import Any, Dict, List

from fastapi import APIRouter, Body, Depends, HTTPException, Path, Query

import database
from app import state
from app.security import require_user
from app.services.insights import _compute_iroom_overview

router = APIRouter()


@router.get("/api/v1/iroom/materials")
def get_iroom_materials():
    return database.get_stream("materials")


@router.get("/api/v1/iroom/progress")
def get_iroom_progress(user: Dict[str, Any] = Depends(require_user)):
    """Plant projects, plus the signed-in user's uploaded schedule (shown only to them)."""
    own = state.uploaded_project_row(state.get_analysis(user["id"]))
    return ([own] if own else []) + database.get_stream("progress")


@router.get("/api/v1/iroom/drawings")
def get_iroom_drawings():
    return database.get_stream("drawings")


@router.get("/api/v1/iroom/quotations")
def get_iroom_quotations():
    return database.get_stream("quotations")


@router.get("/api/v1/iroom/operations")
def get_iroom_operations():
    return database.get_stream("operations")


@router.post("/api/v1/iroom/{stream}")
def ingest_iroom_stream(
    stream: str = Path(..., description="One of: materials, progress, drawings, quotations, operations"),
    records: List[Dict[str, Any]] = Body(...),
    replace: bool = Query(False, description="Replace existing stream records instead of upserting"),
):
    """Ingest live IRoom JSON telemetry records into SQLite."""
    if stream not in database.VALID_STREAMS:
        raise HTTPException(
            status_code=404,
            detail=f"Unknown IRoom stream '{stream}'. Expected one of: {', '.join(database.VALID_STREAMS)}",
        )
    count = database.upsert_stream_records(stream, records, replace=replace)
    return {
        "success": True,
        "stream": stream,
        "ingested": count,
        "total_records": len(database.get_stream(stream)),
        "replace": replace,
    }


@router.get("/api/v1/iroom/overview")
def get_iroom_overview(user: Dict[str, Any] = Depends(require_user)):
    own = state.uploaded_project_row(state.get_analysis(user["id"]))
    return _compute_iroom_overview([own] if own else None)
