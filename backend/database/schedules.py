"""The plant baseline schedule analysis and each user's own uploaded analysis.
"""

import json
from typing import Any, Dict, Optional
import urllib.error
import urllib.parse
import urllib.request

from database._core import _connect, _from_jsonb, _now_iso, _sb_request, _supabase_key, log


def save_active_analysis(analysis: Dict[str, Any]) -> None:
    now = _now_iso()
    filename = analysis.get("filename", "master_project_schedule_rev3.csv")
    project_name = analysis.get("project_name", "MDIP Active Schedule")

    with _connect() as conn:
        conn.execute(
            """
            INSERT INTO active_schedule (id, filename, project_name, analysis_json, updated_at)
            VALUES (1, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                filename = excluded.filename,
                project_name = excluded.project_name,
                analysis_json = excluded.analysis_json,
                updated_at = excluded.updated_at
            """,
            (filename, project_name, json.dumps(analysis), now),
        )

    if _supabase_key():
        try:
            _sb_request(
                "POST",
                "active_schedule",
                query="on_conflict=id",
                body={
                    "id": 1,
                    "filename": filename,
                    "project_name": project_name,
                    "analysis_json": analysis,
                    "updated_at": now,
                },
                prefer="resolution=merge-duplicates,return=minimal",
            )
        except Exception:
            log.warning("Supabase: could not save the baseline schedule; kept in SQLite only", exc_info=True)


def load_active_analysis() -> Optional[Dict[str, Any]]:
    if _supabase_key():
        try:
            rows = _sb_request("GET", "active_schedule", query="select=analysis_json&id=eq.1&limit=1")
            if isinstance(rows, list):
                if rows:
                    return _from_jsonb(rows[0]["analysis_json"])
                return None
        except Exception:
            log.warning("Supabase: could not load the baseline schedule; using SQLite", exc_info=True)

    with _connect() as conn:
        row = conn.execute("SELECT analysis_json FROM active_schedule WHERE id = 1").fetchone()
        if row is None:
            return None
        return json.loads(row["analysis_json"])


def save_user_analysis(user_id: str, analysis: Dict[str, Any]) -> None:
    """Persist one user's own uploaded schedule analysis (their private workspace)."""
    now = _now_iso()
    filename = analysis.get("filename", "uploaded_schedule")
    project_name = analysis.get("project_name", "MDIP Active Schedule")
    with _connect() as conn:
        conn.execute(
            """
            INSERT INTO user_schedules (user_id, filename, project_name, analysis_json, updated_at)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(user_id) DO UPDATE SET
                filename = excluded.filename,
                project_name = excluded.project_name,
                analysis_json = excluded.analysis_json,
                updated_at = excluded.updated_at
            """,
            (user_id, filename, project_name, json.dumps(analysis), now),
        )

    if _supabase_key():
        try:
            _sb_request(
                "POST",
                "user_schedules",
                query="on_conflict=user_id",
                body={
                    "user_id": user_id,
                    "filename": filename,
                    "project_name": project_name,
                    "analysis_json": analysis,
                    "updated_at": now,
                },
                prefer="resolution=merge-duplicates,return=minimal",
            )
        except Exception:
            log.warning("Supabase: could not save schedule for user %s; kept in SQLite only", user_id, exc_info=True)


def load_user_analysis(user_id: str) -> Optional[Dict[str, Any]]:
    """The user's own schedule analysis, or None if they are still on the plant baseline."""
    if _supabase_key():
        try:
            rows = _sb_request(
                "GET",
                "user_schedules",
                query=f"select=analysis_json&user_id=eq.{urllib.parse.quote(user_id)}&limit=1",
            )
            if isinstance(rows, list):
                return _from_jsonb(rows[0]["analysis_json"]) if rows else None
        except Exception:
            log.warning("Supabase: could not load schedule for user %s; using SQLite", user_id, exc_info=True)

    with _connect() as conn:
        row = conn.execute("SELECT analysis_json FROM user_schedules WHERE user_id = ?", (user_id,)).fetchone()
        return json.loads(row["analysis_json"]) if row else None


def delete_user_analysis(user_id: str) -> None:
    """Return the user to the plant baseline schedule."""
    with _connect() as conn:
        conn.execute("DELETE FROM user_schedules WHERE user_id = ?", (user_id,))
    if _supabase_key():
        try:
            _sb_request("DELETE", "user_schedules", query=f"user_id=eq.{urllib.parse.quote(user_id)}")
        except Exception:
            log.warning("Supabase: could not reset schedule for user %s", user_id, exc_info=True)
