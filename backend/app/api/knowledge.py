"""SOP knowledge base and copilot chat endpoints.
"""

from typing import Any, Dict, List

from fastapi import APIRouter, Body, Depends

import database
from app import state
from app.schemas import CopilotQuery, SopDocumentPayload
from app.security import external_ai_allowed, require_user
from app.services.copilot import _run_grounded_copilot, get_copilot_status

router = APIRouter()


@router.get("/api/v1/knowledge/docs")
def get_knowledge_docs():
    return database.get_sops()


@router.get("/api/v1/copilot/status")
def copilot_status():
    return get_copilot_status()


@router.post("/api/v1/knowledge/ingest")
def ingest_knowledge_doc(payload: SopDocumentPayload):
    """Add or update an SOP document in the SQLite RAG index."""
    saved = database.upsert_sop(payload.model_dump())
    return {
        "success": True,
        "document": saved,
        "total_documents": len(database.get_sops()),
    }


@router.post("/api/v1/knowledge/ingest-batch")
def ingest_knowledge_batch(payload: List[SopDocumentPayload] = Body(..., min_length=1, max_length=100)):
    """Save the confirmed clauses of an uploaded SOP, one row per clause."""
    saved = [database.upsert_sop(doc.model_dump()) for doc in payload]
    return {"success": True, "saved": len(saved), "total_documents": len(database.get_sops())}


@router.post("/api/v1/copilot/chat")
def copilot_chat(
    payload: CopilotQuery,
    user: Dict[str, Any] = Depends(require_user),
    allow_ai: bool = Depends(external_ai_allowed),
):
    msg = (payload.message or payload.question or "").strip()
    role = payload.active_role or payload.role or "Operations Manager"
    history = [item.model_dump() for item in payload.history]
    return _run_grounded_copilot(
        msg, role, history=history, analysis=state.get_analysis(user["id"]), allow_external_ai=allow_ai
    )
