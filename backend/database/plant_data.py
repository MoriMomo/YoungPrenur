"""IRoom telemetry streams and the SOP knowledge base.
"""

import json
from typing import Any, Dict, List, Optional
import urllib.error
import urllib.parse
import urllib.request

from database._core import VALID_STREAMS, _connect, _from_jsonb, _now_iso, _sb_request, _supabase_key, log


def _scoped_id(workspace: Optional[str], raw_id: str) -> str:
    return f"{workspace}::{raw_id}" if workspace else raw_id


def _strip_id(scoped: str, workspace: Optional[str]) -> str:
    if workspace:
        prefix = f"{workspace}::"
        return scoped[len(prefix):] if scoped.startswith(prefix) else scoped
    return scoped


def get_stream(stream: str, workspace: Optional[str] = None) -> List[Dict[str, Any]]:
    if stream not in VALID_STREAMS:
        raise ValueError(f"Unsupported IRoom stream: {stream}")

    prefix = f"{workspace}::" if workspace else ""
    if _supabase_key():
        try:
            scope_filter = (
                f"record_id=like.{urllib.parse.quote(prefix + '*')}"
                if workspace
                else "record_id=not.like.*::*"
            )
            rows = _sb_request(
                "GET",
                "iroom_records",
                query=f"select=payload_json&stream=eq.{urllib.parse.quote(stream)}&{scope_filter}&order=sort_order.asc,record_id.asc",
            )
            if isinstance(rows, list):
                return [_from_jsonb(r["payload_json"]) for r in rows]
        except Exception:
            log.warning("Supabase: could not read an IRoom stream; using SQLite", exc_info=True)

    with _connect() as conn:
        if workspace:
            rows = conn.execute(
                "SELECT payload_json FROM iroom_records WHERE stream = ? AND substr(record_id, 1, ?) = ? ORDER BY sort_order ASC, rowid ASC",
                (stream, len(prefix), prefix),
            ).fetchall()
        else:
            rows = conn.execute(
                "SELECT payload_json FROM iroom_records WHERE stream = ? AND instr(record_id, '::') = 0 ORDER BY sort_order ASC, rowid ASC",
                (stream,),
            ).fetchall()
        return [json.loads(r["payload_json"]) for r in rows]


def upsert_stream_records(
    stream: str,
    records: List[Dict[str, Any]],
    replace: bool = False,
    workspace: Optional[str] = None,
) -> int:
    if stream not in VALID_STREAMS:
        raise ValueError(f"Unsupported IRoom stream: {stream}")
    now = _now_iso()
    prefix = f"{workspace}::" if workspace else ""
    sb_rows: List[Dict[str, Any]] = []

    with _connect() as conn:
        if replace:
            if workspace:
                conn.execute(
                    "DELETE FROM iroom_records WHERE stream = ? AND substr(record_id, 1, ?) = ?",
                    (stream, len(prefix), prefix),
                )
            else:
                conn.execute("DELETE FROM iroom_records WHERE stream = ? AND instr(record_id, '::') = 0", (stream,))
        for idx, rec in enumerate(records):
            raw_rid = str(
                rec.get("id")
                or rec.get("partNumber")
                or rec.get("projectCode")
                or rec.get("dwgNumber")
                or rec.get("poNumber")
                or rec.get("machineId")
                or f"{stream}-{idx + 1}"
            )
            rid = _scoped_id(workspace, raw_rid)
            payload = {**rec, "id": rec.get("id") or raw_rid}
            conn.execute(
                """
                INSERT INTO iroom_records (stream, record_id, sort_order, payload_json, updated_at)
                VALUES (?, ?, ?, ?, ?)
                ON CONFLICT(stream, record_id) DO UPDATE SET
                    payload_json = excluded.payload_json,
                    updated_at = excluded.updated_at
                """,
                (stream, rid, idx, json.dumps(payload), now),
            )
            sb_rows.append({
                "stream": stream,
                "record_id": rid,
                "sort_order": idx,
                "payload_json": payload,
                "updated_at": now,
            })

    if _supabase_key():
        try:
            if replace:
                scope_filter = (
                    f"record_id=like.{urllib.parse.quote(prefix + '*')}"
                    if workspace
                    else "record_id=not.like.*::*"
                )
                _sb_request("DELETE", "iroom_records", query=f"stream=eq.{urllib.parse.quote(stream)}&{scope_filter}")
            if sb_rows:
                _sb_request(
                    "POST",
                    "iroom_records",
                    query="on_conflict=stream,record_id",
                    body=sb_rows,
                    prefer="resolution=merge-duplicates,return=minimal",
                )
        except Exception:
            log.warning("Supabase: could not write IRoom records; kept in SQLite only", exc_info=True)

    return len(records)


