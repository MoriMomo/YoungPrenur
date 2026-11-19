"""
Dual-engine persistence layer for MDIP backend: Supabase Postgres (PostgREST) + SQLite fallback.

Reads `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` from `backend/.env` or environment variables.
When Supabase credentials and schema are available, operational state is persisted to Supabase
Postgres and mirrored to local SQLite (`backend/data/mdip.db`). Otherwise it runs seamlessly
against SQLite alone.
"""

import base64
from contextlib import contextmanager
from datetime import datetime, timezone
import hashlib
import hmac
import json
import os
import secrets
import sqlite3
import threading
import time
from typing import Any, Dict, List, Optional
import urllib.error
import urllib.parse
import urllib.request

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")
DB_PATH = os.environ.get("MDIP_DB_PATH", os.path.join(DATA_DIR, "mdip.db"))
DEFAULT_SUPABASE_URL = "https://mkurfdbznwhgocecombq.supabase.co"
SUPABASE_PROJECT_REF = "mkurfdbznwhgocecombq"
_DB_LOCK = threading.Lock()


def _load_dotenv_files() -> None:
    """Populate unset environment variables from backend/.env or repo .env without extra dependencies."""
    candidates = [
        os.path.join(BASE_DIR, ".env"),
        os.path.join(os.path.dirname(BASE_DIR), ".env"),
    ]
    for path in candidates:
        if not os.path.isfile(path):
            continue
        with open(path, encoding="utf-8") as f:
            for raw in f:
                line = raw.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                k, v = line.split("=", 1)
                k = k.strip()
                v = v.strip().strip('"').strip("'")
                if k and k not in os.environ:
                    os.environ[k] = v


_load_dotenv_files()

VALID_STREAMS = ("materials", "progress", "drawings", "quotations", "operations")

