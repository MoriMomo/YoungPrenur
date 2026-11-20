"""Pre-v1 endpoints kept for backward compatibility.
"""

from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, File, UploadFile

from app import state
from app.api.scheduler import upload_scheduler_v1
from app.schemas import CopilotQuery, TaskItem
from app.security import external_ai_allowed, require_user
from app.services.copilot import _run_grounded_copilot
from ml.predictor import score_tasks

router = APIRouter()


@router.post("/api/scheduler/upload")
async def parse_schedule(
    file: Optional[UploadFile] = File(None),
    user: Dict[str, Any] = Depends(require_user),
    allow_ai: bool = Depends(external_ai_allowed),
):
    result = await upload_scheduler_v1(file, user, allow_ai)
    return {
        "filename": result["filename"],
        "status": "standardized",
        "parse_time_ms": result["parse_time_ms"],
        "tasks_extracted": result["tasks_extracted"],
        "schema_version": "mdip-v1",
    }


@router.post("/api/risks/evaluate")
def evaluate_delay_risk(tasks: List[TaskItem]):
    items: List[Dict[str, Any]] = []
    for t in tasks:
        float_days = t.float_days or 0
        items.append({
            "code": t.task_id,
            "task": t.name,
            "planned_days": float(t.planned_days),
            "actual_days": float(t.actual_days or t.planned_days),
            "float_days": float_days,
            "critical": float_days == 0,
            "upstream_slip_days": float(t.upstream_slip_days),
            "external_dependency": t.external_vendor,
            "work_center": t.work_center or "",
            "resource_utilization": t.resource_utilization,
            "drawing_revisions": t.drawing_revisions or 0,
        })
    score_tasks(items)
    results = [
        {
            "task_id": i["code"],
            "name": i["task"],
            "delay_probability": round(i["delay_risk"], 2),
            "risk_level": i["risk_level"],
            "expected_slip_days": i["expected_slip_days"],
            "drivers": [d["label"] for d in i["drivers"]] or ["Normal operating baseline"],
        }
        for i in items
    ]
    return {"evaluated_tasks": len(results), "predictions": results}


@router.post("/api/copilot/ask")
def ask_copilot(
    payload: CopilotQuery,
    user: Dict[str, Any] = Depends(require_user),
    allow_ai: bool = Depends(external_ai_allowed),
):
    msg = (payload.message or payload.question or "").strip() or "Summarize current project risks and bottlenecks."
    role = payload.active_role or payload.role or "Operations Manager"
    res = _run_grounded_copilot(msg, role, analysis=state.get_analysis(user["id"]), allow_external_ai=allow_ai)
    return {
        "answer": res["reply"],
        "reply": res["reply"],
        "citations": res["citations"],
        "is_grounded": res["is_grounded"],
        "confidence": res["confidence"],
    }
