"""Schedule ingestion and WBS endpoints (/api/v1/scheduler/...).
"""

import os
import time
from typing import Optional

from fastapi import APIRouter, File, HTTPException, UploadFile

import database
from app import state
from app.config import DEFAULT_PROJECT_NAME, DEFAULT_SCHEDULE_FILENAME
from app.state import _analyze_default_schedule_file, _sync_active_project_progress
from ml.predictor import analyze_schedule
from schedule_parser import ScheduleParseError, parse_schedule_document

router = APIRouter()


@router.get("/api/v1/scheduler/wbs")
def get_wbs_schedule():
    return state.ACTIVE_ANALYSIS["tasks"]


@router.post("/api/v1/scheduler/upload")
async def upload_scheduler_v1(file: Optional[UploadFile] = File(None)):
    """Parse uploaded CSV/XLSX/Word/PDF schedule (or reload baseline CSV), persist to SQLite, run CPM + XGBoost."""
    start = time.perf_counter()
    if file is None or not file.filename:
        analysis = _analyze_default_schedule_file()
        filename = DEFAULT_SCHEDULE_FILENAME
    else:
        filename = file.filename
        content = await file.read()
        if len(content) > 10 * 1024 * 1024:
            raise HTTPException(status_code=413, detail="Schedule file is larger than 10 MB.")
        try:
            parsed = parse_schedule_document(content, filename)
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
        database.clear_decision_statuses()

    state.ACTIVE_ANALYSIS = analysis
    database.save_active_analysis(analysis)
    _sync_active_project_progress(analysis)

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
