"""Delay-risk prediction, decision brief and audit log (/api/v1/risks/...).
"""

import logging
import sqlite3
from typing import Any, Dict

from fastapi import APIRouter, Depends, HTTPException

import database
from app import state
from app.schemas import FlagActionPayload
from app.security import decision_reviewer, decision_workspace, require_user
from app.services.insights import compute_live_decisions

router = APIRouter()
log = logging.getLogger(__name__)


@router.get("/api/v1/risks/prediction")
def get_delay_prediction(user: Dict[str, Any] = Depends(require_user)):
    return dict(state.get_analysis(user["id"]))


@router.get("/api/v1/risks/decisions")
def get_decisions(user: Dict[str, Any] = Depends(require_user)):
    return compute_live_decisions(state.get_analysis(user["id"]), decision_workspace(user))


@router.post("/api/v1/risks/decisions/flag")
def flag_decision(payload: FlagActionPayload, user: Dict[str, Any] = Depends(require_user)):
    """Authorize or override a recommended action. The reviewer is the signed-in user, never the request body."""
    decision_val = (payload.decision or "AUTHORIZED").upper()
    if decision_val not in {"AUTHORIZED", "OVERRIDDEN"}:
        raise HTTPException(status_code=422, detail="Decision must be AUTHORIZED or OVERRIDDEN.")
    reviewer_id, reviewer_role = decision_reviewer(user)
    notes = (payload.notes or "").strip()
    if decision_val == "OVERRIDDEN" and not notes:
        raise HTTPException(status_code=422, detail="An override reason is required.")
    workspace = decision_workspace(user)
    live_decisions = compute_live_decisions(state.get_analysis(user["id"]), workspace)
    matched = next((d for d in live_decisions if d["id"] == payload.action_id), None)
    if matched is None:
        raise HTTPException(status_code=404, detail="Action is not in your active schedule.")

    try:
        entry = database.record_decision_flag(
            action_id=payload.action_id,
            action_title=matched["title"],
            decision=decision_val,
            reviewer_id=reviewer_id,
            reviewer_role=reviewer_role,
            notes=notes or "Verification checklist confirmed.",
            sop_ref=matched["source_doc"],
            workspace=workspace,
        )
    except (OSError, RuntimeError, sqlite3.Error) as exc:
        log.exception("Could not confirm decision review persistence")
        raise HTTPException(status_code=503, detail="Could not confirm that the review was saved.") from exc
    return {
        "success": True,
        "action_id": payload.action_id,
        "decision": decision_val,
        "status": "FLAGGED_IN_AUDIT_LOG",
        "reviewer": entry["reviewer_role"],
        "timestamp": entry["timestamp"],
        "entry": entry,
    }


@router.get("/api/v1/risks/audit-log")
def get_audit_log(user: Dict[str, Any] = Depends(require_user)):
    return database.get_audit_log(decision_workspace(user))
