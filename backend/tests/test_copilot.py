"""Unit tests for grounded Copilot synthesis, status discovery, and fallbacks."""

import io
import json
import os
import sys
import tempfile
import unittest
import urllib.error
from unittest.mock import patch

_TMP_DIR = tempfile.TemporaryDirectory()
os.environ.setdefault("MDIP_DB_PATH", os.path.join(_TMP_DIR.name, "test_copilot.db"))

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import database  # noqa: E402
from app.api import knowledge as knowledge_api  # noqa: E402
from app.schemas import CopilotQuery, SopDocumentPayload  # noqa: E402
from app.services import copilot as copilot_service  # noqa: E402


class _MockGeminiResp:
    def __init__(self, text: str):
        payload = {"candidates": [{"content": {"parts": [{"text": text}]}}]}
        self._buf = io.BytesIO(json.dumps(payload).encode("utf-8"))

    def read(self) -> bytes:
        return self._buf.getvalue()

    def __enter__(self):
        return self

    def __exit__(self, *args):
        return False


class TestCopilotService(unittest.TestCase):
    def setUp(self):
        provider_env = patch.dict(os.environ)
        provider_env.start()
        self.addCleanup(provider_env.stop)
        for name in ("DEEPSEEK_API_KEY", "DEEPSEEK_MODEL", "GEMINI_API_KEY", "GEMINI_MODEL"):
            os.environ.pop(name, None)
        self._orig_db = database.DB_PATH
        self._tmp = tempfile.TemporaryDirectory()
        database.DB_PATH = os.path.join(self._tmp.name, "copilot.db")
        database.init_db()

    def tearDown(self):
        database.DB_PATH = self._orig_db
        self._tmp.cleanup()

    def test_deepseek_takes_precedence_and_uses_grounded_chat_payload(self):
        os.environ.update(DEEPSEEK_API_KEY="test-deepseek-key", GEMINI_API_KEY="test-gemini-key")
        self.assertEqual(copilot_service.get_copilot_status()["provider"], "deepseek")

        with patch("app.services.copilot.urllib.request.urlopen") as urlopen:
            response = urlopen.return_value.__enter__.return_value
            response.read.return_value = b'{"choices":[{"message":{"content":"Review the schedule risk."}}]}'
            result = copilot_service._run_grounded_copilot(
                "What should I address first?",
                "Operations Manager",
                history=[{"role": "model", "text": "Here are the schedule risks."}],
            )

        request = urlopen.call_args.args[0]
        body = json.loads(request.data)
        self.assertEqual(request.full_url, "https://api.deepseek.com/chat/completions")
        self.assertEqual(request.get_header("Authorization"), "Bearer test-deepseek-key")
        self.assertEqual(body["model"], "deepseek-flash")
        self.assertEqual([item["role"] for item in body["messages"]], ["system", "assistant", "user"])
        self.assertIn("Verified SOP Excerpts:", body["messages"][-1]["content"])
        self.assertEqual(result["reply"], "Review the schedule risk.")
        self.assertEqual(result["model"], "deepseek-flash")
        self.assertTrue(result["citations"])

    def test_deepseek_billing_error_falls_back_to_retrieval(self):
        os.environ["DEEPSEEK_API_KEY"] = "test-deepseek-key"
        error = urllib.error.HTTPError("https://api.deepseek.com", 402, "Payment required", None, None)
        with patch("app.services.copilot.urllib.request.urlopen", side_effect=error):
            result = copilot_service._run_grounded_copilot("What is at risk?", "Operations Manager")

        self.assertFalse(result["llm_enhanced"])
        self.assertEqual(result["llm_error"], "DeepSeek API balance is insufficient")
        self.assertTrue(result["reply"])

    def test_copilot_status_reflects_api_key(self):
        os.environ.pop("GEMINI_API_KEY", None)
        off = copilot_service.get_copilot_status()
        self.assertFalse(off["llm_configured"])
        self.assertEqual(off["provider"], "retrieval")
        self.assertIsNone(off["model"])
        self.assertGreater(off["indexed_sops"], 0)

        os.environ["GEMINI_API_KEY"] = "test-gemini-key"
        on = copilot_service.get_copilot_status()
        self.assertTrue(on["llm_configured"])
        self.assertEqual(on["provider"], "gemini")
        self.assertEqual(on["model"], "gemini-2.5-flash")

    def test_gemini_synthesis_uses_history_and_returns_markdown(self):
        os.environ["GEMINI_API_KEY"] = "test-gemini-key"
        captured = {}

        def _fake_urlopen(req, timeout=0):
            captured["url"] = req.full_url
            captured["timeout"] = timeout
            captured["body"] = json.loads(req.data.decode("utf-8"))
            return _MockGeminiResp("Prioritize WBS-1.2 procurement.\n\n- Authorize express freight per SOP-SCM-12.")

        with patch("app.services.copilot.urllib.request.urlopen", side_effect=_fake_urlopen):
            res = copilot_service._run_grounded_copilot(
                "What should I address first?",
                "Operations Manager",
                history=[
                    {"role": "user", "text": "Show active schedule risks"},
                    {"role": "model", "text": "WBS-1.2 is highest risk."},
                ],
            )

        self.assertTrue(res["llm_enhanced"])
        self.assertEqual(res["model"], "gemini-2.5-flash")
        self.assertIsNone(res["llm_error"])
        self.assertIn("Prioritize WBS-1.2 procurement.", res["reply"])
        self.assertGreater(len(res["citations"]), 0)
        contents = captured["body"]["contents"]
        self.assertEqual(len(contents), 3)
        self.assertEqual(contents[0]["role"], "user")
        self.assertEqual(contents[1]["role"], "model")
        self.assertEqual(contents[2]["role"], "user")
        self.assertIn("systemInstruction", captured["body"])

    def test_on_premises_mode_answers_without_cloud_ai(self):
        os.environ.update(DEEPSEEK_API_KEY="test-deepseek-key", GEMINI_API_KEY="test-gemini-key")
        with patch("app.services.copilot.urllib.request.urlopen") as urlopen:
            res = copilot_service._run_grounded_copilot(
                "What should I address first?", "Operations Manager", allow_external_ai=False
            )
            urlopen.assert_not_called()
        self.assertFalse(res["llm_enhanced"])
        self.assertFalse(res["external_ai_allowed"])
        self.assertTrue(res["is_grounded"])
        self.assertGreater(len(res["citations"]), 0)

    def test_gemini_http_error_surfaces_clean_message_with_fallback(self):
        os.environ["GEMINI_API_KEY"] = "bad-key"
        err = urllib.error.HTTPError(
            url="https://generativelanguage.googleapis.com",
            code=403,
            msg="Forbidden",
            hdrs=None,
            fp=None,
        )
        with patch("app.services.copilot.urllib.request.urlopen", side_effect=err):
            res = copilot_service._run_grounded_copilot("How to mitigate Alloy M-204?", "Supply Chain Lead")

        self.assertFalse(res["llm_enhanced"])
        self.assertIsNone(res["model"])
        self.assertEqual(res["llm_error"], "Invalid GEMINI_API_KEY")
        self.assertTrue(len(res["reply"]) > 0)
        self.assertGreater(len(res["citations"]), 0)

    def test_without_api_key_returns_structured_retrieval_without_error(self):
        os.environ.pop("GEMINI_API_KEY", None)
        res = copilot_service._run_grounded_copilot("Where is the SOP for press vibration?", "Maintenance Lead")
        self.assertFalse(res["llm_enhanced"])
        self.assertIsNone(res["model"])
        self.assertIsNone(res["llm_error"])
        self.assertGreater(len(res["citations"]), 0)
        self.assertIn("SOP", res["reply"])

    def test_ingested_sop_connects_to_copilot_status_and_chat(self):
        test_user = {"id": "usr-test", "role": "Quality Manager"}
        before = knowledge_api.copilot_status(user=test_user)["indexed_sops"]
        knowledge_api.ingest_knowledge_doc(
            SopDocumentPayload(
                doc_code="SOP-QA-15",
                title="NDT Inspection Protocol",
                clause="Clause 2.1: Ultrasonic Rejection",
                keywords=["ultrasonic", "porosity"],
                excerpt="Reject any forging with ultrasonic porosity indication exceeding 1.5mm.",
            ),
            user=test_user,
        )
        after = knowledge_api.copilot_status(user=test_user)["indexed_sops"]
        self.assertEqual(after, before + 1)

        res = knowledge_api.copilot_chat(
            CopilotQuery(message="What does SOP QA 15 say about ultrasonic porosity?"),
            user=test_user,
        )
        self.assertGreater(len(res["citations"]), 0)
        self.assertEqual(res["citations"][0]["doc_code"], "SOP-QA-15")
        self.assertIn("1.5mm", res["reply"])


if __name__ == "__main__":
    unittest.main()