INITIAL_IROOM_DATA: Dict[str, List[Dict[str, Any]]] = {
    "materials": [
        {
            "id": "mat-01",
            "partNumber": "INGOT-AL7075-T6",
            "description": "Aerospace Grade 7075 Aluminum Round Bar 120mm",
            "supplier": "PT Metalindo Perkasa Steel",
            "eta": "Tomorrow, 14:00 WIB",
            "stockCoverHours": 36,
            "supplierLeadDays": 3,
            "status": "Critical",
            "riskScore": 0.88,
            "openPo": "PO-2026-IMJ-0891",
        },
        {
            "id": "mat-02",
            "partNumber": "FASTENER-TI-M6",
            "description": "Titanium Alloy Hex Socket Cap Screws M6x25",
            "supplier": "Fastener Global Solution Pte",
            "eta": "16 Oct 2026",
            "stockCoverHours": 72,
            "supplierLeadDays": 5,
            "status": "At Risk",
            "riskScore": 0.62,
            "openPo": "PO-2026-IMJ-0894",
        },
        {
            "id": "mat-03",
            "partNumber": "STEEL-SKD11-PL",
            "description": "Cold-Work Tool Steel Plate 35mm Pre-machined",
            "supplier": "Nippon Steel Indonesia Dist.",
            "eta": "18 Oct 2026",
            "stockCoverHours": 140,
            "supplierLeadDays": 7,
            "status": "Normal",
            "riskScore": 0.15,
            "openPo": "PO-2026-IMJ-0888",
        },
    ],
    "progress": [
        {
            "id": "prj-01",
            "projectCode": "PRJ-AERO-2026",
            "name": "Boeing 737 Cargo Door Bracket Tooling",
            "customer": "PT Dirgantara Indonesia (PTDI)",
            "currentMilestone": "CNC 5-Axis Rough Machining",
            "progressPercent": 64,
            "targetCompletion": "28 Oct 2026",
            "delayVarianceDays": 3.5,
            "status": "Critical Risk",
        },
        {
            "id": "prj-02",
            "projectCode": "PRJ-AUTO-409",
            "name": "EV Battery Enclosure Extrusion Stamping Die",
            "customer": "Hyundai Motor Manufacturing",
            "currentMilestone": "Wire EDM Profile Slicing",
            "progressPercent": 78,
            "targetCompletion": "22 Oct 2026",
            "delayVarianceDays": 1.0,
            "status": "Delayed",
        },
        {
            "id": "prj-03",
            "projectCode": "PRJ-MED-102",
            "name": "Surgical Titanium Implant Molding Core",
            "customer": "Kalbe Farma Precision",
            "currentMilestone": "CMM Metrology Final FAT",
            "progressPercent": 92,
            "targetCompletion": "19 Oct 2026",
            "delayVarianceDays": 0,
            "status": "On Schedule",
        },
    ],
    "drawings": [
        {
            "id": "dwg-01",
            "dwgNumber": "DWG-2026-04-REV-C",
            "title": "Upper Stamping Punch Geometry & Clearance",
            "revision": "Rev C.2",
            "engineer": "Hendra Wijaya, ST",
            "department": "Tooling R&D",
            "submittedDate": "13 Oct 2026 14:15",
            "status": "Pending Review",
            "criticalDwg": True,
        },
        {
            "id": "dwg-02",
            "dwgNumber": "DWG-2026-02-REV-B",
            "title": "Base Die Fixture Cooling Channel Routing",
            "revision": "Rev B.0",
            "engineer": "Siti Rahma, MT",
            "department": "CAD/CAM Engineering",
            "submittedDate": "12 Oct 2026 09:30",
            "status": "Approved",
            "criticalDwg": False,
        },
        {
            "id": "dwg-03",
            "dwgNumber": "DWG-2026-07-REV-A",
            "title": "EDM Electrode Holder Electrode Pattern",
            "revision": "Rev A.1",
            "engineer": "Agus Pratama",
            "department": "Machining Prep",
            "submittedDate": "14 Oct 2026 08:00",
            "status": "Revision Needed",
            "criticalDwg": False,
        },
    ],
    "quotations": [
        {
            "id": "po-01",
            "poNumber": "PO-2026-IMJ-0891",
            "quotationRef": "QTN-MET-2026-442",
            "vendorName": "PT Metalindo Perkasa Steel",
            "totalValueIdr": "Rp 148.500.000",
            "status": "PO Issued",
            "paymentTerm": "Net 30 Days",
            "expedited": True,
        },
        {
            "id": "po-02",
            "poNumber": "PO-2026-IMJ-0894",
            "quotationRef": "QTN-FST-2026-108",
            "vendorName": "Fastener Global Solution Pte",
            "totalValueIdr": "Rp 64.200.000",
            "status": "Pending Approval",
            "paymentTerm": "CBD (Advance 50%)",
            "expedited": True,
        },
        {
            "id": "po-03",
            "poNumber": "PO-2026-IMJ-0888",
            "quotationRef": "QTN-NP-2026-902",
            "vendorName": "Nippon Steel Indonesia Dist.",
            "totalValueIdr": "Rp 312.000.000",
            "status": "PO Issued",
            "paymentTerm": "Net 45 Days",
            "expedited": False,
        },
    ],
    "operations": [
        {
            "id": "op-01",
            "workCenter": "CNC Milling Cell 01",
            "machineId": "DMG-MORI-NLX2500",
            "operator": "Budi Santoso (Cert L2)",
            "shift": "Shift 1 (Morning)",
            "oeePercent": 88.5,
            "spindleUtilization": 94.2,
            "vibrationSensor": "NORMAL",
            "activeJob": "PRJ-AERO-2026 / WBS-1.2",
        },
        {
            "id": "op-02",
            "workCenter": "Hydraulic Press Stamping",
            "machineId": "KOMATSU-PRESS-P07",
            "operator": "Fajar Nugraha",
            "shift": "Shift 1 (Morning)",
            "oeePercent": 68.2,
            "spindleUtilization": 62.0,
            "vibrationSensor": "ELEVATED",
            "activeJob": "PRJ-AUTO-409 / Stamping Die Prep",
        },
        {
            "id": "op-03",
            "workCenter": "Wire EDM Cell 03",
            "machineId": "SODICK-ALC600G",
            "operator": "Rudi Hermawan (Cert L3)",
            "shift": "Shift 1 (Morning)",
            "oeePercent": 95.8,
            "spindleUtilization": 98.0,
            "vibrationSensor": "NORMAL",
            "activeJob": "PRJ-AUTO-409 / WBS-1.3",
        },
    ],
}

