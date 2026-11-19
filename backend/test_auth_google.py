"""Unit tests for Google Identity Services authentication in MDIP backend."""

import io
import json
import os
import sys
import tempfile
import time
import unittest
from unittest.mock import patch

from fastapi import HTTPException

_TMP_DIR = tempfile.TemporaryDirectory()
os.environ.setdefault("MDIP_DB_PATH", os.path.join(_TMP_DIR.name, "test_auth.db"))

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import database  # noqa: E402
import main  # noqa: E402


class _MockHttpResp:
    def __init__(self, payload: dict):
        self._buf = io.BytesIO(json.dumps(payload).encode("utf-8"))

    def read(self) -> bytes:
        return self._buf.getvalue()

    def __enter__(self):
        return self

    def __exit__(self, *args):
        return False


class TestGoogleAuth(unittest.TestCase):
    CLIENT_ID = "123456-test.apps.googleusercontent.com"

    def setUp(self):
        self._orig_db = database.DB_PATH
        self._tmp = tempfile.TemporaryDirectory()
        database.DB_PATH = os.path.join(self._tmp.name, "google_auth.db")
        database.init_db()
        self._orig_cid = os.environ.get("GOOGLE_CLIENT_ID")
        os.environ["GOOGLE_CLIENT_ID"] = self.CLIENT_ID

    def tearDown(self):
        database.DB_PATH = self._orig_db
        if self._orig_cid is None:
            os.environ.pop("GOOGLE_CLIENT_ID", None)
        else:
            os.environ["GOOGLE_CLIENT_ID"] = self._orig_cid
        self._tmp.cleanup()

    def _valid_claims(self, **overrides):
        claims = {
            "aud": self.CLIENT_ID,
            "iss": "https://accounts.google.com",
            "email": "Rina.Engineer@imajin.id",
            "email_verified": "true",
            "name": "Rina Engineer",
            "exp": str(int(time.time()) + 3600),
        }
        claims.update(overrides)
        return claims

    def test_missing_client_id_returns_503(self):
        os.environ.pop("GOOGLE_CLIENT_ID", None)
        with self.assertRaises(HTTPException) as ctx:
            main.google_login(main.GoogleAuthPayload(id_token="tok", role="Plant Manager"))
        self.assertEqual(ctx.exception.status_code, 503)

    def test_valid_google_login_upserts_and_updates_role(self):
        with patch("main.urllib.request.urlopen", return_value=_MockHttpResp(self._valid_claims())):
            res = main.google_login(main.GoogleAuthPayload(id_token="good.jwt.token", role="Quality Manager"))
        self.assertTrue(res["success"])
        self.assertEqual(res["provider"], "google")
        self.assertEqual(res["user"]["email"], "rina.engineer@imajin.id")
        self.assertEqual(res["user"]["role"], "Quality Manager")
        verified = database.verify_session_token(res["token"])
        self.assertIsNotNone(verified)
        self.assertEqual(verified["role"], "Quality Manager")

        with patch("main.urllib.request.urlopen", return_value=_MockHttpResp(self._valid_claims())):
            res2 = main.google_login(main.GoogleAuthPayload(id_token="good.jwt.token", role="Operations Manager"))
        self.assertEqual(res2["user"]["role"], "Operations Manager")

    def test_wrong_audience_rejected_401(self):
        bad = self._valid_claims(aud="other-app.apps.googleusercontent.com")
        with patch("main.urllib.request.urlopen", return_value=_MockHttpResp(bad)):
            with self.assertRaises(HTTPException) as ctx:
                main.google_login(main.GoogleAuthPayload(id_token="bad.aud", role="Plant Manager"))
        self.assertEqual(ctx.exception.status_code, 401)

    def test_unverified_email_rejected_401(self):
        bad = self._valid_claims(email_verified="false")
        with patch("main.urllib.request.urlopen", return_value=_MockHttpResp(bad)):
            with self.assertRaises(HTTPException) as ctx:
                main.google_login(main.GoogleAuthPayload(id_token="unverified", role="Plant Manager"))
        self.assertEqual(ctx.exception.status_code, 401)

    def test_expired_token_rejected_401(self):
        bad = self._valid_claims(exp=str(int(time.time()) - 10))
        with patch("main.urllib.request.urlopen", return_value=_MockHttpResp(bad)):
            with self.assertRaises(HTTPException) as ctx:
                main.google_login(main.GoogleAuthPayload(id_token="expired", role="Plant Manager"))
        self.assertEqual(ctx.exception.status_code, 401)


if __name__ == "__main__":
    unittest.main()
