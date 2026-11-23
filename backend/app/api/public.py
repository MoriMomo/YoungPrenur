"""
Public, anonymous endpoints.

POST /api/v1/scheduler/inspect scores a CSV/Excel schedule with the real model and returns
the result to the caller only: nothing is saved, the shared active schedule is untouched,
and no AI document service is called (table files only), so it is safe to expose on the
landing page.
"""

import os
import time

from fastapi import APIRouter, File, HTTPException, Request, UploadFile

from app.security import client_ip, inspections
from ml.predictor import analyze_schedule
from schedule_parser import ScheduleParseError, parse_schedule_document

router = APIRouter()

INSPECT_MAX_BYTES = 2 * 1024 * 1024
INSPECT_EXTENSIONS = (".csv", ".xlsx", ".xls", ".xer", ".xml")


@router.post("/api/v1/scheduler/inspect")
async def inspect_schedule(request: Request, file: UploadFile = File(...)):
    """Score an uploaded schedule without storing it. Table formats only, 2 MB max, rate-limited per IP."""
    ip = client_ip(request)
    inspections.check(ip)

    filename = (file.filename or "").strip()
    if not filename.lower().endswith(INSPECT_EXTENSIONS):
        raise HTTPException(
            status_code=415,
            detail="Inspection accepts CSV, Excel, Primavera P6 (.xer), or MS Project (.xml) schedules. Sign in to upload PDF or Word documents.",
        )
    content = await file.read(INSPECT_MAX_BYTES + 1)
    if len(content) > INSPECT_MAX_BYTES:
        raise HTTPException(status_code=413, detail="Schedule file is larger than 2 MB.")
    inspections.hit(ip)

    start = time.perf_counter()
    try:
        parsed = parse_schedule_document(content, filename)
    except ScheduleParseError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception:
        raise HTTPException(status_code=422, detail=f"Could not read {filename}. Check that it is a valid CSV, Excel, .xer, or .xml file.")

    project_name = os.path.splitext(filename)[0].replace("_", " ").strip() or "Inspected schedule"
    analysis = analyze_schedule(parsed["tasks"], project_name)
    return {
        "success": True,
        "filename": filename,
        "parse_time_ms": round((time.perf_counter() - start) * 1000, 2),
        "tasks_extracted": len(analysis["tasks"]),
        "critical_path_tasks": analysis["critical_path_tasks_count"],
        "high_risk_tasks": analysis["high_risk_tasks_count"],
        "overall_delay_probability": analysis["overall_delay_probability"],
        "estimated_project_slippage_days": analysis["estimated_project_slippage_days"],
        "stored": False,
        "message": f"Inspected {len(analysis['tasks'])} activities from {filename}. Nothing was stored.",
        "tasks": analysis["tasks"],
    }
