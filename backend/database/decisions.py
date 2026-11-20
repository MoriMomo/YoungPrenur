"""Per-workspace sign-off statuses and the plant-wide ISO 9001 audit log.
"""

from typing import Any, Dict, List, Optional
import urllib.error
import urllib.parse
import urllib.request

from database._core import _connect, _now_iso, _sb_request, _supabase_key, log


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
    return _scope_statuses(_all_decision_statuses(), workspace)


def _all_decision_statuses() -> Dict[str, Dict[str, Any]]:
    if _supabase_key():
        try:
            rows = _sb_request(
                "GET",
                "decision_status",
                query="select=action_id,flagged,status,decision,reviewer_role,notes,updated_at",
            )
            if isinstance(rows, list):
                return {
                    r["action_id"]: {
                        "flagged": bool(r["flagged"]),
                        "status": r["status"],
                        "decision": r["decision"],
                        "reviewer_role": r["reviewer_role"],
                        "notes": r["notes"],
                        "updated_at": r["updated_at"],
                    }
                    for r in rows
                }
        except Exception:
            log.warning("Supabase: could not read decision statuses; using SQLite", exc_info=True)

    with _connect() as conn:
        rows = conn.execute(
            "SELECT action_id, flagged, status, decision, reviewer_role, notes, updated_at FROM decision_status"
        ).fetchall()
        return {
            r["action_id"]: {
                "flagged": bool(r["flagged"]),
                "status": r["status"],
                "decision": r["decision"],
                "reviewer_role": r["reviewer_role"],
                "notes": r["notes"],
                "updated_at": r["updated_at"],
            }
            for r in rows
        }


def clear_decision_statuses(workspace: Optional[str] = None) -> None:
    """Clear sign-offs for one workspace (all of them when workspace is None)."""
    prefix = f"{workspace}::" if workspace else ""
    with _connect() as conn:
        if workspace:
            conn.execute("DELETE FROM decision_status WHERE substr(action_id, 1, ?) = ?", (len(prefix), prefix))
        else:
            conn.execute("DELETE FROM decision_status")

    if _supabase_key():
        try:
            query = f"action_id=like.{urllib.parse.quote(prefix)}*" if workspace else "action_id=not.is.null"
            _sb_request("DELETE", "decision_status", query=query)
        except Exception:
            log.warning("Supabase: could not clear decision statuses", exc_info=True)


def record_decision_flag(
    action_id: str,
    action_title: str,
    decision: str,
    reviewer_role: str,
    notes: str,
    sop_ref: str,
    timestamp: str,
    workspace: Optional[str] = None,
) -> Dict[str, Any]:
    status_val = "overridden" if decision == "OVERRIDDEN" else "authorized"
    status_key = _status_key(workspace, action_id)
    now = _now_iso()
    seq = 1
    if _supabase_key():
        try:
            existing = _sb_request("GET", "audit_log", query="select=id&limit=1000")
            if isinstance(existing, list):
                seq = max(
                    (
                        int(str(r["id"]).split("-", 1)[1])
                        for r in existing
                        if str(r.get("id", "")).startswith("AUD-") and str(r["id"]).split("-", 1)[1].isdigit()
                    ),
                    default=0,
                ) + 1
        except Exception:
            log.warning("Supabase: could not read the audit sequence; numbering from SQLite", exc_info=True)
            seq = 1

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
            (status_key, status_val, decision, reviewer_role, notes, now),
        )
        local_rows = conn.execute("SELECT id FROM audit_log").fetchall()
        local_seq = max(
            (
                int(str(r["id"]).split("-", 1)[1])
                for r in local_rows
                if str(r["id"]).startswith("AUD-") and str(r["id"]).split("-", 1)[1].isdigit()
            ),
            default=0,
        ) + 1
        entry_id = f"AUD-{max(seq, local_seq):03d}"
        conn.execute(
            """
            INSERT INTO audit_log (id, action_id, action_title, decision, reviewer_role, notes, sop_ref, timestamp)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (entry_id, action_id, action_title, decision, reviewer_role, notes, sop_ref, timestamp),
        )

    if _supabase_key():
        try:
            _sb_request(
                "POST",
                "decision_status",
                query="on_conflict=action_id",
                body={
                    "action_id": status_key,
                    "flagged": True,
                    "status": status_val,
                    "decision": decision,
                    "reviewer_role": reviewer_role,
                    "notes": notes,
                    "updated_at": now,
                },
                prefer="resolution=merge-duplicates,return=minimal",
            )
            _sb_request(
                "POST",
                "audit_log",
                query="on_conflict=id",
                body={
                    "id": entry_id,
                    "action_id": action_id,
                    "action_title": action_title,
                    "decision": decision,
                    "reviewer_role": reviewer_role,
                    "notes": notes,
                    "sop_ref": sop_ref,
                    "timestamp": timestamp,
                    "created_at": now,
                },
                prefer="resolution=merge-duplicates,return=minimal",
            )
        except Exception:
            log.warning("Supabase: could not save a sign-off; kept in SQLite only", exc_info=True)

    return {
        "id": entry_id,
        "action_id": action_id,
        "action_title": action_title,
        "decision": decision,
        "reviewer_role": reviewer_role,
        "notes": notes,
        "sop_ref": sop_ref,
        "timestamp": timestamp,
    }


def get_audit_log() -> List[Dict[str, Any]]:
    if _supabase_key():
        try:
            rows = _sb_request(
                "GET",
                "audit_log",
                query="select=id,action_id,action_title,decision,reviewer_role,notes,sop_ref,timestamp&order=created_at.desc",
            )
            if isinstance(rows, list):
                return rows
        except Exception:
            log.warning("Supabase: could not read the audit log; using SQLite", exc_info=True)

    with _connect() as conn:
        rows = conn.execute(
            "SELECT id, action_id, action_title, decision, reviewer_role, notes, sop_ref, timestamp "
            "FROM audit_log ORDER BY rowid DESC"
        ).fetchall()
        return [dict(r) for r in rows]
