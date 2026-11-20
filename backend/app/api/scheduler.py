"""Schedule ingestion and WBS endpoints (/api/v1/scheduler/...).
"""

import os
import time
from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile

import database
from app import state
from app.config import DEFAULT_PROJECT_NAME, DEFAULT_SCHEDULE_FILENAME
from app.security import external_ai_allowed, require_user
from ml.predictor import analyze_schedule
from schedule_parser import ScheduleParseError, parse_schedule_document

router = APIRouter()


@router.get("/api/v1/scheduler/wbs")
def get_wbs_schedule(user: Dict[str, Any] = Depends(require_user)):
    return state.get_analysis(user["id"])["tasks"]


@router.post("/api/v1/scheduler/upload")
async def upload_scheduler_v1(
    file: Optional[UploadFile] = File(None),
    user: Dict[str, Any] = Depends(require_user),
    allow_ai: bool = Depends(external_ai_allowed),
):
    """Parse the user's CSV/XLSX/Word/PDF schedule (no file = back to the plant baseline) and score it.

    The result becomes this user's own schedule; other users keep theirs.
    """
    start = time.perf_counter()
    if file is None or not file.filename:
        analysis = state.BASELINE_ANALYSIS
        filename = analysis.get("filename", DEFAULT_SCHEDULE_FILENAME)
    else:
        filename = file.filename
        content = await file.read()
        if len(content) > 10 * 1024 * 1024:
            raise HTTPException(status_code=413, detail="Schedule file is larger than 10 MB.")
        try:
            parsed = parse_schedule_document(content, filename, allow_external_ai=allow_ai)
        except ScheduleParseError as e:
            raise HTTPException(status_code=422, detail=str(e))
        except Exception as e:
            raise HTTPException(status_code=422, detail=f"Could not read {filename}: {e}")
        tasks = parsed["tasks"]
        project_name = (
            parsed.get("project_name")
            or os.path.splitext(filename)[0].replace("_", " ").strip()
            or DEFAULT_PROJECT_NAME
        )
        analysis = {
            "source": "upload",
            "filename": filename,
            "extraction_method": parsed.get("extraction_method", "table"),
            "document_summary": parsed.get("document_summary"),
            "document_excerpt": parsed.get("document_excerpt"),
            **analyze_schedule(tasks, project_name),
        }

    database.clear_decision_statuses(user["id"])
    if analysis is state.BASELINE_ANALYSIS:
        state.reset_analysis(user["id"])
    else:
        state.set_analysis(user["id"], analysis)

    elapsed_ms = round((time.perf_counter() - start) * 1000, 2)
    n = len(analysis["tasks"])
    extraction_method = analysis.get("extraction_method", "table")
    document_summary = analysis.get("document_summary")
    ai_parsed = str(extraction_method).startswith("gemini")
    action_verb = "Read with AI and extracted" if ai_parsed else "Extracted"
    return {
        "success": True,
        "filename": filename,
        "parse_time_ms": elapsed_ms,
        "tasks_extracted": n,
        "critical_path_tasks": analysis["critical_path_tasks_count"],
        "high_risk_tasks": analysis["high_risk_tasks_count"],
        "overall_delay_probability": analysis["overall_delay_probability"],
        "estimated_project_slippage_days": analysis["estimated_project_slippage_days"],
        "extraction_method": extraction_method,
        "document_summary": document_summary,
        "ai_parsed": ai_parsed,
        "message": (
            f"{action_verb} {n} WBS activities from {filename}, computed the critical path and scored delay risk "
            f"with XGBoost: {analysis['overall_delay_probability']:.1f}% chance of project slip "
            f"(P50 +{analysis['estimated_project_slippage_days']:.1f}d)."
        ),
        "tasks": analysis["tasks"],
    }
