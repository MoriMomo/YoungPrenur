"""Authentication & user sessions (/api/v1/auth/...).
"""

import hmac
import json
import os
import time
import urllib.parse
import urllib.request
from typing import Dict

from fastapi import APIRouter, Depends, HTTPException, Request

import database
from app.schemas import GoogleAuthPayload, LoginPayload, RegisterPayload
from app.security import client_ip, login_failures, registrations, require_user

router = APIRouter()

PLANT_ROLES = {u["role"] for u in database.INITIAL_USERS}


@router.post("/api/v1/auth/register")
def register_user(payload: RegisterPayload, request: Request):
    ip = client_ip(request)
    registrations.check(ip)
    email = payload.email.strip().lower()
    if "@" not in email or "." not in email.split("@", 1)[1]:
        raise HTTPException(status_code=422, detail="Please enter a valid work email address.")
    if len(payload.password) < 6:
        raise HTTPException(status_code=422, detail="Password must be at least 6 characters long.")
    if payload.role not in PLANT_ROLES:
        raise HTTPException(status_code=422, detail="Choose one of the listed plant roles.")
    registrations.hit(ip)
    try:
        user = database.create_user(email, payload.password, payload.name, payload.role)
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc))
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail=str(exc))
    token = database.create_session_token(user)
    return {
        "success": True,
        "token": token,
        "user": user,
        "storage": database.db_status()["active_engine"],
    }


@router.post("/api/v1/auth/login")
def login_user(payload: LoginPayload, request: Request):
    key = f"{client_ip(request)}|{payload.email.strip().lower()}"
    login_failures.check(key)
    user = database.authenticate_user(payload.email, payload.password)
    if not user:
        login_failures.hit(key)
        raise HTTPException(status_code=401, detail="Invalid email or password.")
    login_failures.reset(key)
    token = database.create_session_token(user)
    return {
        "success": True,
        "token": token,
        "user": user,
        "storage": database.db_status()["active_engine"],
    }


@router.get("/api/v1/auth/me")
def current_user(user: dict = Depends(require_user)):
    return {"authenticated": True, "user": user}


def _verify_google_id_token(id_token: str) -> Dict[str, str]:
    """Verify a Google Identity Services ID token against GOOGLE_CLIENT_ID."""
    expected_client_id = os.environ.get("GOOGLE_CLIENT_ID", "").strip()
    if not expected_client_id:
        raise HTTPException(
            status_code=503,
            detail="Google Sign-In is not configured on the server (set GOOGLE_CLIENT_ID).",
        )
    token = (id_token or "").strip()
    if not token:
        raise HTTPException(status_code=401, detail="Invalid or expired Google ID token.")

    # shortcut: uses Google tokeninfo endpoint to avoid extra google-auth deps; switch to local JWKS above ~10 logins/s
    url = f"https://oauth2.googleapis.com/tokeninfo?id_token={urllib.parse.quote(token)}"
    try:
        req = urllib.request.Request(url, method="GET")
        with urllib.request.urlopen(req, timeout=6) as resp:
            data = json.loads(resp.read().decode("utf-8"))
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired Google ID token.")

    aud = str(data.get("aud") or "")
    iss = str(data.get("iss") or "")
    verified = str(data.get("email_verified") or "").lower() == "true"
    try:
        exp = int(data.get("exp") or 0)
    except (TypeError, ValueError):
        exp = 0
    email = str(data.get("email") or "").strip().lower()

    if (
        not email
        or not verified
        or not hmac.compare_digest(aud, expected_client_id)
        or iss not in {"accounts.google.com", "https://accounts.google.com"}
        or exp <= int(time.time())
    ):
        raise HTTPException(status_code=401, detail="Invalid or expired Google ID token.")

    name = str(data.get("name") or "").strip() or email.split("@", 1)[0]
    return {"email": email, "name": name}


@router.get("/api/v1/auth/google/config")
def google_auth_config():
    client_id = os.environ.get("GOOGLE_CLIENT_ID", "").strip()
    return {"enabled": bool(client_id), "client_id": client_id or None}


@router.post("/api/v1/auth/google")
def google_login(payload: GoogleAuthPayload):
    if payload.role not in PLANT_ROLES:
        raise HTTPException(status_code=422, detail="Choose one of the listed plant roles.")
    info = _verify_google_id_token(payload.id_token)
    try:
        user = database.upsert_google_user(info["email"], info["name"], payload.role)
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail=str(exc))
    token = database.create_session_token(user)
    return {
        "success": True,
        "token": token,
        "user": user,
        "provider": "google",
        "storage": database.db_status()["active_engine"],
    }
