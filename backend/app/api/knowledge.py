"""SOP knowledge base and copilot chat endpoints.
"""

from fastapi import APIRouter

import database
from app.schemas import CopilotQuery, SopDocumentPayload
from app.services.copilot import _run_grounded_copilot

router = APIRouter()


@router.get("/api/v1/knowledge/docs")
def get_knowledge_docs():
    return database.get_sops()


@router.post("/api/v1/knowledge/ingest")
def ingest_knowledge_doc(payload: SopDocumentPayload):
    """Add or update an SOP document in the SQLite RAG index."""
    saved = database.upsert_sop(payload.model_dump())
    return {
        "success": True,
        "document": saved,
        "total_documents": len(database.get_sops()),
    }


@router.post("/api/v1/copilot/chat")
def copilot_chat(payload: CopilotQuery):
    msg = (payload.message or payload.question or "").strip()
    role = payload.active_role or payload.role or "Operations Manager"
    return _run_grounded_copilot(msg, role)
