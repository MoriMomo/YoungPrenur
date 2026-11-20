"""Users, password hashing and signed session tokens.
"""

import base64
import hashlib
import hmac
import json
import os
import secrets
import time
from typing import Any, Dict, Optional
import urllib.error
import urllib.parse
import urllib.request

from database._core import _connect, _now_iso, _sb_request, _supabase_key, log


DEFAULT_DEMO_PASSWORD = os.environ.get("MDIP_DEMO_PASSWORD", "imajin2026")


_DEV_AUTH_SECRET = "mdip-local-dev-auth-secret-change-in-prod"


def _is_production() -> bool:
    return bool(os.environ.get("RENDER")) or os.environ.get("MDIP_ENV", "").lower() == "production"


def _auth_secret() -> bytes:
    """Session signing key. Fails closed in production: the public dev default would let anyone forge tokens."""
    secret = os.environ.get("MDIP_AUTH_SECRET", "").strip()
    if secret:
        if _is_production() and len(secret) < 32:
            raise RuntimeError("MDIP_AUTH_SECRET must be at least 32 characters in production.")
        return secret.encode("utf-8")
    if _is_production():
        raise RuntimeError("MDIP_AUTH_SECRET is not set; refusing to sign sessions with the development secret.")
    return _DEV_AUTH_SECRET.encode("utf-8")


def assert_auth_configured() -> None:
    """Call at startup so a misconfigured production deployment fails fast instead of at first sign-in."""
    _auth_secret()


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
            log.warning("Supabase: could not look up a user; using SQLite", exc_info=True)

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

    if _supabase_key():
        try:
            _sb_request(
                "POST",
                "users",
                query="on_conflict=email",
                body=record,
                prefer="resolution=merge-duplicates,return=minimal",
            )
        except Exception as exc:
            raise RuntimeError(f"Failed to save account to Supabase users table: {exc}") from exc

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

    return _public_user(record)


def authenticate_user(email: str, password: str) -> Optional[Dict[str, Any]]:
    row = get_user_by_email(email)
    if not row:
        return None
    if not verify_password(password, row["salt"], row["password_hash"]):
        return None
    return _public_user(row)


def upsert_google_user(email: str, name: str, role: str) -> Dict[str, Any]:
    """Find or create a verified Google Sign-In user and apply the selected plant role."""
    norm = email.strip().lower()
    clean_role = role.strip() or "Operations Manager"
    clean_name = name.strip() or norm.split("@", 1)[0]
    existing = get_user_by_email(norm)
    if not existing:
        return create_user(norm, secrets.token_urlsafe(32), clean_name, clean_role)

    updated_name = clean_name or existing.get("name") or norm.split("@", 1)[0]
    if _supabase_key():
        try:
            _sb_request(
                "PATCH",
                "users",
                query=f"email=eq.{urllib.parse.quote(norm)}",
                body={"role": clean_role, "name": updated_name},
                prefer="return=minimal",
            )
        except Exception as exc:
            raise RuntimeError(f"Failed to sync Google account to Supabase users table: {exc}") from exc

    with _connect() as conn:
        conn.execute(
            "UPDATE users SET role = ?, name = ? WHERE email = ?",
            (clean_role, updated_name, norm),
        )
    return _public_user({**existing, "role": clean_role, "name": updated_name})
