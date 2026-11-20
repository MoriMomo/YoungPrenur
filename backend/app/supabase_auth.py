"""Verify Supabase user sessions with the configured project's signing keys."""

import os
from functools import lru_cache
from uuid import UUID

import jwt
from fastapi import HTTPException

from app.firebase_auth import DEFAULT_ROLE, PLANT_ROLES


@lru_cache(maxsize=2)
def signing_keys(issuer):
    return jwt.PyJWKClient(f"{issuer}/.well-known/jwks.json", timeout=5)


def supabase_user(token):
    url = os.environ.get("SUPABASE_URL", "").rstrip("/")
    if not url or token.count(".") != 2:
        return None
    issuer = url + "/auth/v1"
    try:
        # Unverified issuer is used only to select the configured verifier.
        if jwt.decode(token, options={"verify_signature": False}).get("iss") != issuer:
            return None
        key = signing_keys(issuer).get_signing_key_from_jwt(token).key
        claims = jwt.decode(token, key, algorithms=["ES256", "RS256"], issuer=issuer,
                            audience="authenticated", options={"require": ["sub", "exp", "iat"]})
        uid = str(UUID(claims["sub"]))
        if claims.get("role") != "authenticated" or not claims.get("email") or claims.get("is_anonymous"):
            raise ValueError("Expected a signed-in account")
    except jwt.PyJWKClientConnectionError as exc:
        raise HTTPException(503, "Sign-in verification temporarily unavailable.") from exc
    except (jwt.PyJWTError, ValueError, TypeError, AttributeError) as exc:
        raise HTTPException(401, "Invalid or expired session.") from exc

    # Only administrators can set app_metadata. Never link identities by email.
    links = claims.get("app_metadata") or {}
    profile = claims.get("user_metadata") or {}
    role = profile.get("role")
    return {
        "id": links.get("mdip_user_id") or f"supabase:{uid}",
        "supabase_uid": uid,
        "firebase_uid": links.get("mdip_firebase_uid"),
        "email": claims["email"],
        "name": profile.get("full_name") or claims["email"],
        "role": role if isinstance(role, str) and role in PLANT_ROLES else DEFAULT_ROLE,
    }
