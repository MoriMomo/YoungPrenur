"""Per-workspace sign-off statuses and audit log.
"""

from typing import Any, Dict, List, Optional
import urllib.parse
from uuid import uuid4

from database._core import _connect, _now_iso, _sb_request, _supabase_key


def _status_key(workspace: Optional[str], action_id: str) -> str:
    return f"{workspace}::{action_id}" if workspace else action_id


def _scope_statuses(rows: Dict[str, Dict[str, Any]], workspace: Optional[str]) -> Dict[str, Dict[str, Any]]:
    """Keep only one workspace's statuses and strip the workspace prefix from their keys."""
    if not workspace:
        return {k: v for k, v in rows.items() if "::" not in k}
    prefix = f"{workspace}::"
    return {k[len(prefix):]: v for k, v in rows.items() if k.startswith(prefix)}


def get_decision_statuses(workspace: Optional[str] = None) -> Dict[str, Dict[str, Any]]:
    """Sign-off status per action for one workspace (a user's schedule); None = legacy shared statuses."""
    return _scope_statuses(_all_decision_statuses(workspace), workspace)


def _all_decision_statuses(workspace: Optional[str]) -> Dict[str, Dict[str, Any]]:
    fields = "action_id,flagged,status,decision,reviewer_role,notes,updated_at"
    prefix = f"{workspace}::" if workspace else ""
    if _supabase_key():
        rows = _sb_request("GET", "decision_status", query=urllib.parse.urlencode({
            "select": fields, "workspace": f"eq.{workspace}" if workspace else "is.null",
        }))
    else:
        with _connect() as conn:
            rows = conn.execute(
                f"SELECT {fields} FROM decision_status WHERE substr(action_id, 1, ?) = ?"
                if workspace else f"SELECT {fields} FROM decision_status WHERE instr(action_id, '::') = 0",
                (len(prefix), prefix) if workspace else (),
            ).fetchall()
    return {
        row["action_id"]: {**dict(row), "flagged": bool(row["flagged"])}
        for row in rows
    }


def clear_decision_statuses(workspace: Optional[str] = None) -> None:
    """Clear sign-offs for one workspace (all of them when workspace is None)."""
    if _supabase_key():
        query = urllib.parse.urlencode({"workspace": f"eq.{workspace}"}) if workspace else "action_id=not.is.null"
        _sb_request("DELETE", "decision_status", query=query)
        return

    with _connect() as conn:
        if workspace:
            prefix = f"{workspace}::"
            conn.execute("DELETE FROM decision_status WHERE substr(action_id, 1, ?) = ?", (len(prefix), prefix))
        else:
            conn.execute("DELETE FROM decision_status")


def record_decision_flag(
    action_id: str,
    action_title: str,
    decision: str,
    reviewer_id: str,
    reviewer_role: str,
    notes: str,
    sop_ref: str,
    workspace: str,
) -> Dict[str, Any]:
    now = _now_iso()
    entry = {
        "id": f"AUD-{uuid4().hex}",
        "workspace": workspace,
        "action_id": action_id,
        "action_title": action_title,
        "decision": decision,
        "reviewer_id": reviewer_id,
        "reviewer_role": reviewer_role,
        "notes": notes,
        "sop_ref": sop_ref,
        "timestamp": now,
    }
    status_key = _status_key(workspace, action_id)
    status = "overridden" if decision == "OVERRIDDEN" else "authorized"

    if _supabase_key():
        _sb_request("POST", "rpc/record_decision_review", body={
            "entry": entry, "status_key": status_key, "review_status": status,
        })
    else:
        with _connect() as conn:
            conn.execute(
                """
                INSERT INTO decision_status (action_id, flagged, status, decision, reviewer_role, notes, updated_at)
                VALUES (?, 1, ?, ?, ?, ?, ?)
                ON CONFLICT(action_id) DO UPDATE SET
                    flagged = 1,
                    status = excluded.status,
                    decision = excluded.decision,
                    reviewer_role = excluded.reviewer_role,
                    notes = excluded.notes,
                    updated_at = excluded.updated_at
                """,
                (status_key, status, decision, reviewer_role, notes, now),
            )
            conn.execute(
                """
                INSERT INTO audit_log (
                    id, workspace, action_id, action_title, decision, reviewer_id, reviewer_role, notes, sop_ref, timestamp
                )
                VALUES (
                    :id, :workspace, :action_id, :action_title, :decision, :reviewer_id, :reviewer_role,
                    :notes, :sop_ref, :timestamp
                )
                """,
                entry,
            )
    return {key: value for key, value in entry.items() if key != "workspace"}


def get_audit_log(workspace: str) -> List[Dict[str, Any]]:
    fields = "id,action_id,action_title,decision,reviewer_id,reviewer_role,notes,sop_ref,timestamp"
    if _supabase_key():
        return _sb_request("GET", "audit_log", query=urllib.parse.urlencode({
            "select": fields, "workspace": f"eq.{workspace}", "order": "created_at.desc",
        }))

    with _connect() as conn:
        rows = conn.execute(
            f"SELECT {fields} FROM audit_log WHERE workspace = ? ORDER BY rowid DESC", (workspace,),
        ).fetchall()
        return [dict(r) for r in rows]
