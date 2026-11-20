"""Delay-risk prediction, decision brief and audit log (/api/v1/risks/...).
"""

import time

from typing import Any, Dict

from fastapi import APIRouter, Depends, HTTPException

import database
from app import state
from app.schemas import FlagActionPayload
from app.security import require_user
from app.services.insights import compute_live_decisions

router = APIRouter()


@router.get("/api/v1/risks/prediction")
def get_delay_prediction(user: Dict[str, Any] = Depends(require_user)):
    return dict(state.get_analysis(user["id"]))


@router.get("/api/v1/risks/decisions")
def get_decisions(user: Dict[str, Any] = Depends(require_user)):
    return compute_live_decisions(state.get_analysis(user["id"]), user["id"])


@router.post("/api/v1/risks/decisions/flag")
def flag_decision(payload: FlagActionPayload, user: Dict[str, Any] = Depends(require_user)):
    """Authorize or override a recommended action. The reviewer is the signed-in user, never the request body."""
    decision_val = (payload.decision or "AUTHORIZED").upper()
    if decision_val not in {"AUTHORIZED", "OVERRIDDEN"}:
        raise HTTPException(status_code=422, detail="Decision must be AUTHORIZED or OVERRIDDEN.")
    live_decisions = compute_live_decisions(state.get_analysis(user["id"]), user["id"])
    matched = next((d for d in live_decisions if d["id"] == payload.action_id), None)
    action_title = matched["title"] if matched else payload.action_id
    sop_ref = matched["source_doc"] if matched else "SOP-MDIP"
    ts = time.strftime("%Y-%m-%d %H:%M:%S")

    entry = database.record_decision_flag(
        action_id=payload.action_id,
        action_title=action_title,
        decision=decision_val,
        reviewer_role=user["role"],
        notes=payload.notes or "Verified via HITL modal",
        sop_ref=sop_ref,
        timestamp=ts,
        workspace=user["id"],
    )
    return {
        "success": True,
        "action_id": payload.action_id,
        "decision": decision_val,
        "status": "FLAGGED_IN_AUDIT_LOG",
        "reviewer": entry["reviewer_role"],
        "timestamp": entry["timestamp"],
        "message": f"Action {decision_val.lower()} and recorded in SQLite ISO 9001 audit log.",
    }


@router.get("/api/v1/risks/audit-log")
def get_audit_log():
    return database.get_audit_log()
