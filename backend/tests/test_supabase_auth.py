"""Supabase sessions use the project's verified subject and admin-owned migration links."""
import os
import time
import unittest
from unittest.mock import Mock, patch
from uuid import uuid4

import jwt
from cryptography.hazmat.primitives.asymmetric import ec
from fastapi import HTTPException

from app.security import decision_reviewer, decision_workspace
from app.supabase_auth import supabase_user


class SupabaseSessionTests(unittest.TestCase):
    def setUp(self):
        self.url = "https://example.supabase.co"
        self.uid = str(uuid4())
        self.key = ec.generate_private_key(ec.SECP256R1())
        self.enterContext(patch.dict(os.environ, {"SUPABASE_URL": self.url}))
        keys = self.enterContext(patch("app.supabase_auth.signing_keys"))
        keys.return_value.get_signing_key_from_jwt.return_value = Mock(key=self.key.public_key())

    def token(self, **overrides):
        now = int(time.time())
        claims = {"iss": self.url + "/auth/v1", "aud": "authenticated", "sub": self.uid,
                  "iat": now, "exp": now + 3600, "email": "operator@example.com", "role": "authenticated"}
        return jwt.encode({**claims, **overrides}, self.key, algorithm="ES256")

    def test_new_workspace_and_reviewer(self):
        user = supabase_user(self.token(user_metadata={"mdip_user_id": "other", "mdip_firebase_uid": "other"}))
        self.assertEqual(decision_workspace(user), "supabase:" + self.uid)
        with patch("app.security.PRODUCTION", True), patch.dict(os.environ, {"MDIP_DECISION_REVIEWERS": "{}"}):
            with self.assertRaises(HTTPException):
                decision_reviewer(user)

    def test_linked_workspace(self):
        user = supabase_user(self.token(app_metadata={"mdip_user_id": "legacy", "mdip_firebase_uid": "old-uid"}))
        self.assertEqual(user["id"], "legacy")
        self.assertEqual(decision_workspace(user), decision_workspace({"firebase_uid": "old-uid"}))

    def test_invalid_claims_and_signature(self):
        for overrides in ({"aud": "other"}, {"exp": 1}, {"role": "service_role"}, {"is_anonymous": True}):
            with self.subTest(overrides=overrides), self.assertRaises(HTTPException):
                supabase_user(self.token(**overrides))
        self.key = ec.generate_private_key(ec.SECP256R1())
        with self.assertRaises(HTTPException):
            supabase_user(self.token())
