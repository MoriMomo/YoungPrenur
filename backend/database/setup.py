"""Schema creation and seeding of SQLite (and Supabase when it is empty).
"""

import json
import sqlite3
from typing import Any, Dict, Tuple
import urllib.error
import urllib.parse
import urllib.request

from seed_data import INITIAL_IROOM_DATA, INITIAL_SOPS, INITIAL_USERS

from database._core import _connect, _from_jsonb, _now_iso, _sb_request, _supabase_key, log
from database.accounts import DEFAULT_DEMO_PASSWORD, _hash_password


def _seed_supabase_if_empty() -> None:
    if not _supabase_key():
        return
    try:
        now = _now_iso()
        existing_iroom = _sb_request("GET", "iroom_records", query="select=record_id&limit=1", timeout=3.0)
        if isinstance(existing_iroom, list) and len(existing_iroom) == 0:
            rows = []
            for stream, items in INITIAL_IROOM_DATA.items():
                for idx, item in enumerate(items):
                    rid = str(item.get("id") or f"{stream}-{idx + 1}")
                    rows.append({
                        "stream": stream,
                        "record_id": rid,
                        "sort_order": idx,
                        "payload_json": item,
                        "updated_at": now,
                    })
            if rows:
                _sb_request(
                    "POST",
                    "iroom_records",
                    query="on_conflict=stream,record_id",
                    body=rows,
                    prefer="resolution=merge-duplicates,return=minimal",
                )

        existing_sops = _sb_request("GET", "sop_documents", query="select=doc_code&limit=1", timeout=3.0)
        if isinstance(existing_sops, list) and len(existing_sops) == 0:
            sop_rows = [
                {
                    "doc_code": doc["doc_code"],
                    "title": doc["title"],
                    "clause": doc["clause"],
                    "keywords_json": doc.get("keywords", []),
                    "excerpt": doc["excerpt"],
                    "updated_at": now,
                }
                for doc in INITIAL_SOPS
            ]
            if sop_rows:
                _sb_request(
                    "POST",
                    "sop_documents",
                    query="on_conflict=doc_code",
                    body=sop_rows,
                    prefer="resolution=merge-duplicates,return=minimal",
                )

        existing_users = _sb_request("GET", "users", query="select=id&limit=1", timeout=3.0)
        if isinstance(existing_users, list) and len(existing_users) == 0:
            with _connect() as conn:
                local_users = conn.execute(
                    "SELECT id, email, name, role, password_hash, salt, created_at FROM users"
                ).fetchall()
            if local_users:
                _sb_request(
                    "POST",
                    "users",
                    query="on_conflict=email",
                    body=[dict(r) for r in local_users],
                    prefer="resolution=merge-duplicates,return=minimal",
                )
        _sync_demo_user_emails_to_supabase()
    except Exception:
        # Supabase unreachable or schema not applied yet; local SQLite handles requests cleanly.
        log.warning("Supabase: seeding baseline data failed; SQLite still has it", exc_info=True)


def _ensure_demo_users(conn: sqlite3.Connection) -> None:
    """
    Make sure every demo persona in seed_data.INITIAL_USERS exists with its current email.
    Accounts are matched by their fixed id (usr-ops, ...), so an email change in seed_data
    (e.g. @imajin.id -> @mdip.id) updates existing databases in place, keeping the password.
    """
    now = _now_iso()
    for usr in INITIAL_USERS:
        row = conn.execute("SELECT email FROM users WHERE id = ?", (usr["id"],)).fetchone()
        if row is None:
            taken = conn.execute("SELECT 1 FROM users WHERE email = ?", (usr["email"],)).fetchone()
            if taken:
                continue
            pw_hash, salt = _hash_password(DEFAULT_DEMO_PASSWORD)
            conn.execute(
                "INSERT INTO users (id, email, name, role, password_hash, salt, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
                (usr["id"], usr["email"], usr["name"], usr["role"], pw_hash, salt, now),
            )
        elif row[0] != usr["email"]:
            taken = conn.execute(
                "SELECT 1 FROM users WHERE email = ? AND id <> ?", (usr["email"], usr["id"])
            ).fetchone()
            if not taken:
                conn.execute("UPDATE users SET email = ? WHERE id = ?", (usr["email"], usr["id"]))


def _sync_demo_user_emails_to_supabase() -> None:
    """Apply demo-persona email changes to Supabase rows that already exist (matched by id)."""
    for usr in INITIAL_USERS:
        try:
            _sb_request(
                "PATCH",
                "users",
                query=f"id=eq.{urllib.parse.quote(usr['id'])}&email=neq.{urllib.parse.quote(usr['email'])}",
                body={"email": usr["email"]},
                prefer="return=minimal",
                timeout=3.0,
            )
        except Exception:
            # Missing row, unique-email clash or Supabase offline: leave that account unchanged.
            log.warning("Supabase: could not sync a demo user's email", exc_info=True)
            continue


# Sample names used before the seed data was made generic. Databases created earlier still hold
# them; seeded rows that carry one are replaced with the current seed (user-added rows are left alone).
_RETIRED_SAMPLE_NAMES = (
    "Metalindo", "Fastener Global", "Nippon Steel", "Boeing", "Dirgantara", "PTDI",
    "Hyundai", "Kalbe", "IMJ-", "DMG-MORI", "KOMATSU", "SODICK",
)


def _seed_records_by_key() -> Dict[Tuple[str, str], Tuple[int, Dict[str, Any]]]:
    return {
        (stream, str(item.get("id") or f"{stream}-{idx + 1}")): (idx, item)
        for stream, items in INITIAL_IROOM_DATA.items()
        for idx, item in enumerate(items)
    }