INITIAL_SOPS: List[Dict[str, Any]] = [
    {
        "doc_code": "SOP-PRS-04",
        "title": "Hydraulic Stamping & Press P-07 Operating Protocol",
        "clause": "Clause 3.2: Vibration Thresholds",
        "keywords": ["press", "p-07", "vibration", "hydraulic", "stamping", "maintenance", "changeover", "die"],
        "excerpt": (
            "If the vibration index exceeds baseline by more than +15%, immediate condition inspection "
            "of hydraulic seals, bearings, and load cells is mandatory before commencing the next stamping cycle."
        ),
    },
    {
        "doc_code": "SOP-SCM-12",
        "title": "Critical Component Shortage & Express Procurement",
        "clause": "Clause 2.1: Buffer Inventory Warning",
        "keywords": ["shortage", "m-204", "al7075", "ingot", "procurement", "supplier", "freight", "inventory", "po", "material"],
        "excerpt": (
            "When buffer stock falls below 48 hours and supplier lead time exceeds 48 hours, the Supply Chain Lead "
            "is authorized to trigger express air freight (pre-approved up to Rp 25M)."
        ),
    },
    {
        "doc_code": "SOP-LINE2-OPT",
        "title": "Assembly Cell Line Balancing & Operator Reallocation",
        "clause": "Clause 1.4: Throughput Variance Trigger",
        "keywords": ["line 2", "cell 02", "rebalance", "operator", "throughput", "shift", "lagging", "assembly", "cnc", "machining"],
        "excerpt": (
            "If cell attainment falls below 90% of shift target for more than 2 consecutive hours, transfer one "
            "Level-2 cross-trained operator from an adjacent balanced cell."
        ),
    },
    {
        "doc_code": "SOP-ENG-02",
        "title": "Engineering Change Order (ECO) & Drawing Approval",
        "clause": "Clause 2.3: Expedited Turnaround",
        "keywords": ["drawing", "cad", "cam", "approval", "dwg-2026-04", "revision", "gdt", "engineering", "sign-off"],
        "excerpt": (
            "Critical path drawing revisions must be reviewed by the Lead Tooling Engineer within 4 working hours "
            "and validated with CMM metrology."
        ),
    },
]

INITIAL_USERS: List[Dict[str, str]] = [
    {"id": "usr-ops", "email": "ops.lead@imajin.id", "name": "Budi Santoso", "role": "Operations Manager"},
    {"id": "usr-plant", "email": "plant.manager@imajin.id", "name": "Hendra Wijaya", "role": "Plant Manager"},
    {"id": "usr-prod", "email": "production.supervisor@imajin.id", "name": "Agus H.", "role": "Production Supervisor"},
    {"id": "usr-maint", "email": "maintenance.lead@imajin.id", "name": "Fajar Nugraha", "role": "Maintenance Lead"},
    {"id": "usr-qa", "email": "quality.manager@imajin.id", "name": "Siti Rahma", "role": "Quality Manager"},
    {"id": "usr-scm", "email": "supply.chain.lead@imajin.id", "name": "Rina Wijaya", "role": "Supply Chain Lead"},
]
DEFAULT_DEMO_PASSWORD = os.environ.get("MDIP_DEMO_PASSWORD", "imajin2026")


def _auth_secret() -> bytes:
    secret = os.environ.get("MDIP_AUTH_SECRET") or "mdip-local-dev-auth-secret-change-in-prod"
    return secret.encode("utf-8")


def _hash_password(password: str, salt_hex: Optional[str] = None) -> tuple[str, str]:
    salt = bytes.fromhex(salt_hex) if salt_hex else secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 200_000).hex()
    return digest, salt.hex()


def verify_password(password: str, salt_hex: str, expected_hash: str) -> bool:
    actual_hash, _ = _hash_password(password, salt_hex=salt_hex)
    return hmac.compare_digest(actual_hash, expected_hash)


def _b64_encode(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).rstrip(b"=").decode("ascii")


def _b64_decode(val: str) -> bytes:
    pad = "=" * (-len(val) % 4)
    return base64.urlsafe_b64decode(val + pad)


