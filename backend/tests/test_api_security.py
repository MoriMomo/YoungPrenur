"""Access-control tests: which routes need a signed-in user, rate limits, CORS and secret handling."""

import io
import os
import sys
import tempfile
import unittest
from unittest.mock import patch

_TMP_DIR = tempfile.TemporaryDirectory()
os.environ.setdefault("MDIP_DB_PATH", os.path.join(_TMP_DIR.name, "test_security.db"))

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from fastapi.testclient import TestClient  # noqa: E402

import database  # noqa: E402
from app import security, state  # noqa: E402
from main import app  # noqa: E402

DEMO_EMAIL = database.INITIAL_USERS[0]["email"]
DEMO_ROLE = database.INITIAL_USERS[0]["role"]
DEMO_PASSWORD = database.DEFAULT_DEMO_PASSWORD

PROTECTED_GETS = [
    "/api/v1/risks/prediction",
    "/api/v1/risks/decisions",
    "/api/v1/risks/audit-log",
    "/api/v1/scheduler/wbs",
    "/api/v1/iroom/overview",
    "/api/v1/iroom/materials",
    "/api/v1/dashboard/overview",
    "/api/v1/knowledge/docs",
    "/api/v1/copilot/status",
]
PROTECTED_POSTS = [
    ("/api/v1/risks/decisions/flag", {"action_id": "ACT-1"}),
    ("/api/v1/copilot/chat", {"query": "status", "role": "Operations Manager"}),
    ("/api/v1/knowledge/ingest", {"doc_code": "SOP-X", "title": "x", "content": "x"}),
    ("/api/v1/iroom/materials", {}),
    ("/api/copilot/ask", {"query": "status"}),
]
PUBLIC_GETS = ["/health", "/api/health", "/api/v1/ml/model-card", "/api/v1/auth/google/config"]

SAMPLE_CSV = (
    "Task Code,Task Name,Planned Duration,Actual Duration,Predecessors\n"
    "T1,Cut plate,2,3,\n"
    "T2,Weld frame,3,4,T1\n"
    "T3,Leak test,1,1,T2\n"
).encode("utf-8")


