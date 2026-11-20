"""Firebase ID token verification, so users signed in with Firebase Auth can call the API.

A token is accepted only if it is an RS256 JWT signed by one of Google's securetoken keys, issued
for FIREBASE_PROJECT_ID (aud) by https://securetoken.google.com/<project> (iss), unexpired, and
carries a uid and an email. With FIREBASE_PROJECT_ID unset, Firebase tokens are never accepted.
"""

import logging
import os
import threading
import time
from typing import Any, Dict, Optional, Tuple

import jwt
from jwt import PyJWKClient

import database

log = logging.getLogger("mdip.firebase_auth")

JWKS_URL = "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"
PLANT_ROLES = {u["role"] for u in database.INITIAL_USERS}
DEFAULT_ROLE = "Operations Manager"

_jwks_client: Optional[PyJWKClient] = None
_cache: Dict[Tuple[str, str], Tuple[Dict[str, Any], float]] = {}
_lock = threading.Lock()


def project_id() -> str:
    return os.environ.get("FIREBASE_PROJECT_ID", "").strip()


def _signing_key(token: str):
    global _jwks_client
    if _jwks_client is None:
        _jwks_client = PyJWKClient(JWKS_URL, cache_keys=True, lifespan=3600, timeout=5)
    return _jwks_client.get_signing_key_from_jwt(token).key


def verify_id_token(token: str) -> Optional[Dict[str, Any]]:
    """Verified Firebase claims, or None if this is not a valid Firebase ID token for our project."""
    project = project_id()
    if not project or token.count(".") != 2:
        return None
    try:
        claims = jwt.decode(
            token,
            _signing_key(token),
            algorithms=["RS256"],
            audience=project,
            issuer=f"https://securetoken.google.com/{project}",
            options={"require": ["exp", "iat", "sub", "aud", "iss"]},
            leeway=60,
        )
    except Exception as exc:  # any failure means "not a valid Firebase token"
        log.info("Rejected Firebase token: %s", exc.__class__.__name__)
        return None
    if not claims.get("sub") or not claims.get("email"):
        return None
    return claims


def user_from_claims(claims: Dict[str, Any], requested_role: Optional[str]) -> Dict[str, Any]:
    """The backend user for a Firebase account (created on first use), with the role the user picked.

    Roles are self-selected at sign-up in this app, so the role the client reports (X-MDIP-Role) is
    applied when it is one of the plant roles; otherwise the stored role (or the default) is kept.
    """
    email = str(claims["email"]).strip().lower()
    role = requested_role if requested_role in PLANT_ROLES else ""
    key = (str(claims["sub"]), role)
    now = time.time()
    with _lock:
        hit = _cache.get(key)
        if hit and hit[1] > now:
            return hit[0]

    existing = database.get_user_by_email(email)
    if existing and (not role or existing.get("role") == role):
        user = existing
    else:
        name = str(claims.get("name") or "").strip() or email.split("@", 1)[0]
        user = database.upsert_google_user(email, name, role or (existing or {}).get("role") or DEFAULT_ROLE)
    public = {"id": user["id"], "email": user["email"], "name": user.get("name", ""), "role": user["role"]}
    with _lock:
        _cache[key] = (public, now + 600)
    return public


def clear_cache() -> None:
    with _lock:
        _cache.clear()