def create_session_token(user: Dict[str, Any], ttl_hours: int = 24) -> str:
    """Mint an HMAC-SHA256 signed bearer session token."""
    payload = {
        "sub": user["id"],
        "email": user["email"],
        "name": user["name"],
        "role": user["role"],
        "exp": int(time.time()) + ttl_hours * 3600,
    }
    body = _b64_encode(json.dumps(payload, separators=(",", ":")).encode("utf-8"))
    sig = _b64_encode(hmac.new(_auth_secret(), body.encode("ascii"), hashlib.sha256).digest())
    return f"{body}.{sig}"


def verify_session_token(token: str) -> Optional[Dict[str, Any]]:
    """Verify HMAC signature and expiry of a bearer token; return user claims or None."""
    try:
        body, sig = token.split(".", 1)
        expected = _b64_encode(hmac.new(_auth_secret(), body.encode("ascii"), hashlib.sha256).digest())
        if not hmac.compare_digest(sig, expected):
            return None
        claims = json.loads(_b64_decode(body).decode("utf-8"))
        if int(claims.get("exp", 0)) < int(time.time()):
            return None
        return {
            "id": claims["sub"],
            "email": claims["email"],
            "name": claims["name"],
            "role": claims["role"],
        }
    except Exception:
        return None


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def _supabase_url() -> str:
    return os.environ.get("SUPABASE_URL", DEFAULT_SUPABASE_URL).rstrip("/")


def _supabase_key() -> str:
    return (
        os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
        or os.environ.get("SUPABASE_SECRET_KEY")
        or os.environ.get("SUPABASE_KEY")
        or os.environ.get("SUPABASE_ANON_KEY")
        or ""
    ).strip()


def _from_jsonb(value: Any) -> Any:
    if isinstance(value, (dict, list)):
        return value
    if isinstance(value, str):
        return json.loads(value)
    return value


def _sb_request(
    method: str,
    path: str,
    query: Optional[str] = None,
    body: Any = None,
    prefer: Optional[str] = None,
    timeout: float = 5.0,
) -> Any:
    key = _supabase_key()
    if not key:
        raise RuntimeError("Supabase API key is not configured.")
    url = f"{_supabase_url()}/rest/v1/{path}"
    if query:
        url = f"{url}?{query}"

    headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Accept": "application/json",
    }
    data: Optional[bytes] = None
    if body is not None:
        headers["Content-Type"] = "application/json"
        data = json.dumps(body).encode("utf-8")
    if prefer:
        headers["Prefer"] = prefer

    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            raw = resp.read().decode("utf-8").strip()
            return json.loads(raw) if raw else None
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8", errors="replace").strip()
        raise RuntimeError(f"Supabase HTTP {e.code}: {err_body}") from e


def db_status() -> Dict[str, Any]:
    """Check whether Supabase PostgREST is configured and reachable, or report SQLite fallback."""
    url = _supabase_url()
    key = _supabase_key()
    connected = False
    error: Optional[str] = None

    if key:
        try:
            _sb_request("GET", "active_schedule", query="select=id&limit=1", timeout=3.0)
            connected = True
        except Exception as exc:
            error = str(exc)

    return {
        "active_engine": "supabase_postgres" if connected else "sqlite_local",
        "supabase_url": url,
        "supabase_project_ref": SUPABASE_PROJECT_REF,
        "supabase_key_configured": bool(key),
        "supabase_connected": connected,
        "sqlite_path": DB_PATH,
        "error": error,
    }


@contextmanager
def _connect():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    with _DB_LOCK:
        conn = sqlite3.connect(DB_PATH, timeout=15.0, check_same_thread=False)
        conn.row_factory = sqlite3.Row
        try:
            conn.execute("PRAGMA journal_mode=WAL;")
            yield conn
            conn.commit()
        finally:
            conn.close()


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
    except Exception:
        # Supabase unreachable or schema not applied yet; local SQLite handles requests cleanly.
        pass


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

        count_users = conn.execute("SELECT COUNT(*) FROM users").fetchone()[0]
        if count_users == 0:
            now = _now_iso()
            for usr in INITIAL_USERS:
                pw_hash, salt = _hash_password(DEFAULT_DEMO_PASSWORD)
                conn.execute(
                    "INSERT INTO users (id, email, name, role, password_hash, salt, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
                    (usr["id"], usr["email"], usr["name"], usr["role"], pw_hash, salt, now),
                )

    _seed_supabase_if_empty()


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
            pass