def clear_stream_records(workspace: str) -> None:
    """Delete every user-scoped IRoom record belonging to `workspace`."""
    prefix = f"{workspace}::"
    with _connect() as conn:
        conn.execute("DELETE FROM iroom_records WHERE substr(record_id, 1, ?) = ?", (len(prefix), prefix))
    if _supabase_key():
        try:
            _sb_request("DELETE", "iroom_records", query=f"record_id=like.{urllib.parse.quote(prefix + '*')}")
        except Exception:
            log.warning("Supabase: could not clear IRoom records for %s", workspace, exc_info=True)


def get_sops(workspace: Optional[str] = None) -> List[Dict[str, Any]]:
    prefix = f"{workspace}::" if workspace else ""
    if _supabase_key():
        try:
            scope_filter = (
                f"doc_code=like.{urllib.parse.quote(prefix + '*')}"
                if workspace
                else "doc_code=not.like.*::*"
            )
            rows = _sb_request(
                "GET",
                "sop_documents",
                query=f"select=doc_code,title,clause,keywords_json,excerpt&{scope_filter}&order=doc_code.asc",
            )
            if isinstance(rows, list):
                return [
                    {
                        "doc_code": _strip_id(r["doc_code"], workspace),
                        "title": r["title"],
                        "clause": r["clause"],
                        "keywords": _from_jsonb(r["keywords_json"]),
                        "excerpt": r["excerpt"],
                    }
                    for r in rows
                ]
        except Exception:
            log.warning("Supabase: could not read SOP documents; using SQLite", exc_info=True)

    with _connect() as conn:
        if workspace:
            rows = conn.execute(
                "SELECT doc_code, title, clause, keywords_json, excerpt FROM sop_documents WHERE substr(doc_code, 1, ?) = ? ORDER BY rowid ASC",
                (len(prefix), prefix),
            ).fetchall()
        else:
            rows = conn.execute(
                "SELECT doc_code, title, clause, keywords_json, excerpt FROM sop_documents WHERE instr(doc_code, '::') = 0 ORDER BY rowid ASC"
            ).fetchall()
        return [
            {
                "doc_code": _strip_id(r["doc_code"], workspace),
                "title": r["title"],
                "clause": r["clause"],
                "keywords": json.loads(r["keywords_json"]),
                "excerpt": r["excerpt"],
            }
            for r in rows
        ]


def upsert_sop(doc: Dict[str, Any], workspace: Optional[str] = None) -> Dict[str, Any]:
    keywords = [str(k).strip().lower() for k in doc.get("keywords", []) if str(k).strip()]
    clean_code = str(doc["doc_code"]).strip()
    scoped_code = _scoped_id(workspace, clean_code)
    saved = {
        "doc_code": clean_code,
        "title": str(doc["title"]).strip(),
        "clause": str(doc["clause"]).strip(),
        "keywords": keywords,
        "excerpt": str(doc["excerpt"]).strip(),
    }
    now = _now_iso()

    with _connect() as conn:
        conn.execute(
            """
            INSERT INTO sop_documents (doc_code, title, clause, keywords_json, excerpt, updated_at)
            VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT(doc_code, clause) DO UPDATE SET
                title = excluded.title,
                keywords_json = excluded.keywords_json,
                excerpt = excluded.excerpt,
                updated_at = excluded.updated_at
            """,
            (
                scoped_code,
                saved["title"],
                saved["clause"],
                json.dumps(saved["keywords"]),
                saved["excerpt"],
                now,
            ),
        )

    if _supabase_key():
        try:
            _sb_request(
                "POST",
                "sop_documents",
                query="on_conflict=doc_code,clause",
                body={
                    "doc_code": scoped_code,
                    "title": saved["title"],
                    "clause": saved["clause"],
                    "keywords_json": saved["keywords"],
                    "excerpt": saved["excerpt"],
                    "updated_at": now,
                },
                prefer="resolution=merge-duplicates,return=minimal",
            )
        except Exception:
            log.warning("Supabase: could not save an SOP document; kept in SQLite only", exc_info=True)

    return saved


def clear_sops(workspace: str) -> None:
    """Delete every user-scoped SOP clause belonging to `workspace`."""
    prefix = f"{workspace}::"
    with _connect() as conn:
        conn.execute("DELETE FROM sop_documents WHERE substr(doc_code, 1, ?) = ?", (len(prefix), prefix))
    if _supabase_key():
        try:
            _sb_request("DELETE", "sop_documents", query=f"doc_code=like.{urllib.parse.quote(prefix + '*')}")
        except Exception:
            log.warning("Supabase: could not clear SOP documents for %s", workspace, exc_info=True)
