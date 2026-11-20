"""Shared plumbing: .env loading, paths, the SQLite connection and Supabase PostgREST requests.
"""

from contextlib import contextmanager
from datetime import datetime, timezone
import json
import logging
import os
import sqlite3
import threading
from typing import Any, Dict, Optional
import urllib.error
import urllib.parse
import urllib.request


log = logging.getLogger("mdip.database")


BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


DATA_DIR = os.path.join(BASE_DIR, "data")


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
        "sqlite_path": _db_path(),
        "error": error,
    }


@contextmanager
def _connect():
    path = _db_path()
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with _DB_LOCK:
        conn = sqlite3.connect(path, timeout=15.0, check_same_thread=False)
        conn.row_factory = sqlite3.Row
        try:
            conn.execute("PRAGMA journal_mode=WAL;")
            yield conn
            conn.commit()
        finally:
            conn.close()

def _db_path() -> str:
    """The SQLite file in use; read from the package so `database.DB_PATH = ...` takes effect."""
    import database

    return database.DB_PATH