def load_active_analysis() -> Optional[Dict[str, Any]]:
    if _supabase_key():
        try:
            rows = _sb_request("GET", "active_schedule", query="select=analysis_json&id=eq.1&limit=1")
            if isinstance(rows, list):
                if rows:
                    return _from_jsonb(rows[0]["analysis_json"])
                return None
        except Exception:
            pass

    with _connect() as conn:
        row = conn.execute("SELECT analysis_json FROM active_schedule WHERE id = 1").fetchone()
        if row is None:
            return None
        return json.loads(row["analysis_json"])


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
            pass

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
            pass

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
            pass

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
            ON CONFLICT(doc_code) DO UPDATE SET
                title = excluded.title,
                clause = excluded.clause,
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
                query="on_conflict=doc_code",
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
            pass

    return saved


def get_decision_statuses() -> Dict[str, Dict[str, Any]]:
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
            pass

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


def clear_decision_statuses() -> None:
    with _connect() as conn:
        conn.execute("DELETE FROM decision_status")

    if _supabase_key():
        try:
            _sb_request("DELETE", "decision_status", query="action_id=not.is.null")
        except Exception:
            pass


def record_decision_flag(
    action_id: str,
    action_title: str,
    decision: str,
    reviewer_role: str,
    notes: str,
    sop_ref: str,
    timestamp: str,
) -> Dict[str, Any]:
    status_val = "overridden" if decision == "OVERRIDDEN" else "authorized"
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
            (action_id, status_val, decision, reviewer_role, notes, now),
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
                    "action_id": action_id,
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
            pass

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
            pass

    with _connect() as conn:
        rows = conn.execute(
            "SELECT id, action_id, action_title, decision, reviewer_role, notes, sop_ref, timestamp "
            "FROM audit_log ORDER BY rowid DESC"
        ).fetchall()
        return [dict(r) for r in rows]


def _public_user(row: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "id": row["id"],
        "email": row["email"],
        "name": row["name"],
        "role": row["role"],
    }


def get_user_by_email(email: str) -> Optional[Dict[str, Any]]:
    norm = email.strip().lower()
    if _supabase_key():
        try:
            rows = _sb_request(
                "GET",
                "users",
                query=f"select=id,email,name,role,password_hash,salt,created_at&email=eq.{urllib.parse.quote(norm)}&limit=1",
            )
            if isinstance(rows, list) and rows:
                return rows[0]
        except Exception:
            pass

    with _connect() as conn:
        row = conn.execute(
            "SELECT id, email, name, role, password_hash, salt, created_at FROM users WHERE email = ? LIMIT 1",
            (norm,),
        ).fetchone()
        return dict(row) if row else None


def create_user(email: str, password: str, name: str, role: str) -> Dict[str, Any]:
    norm = email.strip().lower()
    if get_user_by_email(norm):
        raise ValueError("An account with this email already exists.")

    uid = f"usr-{secrets.token_hex(6)}"
    pw_hash, salt = _hash_password(password)
    now = _now_iso()
    record = {
        "id": uid,
        "email": norm,
        "name": name.strip() or norm.split("@", 1)[0],
        "role": role.strip() or "Operations Manager",
        "password_hash": pw_hash,
        "salt": salt,
        "created_at": now,
    }

    with _connect() as conn:
        conn.execute(
            "INSERT INTO users (id, email, name, role, password_hash, salt, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
            (
                record["id"],
                record["email"],
                record["name"],
                record["role"],
                record["password_hash"],
                record["salt"],
                record["created_at"],
            ),
        )

    if _supabase_key():
        try:
            _sb_request(
                "POST",
                "users",
                query="on_conflict=email",
                body=record,
                prefer="resolution=merge-duplicates,return=minimal",
            )
        except Exception:
            pass

    return _public_user(record)


def authenticate_user(email: str, password: str) -> Optional[Dict[str, Any]]:
    row = get_user_by_email(email)
    if not row:
        return None
    if not verify_password(password, row["salt"], row["password_hash"]):
        return None
    return _public_user(row)
