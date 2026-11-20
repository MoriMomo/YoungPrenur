"""Firebase ID tokens: accepted only when signed, unexpired and issued for our project."""

import os
import sys
import time
import unittest
from unittest.mock import patch

import jwt
from cryptography.hazmat.primitives.asymmetric import rsa

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from tests.test_api_security import SecurityTestBase  # noqa: E402

import database  # noqa: E402
from app import firebase_auth  # noqa: E402

PROJECT = "mdip-test-project"
KEY = rsa.generate_private_key(public_exponent=65537, key_size=2048)
OTHER_KEY = rsa.generate_private_key(public_exponent=65537, key_size=2048)


def make_token(key=KEY, **overrides):
    now = int(time.time())
    claims = {
        "iss": f"https://securetoken.google.com/{PROJECT}",
        "aud": PROJECT,
        "sub": "firebase-uid-1",
        "email": "rina.qa@example.com",
        "name": "Rina QA",
        "iat": now,
        "exp": now + 3600,
    }
    claims.update(overrides)
    claims = {k: v for k, v in claims.items() if v is not None}
    return jwt.encode(claims, key, algorithm="RS256", headers={"kid": "test-kid"})


class TestFirebaseTokens(SecurityTestBase):
    def setUp(self):
        super().setUp()
        firebase_auth.clear_cache()
        self._env_patch = patch.dict(os.environ, {"FIREBASE_PROJECT_ID": PROJECT})
        self._env_patch.start()
        self._key_patch = patch.object(firebase_auth, "_signing_key", return_value=KEY.public_key())
        self._key_patch.start()

    def tearDown(self):
        self._key_patch.stop()
        self._env_patch.stop()
        super().tearDown()

    def get(self, token, role=None):
        headers = {"Authorization": f"Bearer {token}"}
        if role:
            headers["X-MDIP-Role"] = role
        return self.client.get("/api/v1/risks/prediction", headers=headers)

    def test_valid_token_is_accepted_and_user_created_with_role(self):
        self.assertEqual(self.get(make_token(), role="Quality Manager").status_code, 200)
        user = database.get_user_by_email("rina.qa@example.com")
        self.assertEqual(user["role"], "Quality Manager")

    def test_sign_off_records_the_firebase_users_role(self):
        headers = {"Authorization": f"Bearer {make_token()}", "X-MDIP-Role": "Plant Manager"}
        res = self.client.post("/api/v1/risks/decisions/flag", headers=headers, json={"action_id": "ACT-FB-1"})
        self.assertEqual(res.status_code, 200, res.text)
        self.assertEqual(res.json()["reviewer"], "Plant Manager")

    def test_unknown_role_falls_back_to_default(self):
        self.assertEqual(self.get(make_token(sub="uid-2", email="x@example.com"), role="Admin").status_code, 200)
        self.assertEqual(database.get_user_by_email("x@example.com")["role"], firebase_auth.DEFAULT_ROLE)

    def test_bad_tokens_are_rejected(self):
        cases = {
            "wrong project": make_token(aud="someone-else"),
            "wrong issuer": make_token(iss="https://securetoken.google.com/someone-else"),
            "expired": make_token(iat=int(time.time()) - 7200, exp=int(time.time()) - 3600),
            "no email": make_token(email=None),
            "wrong signing key": make_token(key=OTHER_KEY),
        }
        for label, token in cases.items():
            with self.subTest(label):
                self.assertEqual(self.get(token).status_code, 401)

    def test_firebase_tokens_rejected_without_project_configured(self):
        with patch.dict(os.environ, {"FIREBASE_PROJECT_ID": ""}):
            self.assertEqual(self.get(make_token()).status_code, 401)


if __name__ == "__main__":
    unittest.main()
