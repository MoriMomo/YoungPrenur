"""
API access control: bearer-token users, simple in-memory rate limits, CORS origins.

Rules
- Every /api/v1 route requires a valid session token, except: health, sign-in/register,
  the public model card, and the anonymous schedule *inspection* preview.
- Who did something (e.g. who signed off a decision) is taken from the token, never from
  the request body.
"""

import hashlib
import json
import os
import threading
import time
from collections import defaultdict, deque
from typing import Any, Deque, Dict, List, Optional

from fastapi import Header, HTTPException, Request

import database
from app.supabase_auth import supabase_user
from app import firebase_auth

PRODUCTION = bool(os.environ.get("RENDER")) or os.environ.get("MDIP_ENV", "").lower() == "production"

DEFAULT_CORS_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3100",
    "http://127.0.0.1:3100",
]


def cors_origins() -> List[str]:
    """Allowed browser origins; override with MDIP_CORS_ORIGINS (comma-separated)."""
    raw = os.environ.get("MDIP_CORS_ORIGINS", "").strip()
    if not raw:
        return DEFAULT_CORS_ORIGINS
    return [o.strip().rstrip("/") for o in raw.split(",") if o.strip()]


def require_user(
    authorization: Optional[str] = Header(None),
    x_mdip_role: Optional[str] = Header(None),
) -> Dict[str, Any]:
    """FastAPI dependency: the signed-in user from `Authorization: Bearer <token>`, else 401.

    Accepts an MDIP session token or a Firebase ID token for FIREBASE_PROJECT_ID.
    """
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(
            status_code=401,
            detail="Sign in required.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token = authorization.split(" ", 1)[1].strip()
    user = database.verify_session_token(token) or supabase_user(token)
    if not user:
        claims = firebase_auth.verify_id_token(token)
        if claims:
            return {**firebase_auth.user_from_claims(claims, x_mdip_role), "firebase_uid": claims["sub"]}
        raise HTTPException(
            status_code=401,
            detail="Your session has expired. Please sign in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user


def decision_workspace(user: Dict[str, Any]) -> str:
    firebase_uid = user.get("firebase_uid")
    if firebase_uid:
        return "firebase-" + hashlib.sha256(firebase_uid.encode()).hexdigest()
    return user["id"]


def decision_reviewer(user: Dict[str, Any]) -> tuple[str, str]:
    firebase_uid = user.get("firebase_uid")
    identity = f"firebase:{firebase_uid}" if firebase_uid else f"mdip:{user['id']}"
    if user.get("supabase_uid") and not firebase_uid and user["id"] == f"supabase:{user['supabase_uid']}":
        identity = user["id"]
    try:
        grants = json.loads(os.environ.get("MDIP_DECISION_REVIEWERS", "{}"))
    except ValueError:
        grants = {}
    role = grants.get(identity) if isinstance(grants, dict) else None
    if isinstance(role, str) and role in firebase_auth.PLANT_ROLES:
        return identity, role
    if not PRODUCTION and not os.environ.get("MDIP_DECISION_REVIEWERS"):
        return identity, user["role"]
    raise HTTPException(status_code=403, detail="Your account is not assigned a decision reviewer role.")


def external_ai_allowed(x_mdip_deployment: Optional[str] = Header(None)) -> bool:
    """False in on-premises mode (`X-MDIP-Deployment: internal`): never call Gemini for that request."""
    return (x_mdip_deployment or "").strip().lower() != "internal"


def client_ip(request: Request) -> str:
    """Caller IP; trusts the first X-Forwarded-For hop only when running behind a proxy (production)."""
    if PRODUCTION:
        forwarded = request.headers.get("x-forwarded-for", "")
        if forwarded:
            return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


class RateLimiter:
    """Sliding-window limiter kept in process memory (enough for a single-instance deployment)."""

    def __init__(self, max_events: int, window_seconds: float):
        self.max_events = max_events
        self.window = window_seconds
        self._events: Dict[str, Deque[float]] = defaultdict(deque)
        self._lock = threading.Lock()

    def _prune(self, key: str, now: float) -> Deque[float]:
        q = self._events[key]
        while q and now - q[0] > self.window:
            q.popleft()
        return q

    def check(self, key: str) -> None:
        """Raise 429 if the key has used up its allowance (does not record an event)."""
        with self._lock:
            q = self._prune(key, time.monotonic())
            if len(q) >= self.max_events:
                retry = max(1, int(self.window - (time.monotonic() - q[0])))
                raise HTTPException(
                    status_code=429,
                    detail=f"Too many attempts. Try again in {retry} seconds.",
                    headers={"Retry-After": str(retry)},
                )

    def hit(self, key: str) -> None:
        with self._lock:
            self._prune(key, time.monotonic()).append(time.monotonic())

    def reset(self, key: Optional[str] = None) -> None:
        with self._lock:
            if key is None:
                self._events.clear()
            else:
                self._events.pop(key, None)


# Failed sign-ins per IP+email, account creation per IP, anonymous inspections per IP.
login_failures = RateLimiter(max_events=5, window_seconds=600)
registrations = RateLimiter(max_events=5, window_seconds=3600)
inspections = RateLimiter(max_events=20, window_seconds=600)
