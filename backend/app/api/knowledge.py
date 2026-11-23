"""SOP knowledge base and copilot chat endpoints.
"""

from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Body, Depends

import database
from app import state
from app.schemas import CopilotQuery, SopDocumentPayload
from app.security import external_ai_allowed, require_user
from app.services.copilot import _run_grounded_copilot, get_copilot_status
from seed_data import INITIAL_SOPS

router = APIRouter()


def _ws(user: Any) -> Optional[str]:
    return user.get("id") if isinstance(user, dict) else None


@router.get("/api/v1/knowledge/docs")
def get_knowledge_docs(user: Dict[str, Any] = Depends(require_user)):
    return database.get_sops(workspace=_ws(user))


@router.get("/api/v1/copilot/status")
def copilot_status(user: Dict[str, Any] = Depends(require_user)):
    return get_copilot_status(workspace=_ws(user))


@router.post("/api/v1/knowledge/ingest")
def ingest_knowledge_doc(
    payload: SopDocumentPayload,
    user: Dict[str, Any] = Depends(require_user),
):
    """Add or update a user-scoped SOP clause in the RAG index."""
    ws = _ws(user)
    saved = database.upsert_sop(payload.model_dump(), workspace=ws)
    return {
        "success": True,
        "document": saved,
        "total_documents": len(database.get_sops(workspace=ws)),
    }


@router.post("/api/v1/knowledge/ingest-batch")
def ingest_knowledge_batch(
    payload: List[SopDocumentPayload] = Body(..., min_length=1, max_length=100),
    user: Dict[str, Any] = Depends(require_user),
):
    """Save the confirmed clauses of an uploaded SOP, one row per clause."""
    ws = _ws(user)
    saved = [database.upsert_sop(doc.model_dump(), workspace=ws) for doc in payload]
    return {"success": True, "saved": len(saved), "total_documents": len(database.get_sops(workspace=ws))}


@router.post("/api/v1/knowledge/load-sample")
def load_sample_knowledge(user: Dict[str, Any] = Depends(require_user)):
    """Explicitly load the sample plant SOPs into this user's workspace."""
    ws = _ws(user)
    for doc in INITIAL_SOPS:
        database.upsert_sop(doc, workspace=ws)
    docs = database.get_sops(workspace=ws)
    return {"success": True, "documents": docs, "total_documents": len(docs)}


@router.delete("/api/v1/knowledge/docs")
def clear_knowledge_docs(user: Dict[str, Any] = Depends(require_user)):
    """Clear all SOP documents in this user's workspace back to blank."""
    ws = _ws(user)
    if ws:
        database.clear_sops(ws)
    return {"success": True, "total_documents": 0}


@router.post("/api/v1/copilot/chat")
def copilot_chat(
    payload: CopilotQuery,
    user: Dict[str, Any] = Depends(require_user),
    allow_ai: bool = Depends(external_ai_allowed),
):
    ws = _ws(user)
    msg = (payload.message or payload.question or "").strip()
    role = payload.active_role or payload.role or "Operations Manager"
    history = [item.model_dump() for item in payload.history]
    return _run_grounded_copilot(
        msg,
        role,
        history=history,
        analysis=state.get_analysis(ws),
        allow_external_ai=allow_ai,
        workspace=ws,
    )