class SecurityTestBase(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls._env = patch.dict(os.environ, {}, clear=False)
        cls._env.start()
        for key in ("SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_SECRET_KEY", "SUPABASE_KEY", "SUPABASE_ANON_KEY", "GEMINI_API_KEY"):
            os.environ.pop(key, None)
        cls._orig_db = database.DB_PATH
        cls._tmp = tempfile.TemporaryDirectory()
        database.DB_PATH = os.path.join(cls._tmp.name, "security.db")
        database.init_db()
        cls.client = TestClient(app)

    @classmethod
    def tearDownClass(cls):
        database.DB_PATH = cls._orig_db
        cls._env.stop()
        cls._tmp.cleanup()

    def setUp(self):
        for limiter in (security.login_failures, security.registrations, security.inspections):
            limiter.reset()

    def login(self, email=DEMO_EMAIL, password=DEMO_PASSWORD):
        res = self.client.post("/api/v1/auth/login", json={"email": email, "password": password})
        self.assertEqual(res.status_code, 200, res.text)
        return {"Authorization": f"Bearer {res.json()['token']}"}


class TestProtectedRoutes(SecurityTestBase):
    def test_anonymous_requests_are_rejected(self):
        for path in PROTECTED_GETS:
            with self.subTest(path=path):
                res = self.client.get(path)
                self.assertEqual(res.status_code, 401)
                self.assertEqual(res.headers.get("www-authenticate"), "Bearer")
        for path, body in PROTECTED_POSTS:
            with self.subTest(path=path):
                self.assertEqual(self.client.post(path, json=body).status_code, 401)

    def test_anonymous_upload_is_rejected(self):
        files = {"file": ("plan.csv", io.BytesIO(SAMPLE_CSV), "text/csv")}
        self.assertEqual(self.client.post("/api/v1/scheduler/upload", files=files).status_code, 401)

    def test_bad_or_tampered_tokens_are_rejected(self):
        headers = self.login()
        tampered = headers["Authorization"][:-2] + ("aa" if not headers["Authorization"].endswith("aa") else "bb")
        for value in ("Bearer not-a-token", tampered, "Basic abc", headers["Authorization"].replace("Bearer ", "")):
            with self.subTest(value=value[:20]):
                res = self.client.get("/api/v1/risks/prediction", headers={"Authorization": value})
                self.assertEqual(res.status_code, 401)

    def test_signed_in_requests_succeed(self):
        headers = self.login()
        for path in PROTECTED_GETS:
            with self.subTest(path=path):
                self.assertEqual(self.client.get(path, headers=headers).status_code, 200)

    def test_public_routes_stay_open(self):
        for path in PUBLIC_GETS:
            with self.subTest(path=path):
                self.assertEqual(self.client.get(path).status_code, 200)


class TestDecisionSignOff(SecurityTestBase):
    def test_failed_audit_insert_rolls_back_status(self):
        from database._core import _connect

        headers = self.login()
        actions_url = "/api/v1/risks/decisions"
        action_id = self.client.get(actions_url, headers=headers).json()[0]["id"]
        with _connect() as conn:
            conn.execute(
                "CREATE TRIGGER fail_audit BEFORE INSERT ON audit_log "
                "BEGIN SELECT RAISE(ABORT, 'audit unavailable'); END"
            )
        try:
            res = self.client.post(f"{actions_url}/flag", headers=headers, json={"action_id": action_id})
            self.assertEqual(res.status_code, 503, res.text)
            actions = self.client.get(actions_url, headers=headers).json()
            self.assertFalse(next(action for action in actions if action["id"] == action_id)["flagged"])
        finally:
            with _connect() as conn:
                conn.execute("DROP TRIGGER fail_audit")

    def test_reviewer_role_comes_from_the_token(self):
        headers = self.login()
        action_id = self.client.get("/api/v1/risks/decisions", headers=headers).json()[0]["id"]
        res = self.client.post(
            "/api/v1/risks/decisions/flag",
            headers=headers,
            json={"action_id": action_id, "reviewer_role": "Plant Manager", "decision": "authorized"},
        )
        self.assertEqual(res.status_code, 200, res.text)
        self.assertEqual(res.json()["reviewer"], DEMO_ROLE)
        self.assertEqual(res.json()["decision"], "AUTHORIZED")
        log = self.client.get("/api/v1/risks/audit-log", headers=headers).json()
        entry = next(e for e in log if e["action_id"] == action_id)
        self.assertEqual(entry["reviewer_role"], DEMO_ROLE)

    def test_unknown_action_is_rejected(self):
        headers = self.login()
        res = self.client.post(
            "/api/v1/risks/decisions/flag", headers=headers, json={"action_id": "missing"},
        )
        self.assertEqual(res.status_code, 404, res.text)

    def test_unknown_decision_is_rejected(self):
        res = self.client.post(
            "/api/v1/risks/decisions/flag",
            headers=self.login(),
            json={"action_id": "ACT-SEC-2", "decision": "DELETE"},
        )
        self.assertEqual(res.status_code, 422)


class TestRateLimits(SecurityTestBase):
    def test_login_locks_after_repeated_failures(self):
        for _ in range(security.login_failures.max_events):
            res = self.client.post("/api/v1/auth/login", json={"email": DEMO_EMAIL, "password": "wrong-password"})
            self.assertEqual(res.status_code, 401)
        res = self.client.post("/api/v1/auth/login", json={"email": DEMO_EMAIL, "password": DEMO_PASSWORD})
        self.assertEqual(res.status_code, 429)
        self.assertIn("retry-after", {k.lower() for k in res.headers})

    def test_successful_login_clears_failures(self):
        for _ in range(security.login_failures.max_events - 1):
            self.client.post("/api/v1/auth/login", json={"email": DEMO_EMAIL, "password": "wrong-password"})
        self.login()
        res = self.client.post("/api/v1/auth/login", json={"email": DEMO_EMAIL, "password": "wrong-password"})
        self.assertEqual(res.status_code, 401)

    def test_register_rejects_unlisted_role(self):
        res = self.client.post(
            "/api/v1/auth/register",
            json={"email": "new.user@mdip.id", "password": "secret123", "name": "New User", "role": "Administrator"},
        )
        self.assertEqual(res.status_code, 422)

    def test_registration_is_rate_limited(self):
        for i in range(security.registrations.max_events):
            res = self.client.post(
                "/api/v1/auth/register",
                json={"email": f"reg{i}@mdip.id", "password": "secret123", "name": f"Reg {i}", "role": DEMO_ROLE},
            )
            self.assertEqual(res.status_code, 200, res.text)
        res = self.client.post(
            "/api/v1/auth/register",
            json={"email": "one.more@mdip.id", "password": "secret123", "name": "One More", "role": DEMO_ROLE},
        )
        self.assertEqual(res.status_code, 429)


class TestPublicInspection(SecurityTestBase):
    def test_inspection_scores_without_storing(self):
        before = dict(state.BASELINE_ANALYSIS)
        files = {"file": ("plan.csv", io.BytesIO(SAMPLE_CSV), "text/csv")}
        res = self.client.post("/api/v1/scheduler/inspect", files=files)
        self.assertEqual(res.status_code, 200, res.text)
        body = res.json()
        self.assertFalse(body["stored"])
        self.assertEqual(body["tasks_extracted"], 3)
        self.assertEqual(state.BASELINE_ANALYSIS, before)

    def test_invalid_dependencies_are_rejected(self):
        header = b"Code,Activity Name,Planned Duration,Predecessors\n"
        schedules = [
            (b"A,Cut,2,B\nB,Drill,1,A\n", "Circular task dependencies"),
            (b"A,Cut,2,A\n", "Circular task dependencies"),
            (b"A,Cut,2,missing\n", "unknown predecessor missing"),
            (b"A,Cut,2,\nA,Drill,1,\n", "Duplicate task IDs"),
        ]
        for rows, expected in schedules:
            with self.subTest(expected=expected):
                files = {"file": ("bad.csv", io.BytesIO(header + rows), "text/csv")}
                response = self.client.post("/api/v1/scheduler/inspect", files=files)
                self.assertEqual(response.status_code, 422, response.text)
                self.assertIn(expected, response.json()["detail"])

    def test_inspection_refuses_documents(self):
        for name in ("plan.pdf", "plan.docx"):
            with self.subTest(name=name):
                files = {"file": (name, io.BytesIO(b"%PDF-1.4 fake"), "application/octet-stream")}
                self.assertEqual(self.client.post("/api/v1/scheduler/inspect", files=files).status_code, 415)

    def test_inspection_size_limit(self):
        big = SAMPLE_CSV + b"x" * (2 * 1024 * 1024)
        files = {"file": ("plan.csv", io.BytesIO(big), "text/csv")}
        self.assertEqual(self.client.post("/api/v1/scheduler/inspect", files=files).status_code, 413)


class TestPerUserSchedules(SecurityTestBase):
    """One user's upload must not change what anyone else sees."""

    def _upload(self, headers, name="private_plan.csv"):
        files = {"file": (name, io.BytesIO(SAMPLE_CSV), "text/csv")}
        res = self.client.post("/api/v1/scheduler/upload", files=files, headers=headers)
        self.assertEqual(res.status_code, 200, res.text)

    def test_upload_is_private_to_the_uploader(self):
        alice = self.login()
        bob = self.login(email=database.INITIAL_USERS[1]["email"])
        baseline_tasks = len(self.client.get("/api/v1/scheduler/wbs", headers=bob).json())

        self._upload(alice)
        self.assertEqual(len(self.client.get("/api/v1/scheduler/wbs", headers=alice).json()), 3)
        self.assertEqual(len(self.client.get("/api/v1/scheduler/wbs", headers=bob).json()), baseline_tasks)
        self.assertEqual(self.client.get("/api/v1/risks/prediction", headers=alice).json()["filename"], "private_plan.csv")
        self.assertNotEqual(self.client.get("/api/v1/risks/prediction", headers=bob).json()["filename"], "private_plan.csv")

        alice_projects = [p["id"] for p in self.client.get("/api/v1/iroom/progress", headers=alice).json()]
        bob_projects = [p["id"] for p in self.client.get("/api/v1/iroom/progress", headers=bob).json()]
        self.assertIn("prj-active", alice_projects)
        self.assertNotIn("prj-active", bob_projects)

    def test_reload_without_file_returns_to_baseline(self):
        alice = self.login()
        self._upload(alice)
        res = self.client.post("/api/v1/scheduler/upload", headers=alice)
        self.assertEqual(res.status_code, 200, res.text)
        self.assertEqual(res.json()["filename"], state.BASELINE_ANALYSIS["filename"])
        self.assertIsNone(database.load_user_analysis(database.INITIAL_USERS[0]["id"]))

    def test_sign_offs_are_scoped_to_the_user(self):
        alice = self.login()
        bob = self.login(email=database.INITIAL_USERS[1]["email"])
        decisions = self.client.get("/api/v1/risks/decisions", headers=alice).json()
        self.assertTrue(decisions)
        action_id = decisions[0]["id"]
        res = self.client.post("/api/v1/risks/decisions/flag", headers=alice, json={"action_id": action_id})
        self.assertEqual(res.status_code, 200, res.text)
        alice_view = {d["id"]: d["flagged"] for d in self.client.get("/api/v1/risks/decisions", headers=alice).json()}
        bob_view = {d["id"]: d["flagged"] for d in self.client.get("/api/v1/risks/decisions", headers=bob).json()}
        self.assertTrue(alice_view[action_id])
        self.assertFalse(bob_view[action_id])
        self.assertEqual(self.client.get("/api/v1/risks/audit-log", headers=bob).json(), [])
        audit = self.client.get("/api/v1/risks/audit-log", headers=alice).json()
        self.assertEqual([entry["action_id"] for entry in audit], [action_id])


class TestOnPremisesHeader(SecurityTestBase):
    def test_header_turns_external_ai_off(self):
        self.assertFalse(security.external_ai_allowed("internal"))
        self.assertTrue(security.external_ai_allowed(None))
        self.assertTrue(security.external_ai_allowed("saas"))

    def test_chat_in_on_premises_mode_skips_gemini(self):
        headers = {**self.login(), "X-MDIP-Deployment": "internal"}
        with patch.dict(os.environ, {"GEMINI_API_KEY": "test-gemini-key"}):
            with patch("app.services.copilot.urllib.request.urlopen") as urlopen:
                res = self.client.post("/api/v1/copilot/chat", headers=headers, json={"message": "What is at risk?"})
                urlopen.assert_not_called()
        self.assertEqual(res.status_code, 200, res.text)
        self.assertFalse(res.json()["external_ai_allowed"])


class TestCors(SecurityTestBase):
    def _preflight(self, origin):
        return self.client.options(
            "/api/v1/risks/prediction",
            headers={"Origin": origin, "Access-Control-Request-Method": "GET", "Access-Control-Request-Headers": "Authorization"},
        )

    def test_listed_origin_is_allowed(self):
        res = self._preflight("http://localhost:3000")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.headers.get("access-control-allow-origin"), "http://localhost:3000")

    def test_unlisted_origin_is_refused(self):
        res = self._preflight("https://evil.example")
        self.assertNotEqual(res.headers.get("access-control-allow-origin"), "https://evil.example")
        self.assertNotEqual(res.headers.get("access-control-allow-origin"), "*")

    def test_origin_override_from_env(self):
        with patch.dict(os.environ, {"MDIP_CORS_ORIGINS": "https://a.example, https://b.example/"}):
            self.assertEqual(security.cors_origins(), ["https://a.example", "https://b.example"])


