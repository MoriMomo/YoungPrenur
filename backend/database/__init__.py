"""
Dual-engine persistence layer for MDIP backend: Supabase Postgres (PostgREST) + SQLite fallback.

Reads `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` from `backend/.env` or environment variables.
When Supabase credentials and schema are available, operational state is persisted to Supabase
Postgres and mirrored to local SQLite (`backend/data/mdip.db`). Otherwise it runs against SQLite alone.

Modules: _core (connections, Supabase requests), accounts (users, passwords, session tokens),
setup (schema and seeding), schedules (baseline and per-user analyses), plant_data (IRoom
streams and SOPs), decisions (sign-off statuses and the audit log).

`DB_PATH` lives here so tests and scripts can repoint it with `database.DB_PATH = ...`.
"""

import os

from database._core import (  # noqa: E402
    BASE_DIR,
    DATA_DIR,
    DEFAULT_SUPABASE_URL,
    SUPABASE_PROJECT_REF,
    VALID_STREAMS,
    db_status,
)

# The SQLite file; tests and scripts repoint it with `database.DB_PATH = ...` (see _core._db_path).
# On Vercel only /tmp is writable (and is wiped between cold starts); set SUPABASE_SERVICE_ROLE_KEY to keep data.
DB_PATH = os.environ.get("MDIP_DB_PATH") or os.path.join("/tmp" if os.environ.get("VERCEL") else DATA_DIR, "mdip.db")

from database.accounts import (  # noqa: E402
    DEFAULT_DEMO_PASSWORD,
    assert_auth_configured,
    authenticate_user,
    create_session_token,
    create_user,
    get_user_by_email,
    upsert_google_user,
    verify_password,
    verify_session_token,
)
from database.decisions import (  # noqa: E402
    clear_decision_statuses,
    get_audit_log,
    get_decision_statuses,
    record_decision_flag,
)
from database.plant_data import (  # noqa: E402
    get_sops,
    get_stream,
    upsert_sop,
    upsert_stream_records,
)
from database.schedules import (  # noqa: E402
    delete_user_analysis,
    load_active_analysis,
    load_user_analysis,
    save_active_analysis,
    save_user_analysis,
)
from database.setup import (  # noqa: E402
    init_db,
)
from seed_data import INITIAL_IROOM_DATA, INITIAL_SOPS, INITIAL_USERS  # noqa: E402

__all__ = [
    "BASE_DIR",
    "DATA_DIR",
    "DB_PATH",
    "DEFAULT_DEMO_PASSWORD",
    "DEFAULT_SUPABASE_URL",
    "INITIAL_IROOM_DATA",
    "INITIAL_SOPS",
    "INITIAL_USERS",
    "SUPABASE_PROJECT_REF",
    "VALID_STREAMS",
    "assert_auth_configured",
    "authenticate_user",
    "clear_decision_statuses",
    "create_session_token",
    "create_user",
    "db_status",
    "delete_user_analysis",
    "get_audit_log",
    "get_decision_statuses",
    "get_sops",
    "get_stream",
    "get_user_by_email",
    "init_db",
    "load_active_analysis",
    "load_user_analysis",
    "record_decision_flag",
    "save_active_analysis",
    "save_user_analysis",
    "upsert_google_user",
    "upsert_sop",
    "upsert_stream_records",
    "verify_password",
    "verify_session_token",
]