def _has_retired_names(payload_text: str) -> bool:
    return any(name in payload_text for name in _RETIRED_SAMPLE_NAMES)


def _refresh_retired_seed_records(conn: sqlite3.Connection) -> int:
    """SQLite: replace seeded IRoom rows that still carry retired sample names. Returns rows refreshed."""
    seeds = _seed_records_by_key()
    now = _now_iso()
    refreshed = 0
    for row in conn.execute("SELECT stream, record_id, payload_json FROM iroom_records").fetchall():
        seed = seeds.get((row["stream"], row["record_id"]))
        if seed and _has_retired_names(row["payload_json"]):
            conn.execute(
                "UPDATE iroom_records SET payload_json = ?, updated_at = ? WHERE stream = ? AND record_id = ?",
                (json.dumps(seed[1]), now, row["stream"], row["record_id"]),
            )
            refreshed += 1
    if refreshed:
        log.info("Refreshed %d seeded IRoom records that still carried retired sample names", refreshed)
    return refreshed


def _refresh_retired_seed_records_supabase() -> None:
    """Supabase: the same refresh for rows already stored there."""
    if not _supabase_key():
        return
    try:
        rows = _sb_request("GET", "iroom_records", query="select=stream,record_id,payload_json", timeout=3.0)
    except Exception:
        log.warning("Supabase: could not check IRoom records for retired sample names", exc_info=True)
        return
    if not isinstance(rows, list):
        return
    seeds = _seed_records_by_key()
    now = _now_iso()
    stale = []
    for row in rows:
        key = (str(row.get("stream")), str(row.get("record_id")))
        seed = seeds.get(key)
        if seed and _has_retired_names(json.dumps(_from_jsonb(row.get("payload_json")))):
            idx, item = seed
            stale.append({"stream": key[0], "record_id": key[1], "sort_order": idx, "payload_json": item, "updated_at": now})
    if not stale:
        return
    try:
        _sb_request(
            "POST",
            "iroom_records",
            query="on_conflict=stream,record_id",
            body=stale,
            prefer="resolution=merge-duplicates,return=minimal",
        )
        log.info("Supabase: refreshed %d seeded IRoom records that still carried retired sample names", len(stale))
    except Exception:
        log.warning("Supabase: could not refresh IRoom records with retired sample names", exc_info=True)


def init_db() -> None:
    """Create local SQLite schema tables, seed baseline records, and seed Supabase if ready."""
    with _connect() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS active_schedule (
                id INTEGER PRIMARY KEY CHECK (id = 1),
                filename TEXT NOT NULL,
                project_name TEXT NOT NULL,
                analysis_json TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS user_schedules (
                user_id TEXT PRIMARY KEY,
                filename TEXT NOT NULL,
                project_name TEXT NOT NULL,
                analysis_json TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS iroom_records (
                stream TEXT NOT NULL,
                record_id TEXT NOT NULL,
                sort_order INTEGER NOT NULL DEFAULT 0,
                payload_json TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                PRIMARY KEY (stream, record_id)
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS sop_documents (
                doc_code TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                clause TEXT NOT NULL,
                keywords_json TEXT NOT NULL,
                excerpt TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS decision_status (
                action_id TEXT PRIMARY KEY,
                flagged INTEGER NOT NULL DEFAULT 1,
                status TEXT NOT NULL,
                decision TEXT NOT NULL,
                reviewer_role TEXT NOT NULL,
                notes TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS audit_log (
                id TEXT PRIMARY KEY,
                action_id TEXT NOT NULL,
                action_title TEXT NOT NULL,
                decision TEXT NOT NULL,
                reviewer_role TEXT NOT NULL,
                notes TEXT NOT NULL,
                sop_ref TEXT NOT NULL,
                timestamp TEXT NOT NULL
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                email TEXT UNIQUE NOT NULL,
                name TEXT NOT NULL,
                role TEXT NOT NULL,
                password_hash TEXT NOT NULL,
                salt TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
            """
        )

        count_iroom = conn.execute("SELECT COUNT(*) FROM iroom_records").fetchone()[0]
        if count_iroom == 0:
            now = _now_iso()
            for stream, items in INITIAL_IROOM_DATA.items():
                for idx, item in enumerate(items):
                    rid = str(item.get("id") or f"{stream}-{idx + 1}")
                    conn.execute(
                        "INSERT INTO iroom_records (stream, record_id, sort_order, payload_json, updated_at) VALUES (?, ?, ?, ?, ?)",
                        (stream, rid, idx, json.dumps(item), now),
                    )

        count_sops = conn.execute("SELECT COUNT(*) FROM sop_documents").fetchone()[0]
        if count_sops == 0:
            now = _now_iso()
            for doc in INITIAL_SOPS:
                conn.execute(
                    "INSERT INTO sop_documents (doc_code, title, clause, keywords_json, excerpt, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
                    (
                        doc["doc_code"],
                        doc["title"],
                        doc["clause"],
                        json.dumps(doc.get("keywords", [])),
                        doc["excerpt"],
                        now,
                    ),
                )

        _ensure_demo_users(conn)
        # Uploads used to be written into the shared IRoom progress stream; they are per user now.
        conn.execute("DELETE FROM iroom_records WHERE stream = 'progress' AND record_id = 'prj-active'")
        _refresh_retired_seed_records(conn)

    _seed_supabase_if_empty()
    _refresh_retired_seed_records_supabase()