class TestAuthSecret(unittest.TestCase):
    def test_production_without_secret_fails_closed(self):
        with patch.dict(os.environ, {"MDIP_ENV": "production"}):
            os.environ.pop("MDIP_AUTH_SECRET", None)
            with self.assertRaises(RuntimeError):
                database.assert_auth_configured()

    def test_production_rejects_short_secret(self):
        with patch.dict(os.environ, {"MDIP_ENV": "production", "MDIP_AUTH_SECRET": "too-short"}):
            with self.assertRaises(RuntimeError):
                database.assert_auth_configured()

    def test_production_accepts_strong_secret(self):
        with patch.dict(os.environ, {"MDIP_ENV": "production", "MDIP_AUTH_SECRET": "x" * 48}):
            database.assert_auth_configured()

    def test_forwarded_for_is_ignored_outside_production(self):
        request = type("R", (), {"headers": {"x-forwarded-for": "1.2.3.4"}, "client": type("C", (), {"host": "127.0.0.1"})()})()
        with patch.object(security, "PRODUCTION", False):
            self.assertEqual(security.client_ip(request), "127.0.0.1")
        with patch.object(security, "PRODUCTION", True):
            self.assertEqual(security.client_ip(request), "1.2.3.4")


if __name__ == "__main__":
    unittest.main()
