"""Delay-risk prediction, decision brief and audit log (/api/v1/risks/...).
"""

import time

from fastapi import APIRouter

import database
from app import state
from app.schemas import FlagActionPayload
from app.services.insights import compute_live_decisions

router = APIRouter()


@router.get("/api/v1/risks/prediction")
def get_delay_prediction():
    return {k: v for k, v in state.ACTIVE_ANALYSIS.items() if k != "source"}


@router.get("/api/v1/risks/decisions")
def get_decisions():
    return compute_live_decisions()


@router.post("/api/v1/risks/decisions/flag")
def flag_decision(payload: FlagActionPayload):
    decision_val = (payload.decision or "AUTHORIZED").upper()
    live_decisions = compute_live_decisions()
    matched = next((d for d in live_decisions if d["id"] == payload.action_id), None)
    action_title = matched["title"] if matched else payload.action_id
    sop_ref = matched["source_doc"] if matched else "SOP-MDIP"
    ts = time.strftime("%Y-%m-%d %H:%M:%S")

    entry = database.record_decision_flag(
        action_id=payload.action_id,
        action_title=action_title,
        decision=decision_val,
        reviewer_role=payload.reviewer_role or "Operations Manager",
        notes=payload.notes or "Verified via HITL modal",
        sop_ref=sop_ref,
        timestamp=ts,
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
