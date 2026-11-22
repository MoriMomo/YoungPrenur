"""IRoom telemetry streams and the SOP knowledge base.
"""

import json
from typing import Any, Dict, List
import urllib.error
import urllib.parse
import urllib.request

from database._core import VALID_STREAMS, _connect, _from_jsonb, _now_iso, _sb_request, _supabase_key, log


def get_stream(stream: str) -> List[Dict[str, Any]]:
    if stream not in VALID_STREAMS:
        raise ValueError(f"Unsupported IRoom stream: {stream}")

    if _supabase_key():
        try:
            rows = _sb_request(
                "GET",
                "iroom_records",
                query=f"select=payload_json&stream=eq.{urllib.parse.quote(stream)}&order=sort_order.asc,record_id.asc",
            )
            if isinstance(rows, list):
                return [_from_jsonb(r["payload_json"]) for r in rows]
        except Exception:
            log.warning("Supabase: could not read an IRoom stream; using SQLite", exc_info=True)

    with _connect() as conn:
        rows = conn.execute(
            "SELECT payload_json FROM iroom_records WHERE stream = ? ORDER BY sort_order ASC, rowid ASC",
            (stream,),
        ).fetchall()
        return [json.loads(r["payload_json"]) for r in rows]


def upsert_stream_records(stream: str, records: List[Dict[str, Any]], replace: bool = False) -> int:
    if stream not in VALID_STREAMS:
        raise ValueError(f"Unsupported IRoom stream: {stream}")
    now = _now_iso()
    sb_rows: List[Dict[str, Any]] = []

    with _connect() as conn:
        if replace:
            conn.execute("DELETE FROM iroom_records WHERE stream = ?", (stream,))
        for idx, rec in enumerate(records):
            rid = str(
                rec.get("id")
                or rec.get("partNumber")
                or rec.get("projectCode")
                or rec.get("dwgNumber")
                or rec.get("poNumber")
                or rec.get("machineId")
                or f"{stream}-{idx + 1}"
            )
            payload = {**rec, "id": rec.get("id") or rid}
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
                _sb_request("DELETE", "iroom_records", query=f"stream=eq.{urllib.parse.quote(stream)}")
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


def get_sops() -> List[Dict[str, Any]]:
    if _supabase_key():
        try:
            rows = _sb_request(
                "GET",
                "sop_documents",
                query="select=doc_code,title,clause,keywords_json,excerpt&order=doc_code.asc",
            )
            if isinstance(rows, list):
                return [
                    {
                        "doc_code": r["doc_code"],
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
        rows = conn.execute(
            "SELECT doc_code, title, clause, keywords_json, excerpt FROM sop_documents ORDER BY rowid ASC"
        ).fetchall()
        return [
            {
                "doc_code": r["doc_code"],
                "title": r["title"],
                "clause": r["clause"],
                "keywords": json.loads(r["keywords_json"]),
                "excerpt": r["excerpt"],
            }
            for r in rows
        ]


def upsert_sop(doc: Dict[str, Any]) -> Dict[str, Any]:
    keywords = [str(k).strip().lower() for k in doc.get("keywords", []) if str(k).strip()]
    saved = {
        "doc_code": str(doc["doc_code"]).strip(),
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
                saved["doc_code"],
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
                    "doc_code": saved["doc_code"],
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
