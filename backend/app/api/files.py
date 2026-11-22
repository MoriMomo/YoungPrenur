"""Shared upload endpoint: read a file into a draft for the user to review (/api/v1/files/...)."""

from fastapi import APIRouter, File, HTTPException, Query, UploadFile

from app.services.file_intake import MAX_UPLOAD_BYTES, IntakeError, draft
from schedule_parser import ScheduleParseError

router = APIRouter()


@router.post("/api/v1/files/extract")
async def extract_file(purpose: str = Query(..., max_length=32), file: UploadFile = File(...)):
    """Read the file and return a draft; nothing is saved until the user confirms it elsewhere."""
    content = await file.read(MAX_UPLOAD_BYTES + 1)
    if len(content) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="File is larger than 4 MB.")
    try:
        return draft(purpose, content, (file.filename or "upload").strip()[:200])
    except IntakeError as e:
        raise HTTPException(status_code=e.status, detail=str(e))
    except ScheduleParseError as e:
        raise HTTPException(status_code=422, detail=str(e))
