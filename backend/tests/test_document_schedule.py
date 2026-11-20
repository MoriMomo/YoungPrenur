"""Unit tests for Word (.docx/.doc) and PDF schedule parsing, Gemini document reading, and Copilot integration."""

import base64
import io
import json
import os
import sys
import tempfile
import unittest
from unittest.mock import patch
import zipfile
from xml.sax.saxutils import escape

_TMP_DIR = tempfile.TemporaryDirectory()
os.environ.setdefault("MDIP_DB_PATH", os.path.join(_TMP_DIR.name, "test_doc_schedule.db"))

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import database  # noqa: E402
import schedule_parser  # noqa: E402
from app.services import copilot as copilot_service  # noqa: E402
from ml.predictor import analyze_schedule  # noqa: E402


def _build_docx_bytes(paragraphs=None, tables=None) -> bytes:
    w_ns = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
    chunks = [f'<?xml version="1.0" encoding="UTF-8"?><w:document xmlns:w="{w_ns}"><w:body>']
    for text in paragraphs or []:
        chunks.append(f"<w:p><w:r><w:t>{escape(text)}</w:t></w:r></w:p>")
    for table in tables or []:
        chunks.append("<w:tbl>")
        for row in table:
            chunks.append("<w:tr>")
            for cell in row:
                chunks.append(f"<w:tc><w:p><w:r><w:t>{escape(str(cell))}</w:t></w:r></w:p></w:tc>")
            chunks.append("</w:tr>")
        chunks.append("</w:tbl>")
    chunks.append("</w:body></w:document>")

    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("word/document.xml", "".join(chunks).encode("utf-8"))
    return buf.getvalue()


def _build_minimal_pdf(lines) -> bytes:
    ops = []
    y = 740
    for line in lines:
        safe = str(line).replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")
        ops.append(f"BT /F1 11 Tf 40 {y} Td ({safe}) Tj ET")
        y -= 18
    stream_data = "\n".join(ops).encode("latin-1")

    objects = [
        b"1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n",
        b"2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n",
        (
            b"3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] "
            b"/Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n"
        ),
        (
            f"4 0 obj\n<< /Length {len(stream_data)} >>\nstream\n".encode("latin-1")
            + stream_data
            + b"\nendstream\nendobj\n"
        ),
        b"5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n",
    ]
    out = bytearray(b"%PDF-1.4\n")
    offsets = [0]
    for obj in objects:
        offsets.append(len(out))
        out.extend(obj)
    xref_pos = len(out)
    out.extend(f"xref\n0 {len(objects) + 1}\n0000000000 65535 f \n".encode("latin-1"))
    for off in offsets[1:]:
        out.extend(f"{off:010d} 00000 n \n".encode("latin-1"))
    out.extend(
        f"trailer\n<< /Size {len(objects) + 1} /Root 1 0 R >>\nstartxref\n{xref_pos}\n%%EOF\n".encode(
            "latin-1"
        )
    )
    return bytes(out)


class _MockGeminiHttpResponse:
    def __init__(self, payload_obj):
        wrapped = {"candidates": [{"content": {"parts": [{"text": json.dumps(payload_obj)}]}}]}
        self._buf = io.BytesIO(json.dumps(wrapped).encode("utf-8"))

    def read(self) -> bytes:
        return self._buf.getvalue()

    def __enter__(self):
        return self

    def __exit__(self, *args):
        return False


class TestDocumentScheduleIngestion(unittest.TestCase):
    def setUp(self):
        self._orig_db = database.DB_PATH
        self._tmp = tempfile.TemporaryDirectory()
        database.DB_PATH = os.path.join(self._tmp.name, "doc_schedule.db")
        database.init_db()
        self._orig_key = os.environ.get("GEMINI_API_KEY")

    def tearDown(self):
        database.DB_PATH = self._orig_db
        if self._orig_key is None:
            os.environ.pop("GEMINI_API_KEY", None)
        else:
            os.environ["GEMINI_API_KEY"] = self._orig_key
        self._tmp.cleanup()

    def test_docx_table_parses_without_gemini(self):
        os.environ.pop("GEMINI_API_KEY", None)
        docx_bytes = _build_docx_bytes(
            paragraphs=[
                "Tooling Package Notes: Spindle bearing delivery requires QA clearance prior to assembly.",
            ],
            tables=[
                [
                    ["WBS Code", "Activity Name", "Planned Days", "Forecast Days", "Predecessors"],
                    ["WBS-1.1", "Die Block Machining", "5 days", "6 days", "None"],
                    ["WBS-1.2", "Coordinate CMM Verification", "3 days", "3 days", "WBS-1.1"],
                ]
            ],
        )
        res = schedule_parser.parse_schedule_document(docx_bytes, "tooling_plan.docx")
        self.assertEqual(res["extraction_method"], "docx_table")
        self.assertEqual(len(res["tasks"]), 2)
        self.assertEqual(res["tasks"][0]["code"], "WBS-1.1")
        self.assertAlmostEqual(res["tasks"][0]["planned_days"], 5.0)
        self.assertAlmostEqual(res["tasks"][1]["upstream_slip_days"], 1.0)
        self.assertTrue(res["tasks"][1]["critical"])
        self.assertIn("Spindle bearing delivery", res["document_excerpt"] or "")

    def test_docx_prose_uses_gemini_reader(self):
        os.environ["GEMINI_API_KEY"] = "test-gemini-key"
        docx_bytes = _build_docx_bytes(
            paragraphs=[
                "Turbine Housing Fabrication Brief: Complete fixture CAD over 4 days before starting 5-axis roughing.",
                "Highlight: Heat-treat subcontract furnace queues add +1.5d buffer risk.",
            ]
        )
        captured = {}
        gemini_payload = {
            "project_name": "Turbine Housing Fabrication",
            "document_summary": "Two-step fabrication sequence with heat-treat queue risk.",
            "tasks": [
                {
                    "code": "WBS-1",
                    "task": "Fixture CAD Sign-off",
                    "planned_days": 4,
                    "actual_days": 4,
                    "predecessors": [],
                },
                {
                    "code": "WBS-2",
                    "task": "5-Axis Roughing & Heat Treat",
                    "planned_days": 6,
                    "actual_days": 7.5,
                    "predecessors": ["WBS-1"],
                },
            ],
        }

        def _fake_urlopen(req, timeout=0):
            captured["body"] = json.loads(req.data.decode("utf-8"))
            captured["timeout"] = timeout
            return _MockGeminiHttpResponse(gemini_payload)

        with patch("schedule_parser.ai_reader.urllib.request.urlopen", side_effect=_fake_urlopen):
            res = schedule_parser.parse_schedule_document(docx_bytes, "housing_brief.docx")

        self.assertEqual(res["extraction_method"], "gemini_document")
        self.assertEqual(res["project_name"], "Turbine Housing Fabrication")
        self.assertIn("heat-treat queue risk", res["document_summary"] or "")
        self.assertEqual(len(res["tasks"]), 2)
        self.assertEqual(res["tasks"][1]["start_day"], 4)
        self.assertIn("Turbine Housing Fabrication Brief", captured["body"]["contents"][0]["parts"][0]["text"])

    def test_pdf_uses_gemini_inline_data(self):
        os.environ["GEMINI_API_KEY"] = "test-gemini-key"
        pdf_bytes = _build_minimal_pdf(["Aerospace Bracket Schedule", "WBS-1.1 Alloy prep - 3 days"])
        captured = {}
        gemini_payload = {
            "project_name": "Aerospace Bracket Lot 7",
            "document_summary": "Bracket production relies on alloy batch prep prior to 5-axis finishing.",
            "tasks": [
                {
                    "code": "WBS-1.1",
                    "task": "Alloy Batch Prep",
                    "planned_days": 3,
                    "actual_days": 4,
                    "predecessors": [],
                }
            ],
        }

        def _fake_urlopen(req, timeout=0):
            captured["body"] = json.loads(req.data.decode("utf-8"))
            return _MockGeminiHttpResponse(gemini_payload)

        with patch("schedule_parser.ai_reader.urllib.request.urlopen", side_effect=_fake_urlopen):
            res = schedule_parser.parse_schedule_document(pdf_bytes, "bracket_schedule.pdf")

        self.assertEqual(res["extraction_method"], "gemini_pdf")
        self.assertEqual(res["project_name"], "Aerospace Bracket Lot 7")
        parts = captured["body"]["contents"][0]["parts"]
        inline_part = next(p for p in parts if "inline_data" in p)
        self.assertEqual(inline_part["inline_data"]["mime_type"], "application/pdf")
        self.assertEqual(inline_part["inline_data"]["data"], base64.b64encode(pdf_bytes).decode("ascii"))
        self.assertEqual(len(res["tasks"]), 1)
        self.assertAlmostEqual(res["tasks"][0]["variance_days"], 1.0)

    def test_pdf_local_pypdf_fallback_without_api_key(self):
        os.environ.pop("GEMINI_API_KEY", None)
        pdf_bytes = _build_minimal_pdf(
            [
                "Plant Turnaround Schedule",
                "WBS-1.1 Raw Billet Inspection - 2 days",
                "WBS-1.2 Rough Turning & Drilling - 5 days depends on WBS-1.1",
            ]
        )
        res = schedule_parser.parse_schedule_document(pdf_bytes, "turnaround.pdf")
        self.assertEqual(res["extraction_method"], "pdf_text")
        self.assertEqual(len(res["tasks"]), 2)
        self.assertEqual(res["tasks"][0]["code"], "WBS-1.1")
        self.assertAlmostEqual(res["tasks"][0]["planned_days"], 2.0)
        self.assertEqual(res["tasks"][1]["code"], "WBS-1.2")
        self.assertEqual(res["tasks"][1]["start_day"], 2)
        self.assertIn("Raw Billet Inspection", res["document_excerpt"] or "")

    def test_on_premises_mode_never_calls_gemini(self):
        os.environ["GEMINI_API_KEY"] = "test-gemini-key"
        pdf_bytes = _build_minimal_pdf(
            [
                "Plant Turnaround Schedule",
                "WBS-1.1 Raw Billet Inspection - 2 days",
            ]
        )
        with patch("schedule_parser.ai_reader.urllib.request.urlopen") as urlopen:
            res = schedule_parser.parse_schedule_document(pdf_bytes, "turnaround.pdf", allow_external_ai=False)
            urlopen.assert_not_called()
        self.assertEqual(res["extraction_method"], "pdf_text")

        prose_only = _build_docx_bytes(paragraphs=["We will finish the brackets soon after the alloy arrives."])
        with patch("schedule_parser.ai_reader.urllib.request.urlopen") as urlopen:
            with self.assertRaises(schedule_parser.ScheduleParseError) as ctx:
                schedule_parser.parse_schedule_document(prose_only, "notes.docx", allow_external_ai=False)
            urlopen.assert_not_called()
        self.assertIn("On-premises mode", str(ctx.exception))

    def test_legacy_binary_doc_gives_clear_error(self):
        ole2_bytes = b"\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1" + b"\x00" * 64
        with self.assertRaises(schedule_parser.ScheduleParseError) as ctx:
            schedule_parser.parse_schedule_document(ole2_bytes, "legacy_plan.doc")
        self.assertIn(".docx or .pdf", str(ctx.exception))

    def test_uploaded_document_readable_by_copilot(self):
        os.environ.pop("GEMINI_API_KEY", None)
        tasks = schedule_parser.compute_cpm(
            [
                schedule_parser.base._build_task_dict(
                    code="WBS-9.1",
                    name="Vacuum Brazing Assembly",
                    planned=4.0,
                    actual=6.0,
                )
            ]
        )
        analyzed = analyze_schedule(tasks, "Vacuum Manifold Build")
        uploaded = {
            "source": "upload",
            "filename": "manifold_build.pdf",
            "extraction_method": "gemini_pdf",
            "document_summary": "Vacuum brazing requires nitrogen purge certification before leak test.",
            "document_excerpt": "Nitrogen purge dew point must stay below -60C during vacuum brazing.",
            **analyzed,
        }

        res = copilot_service._run_grounded_copilot(
            "Summarize the uploaded PDF schedule",
            "Operations Manager",
            analysis=uploaded,
        )
        self.assertIn("nitrogen purge", res["reply"].lower())
        doc_codes = [c["doc_code"] for c in res["citations"]]
        self.assertIn("manifold_build.pdf", doc_codes)
        self.assertTrue(any(code.startswith("SOP-") for code in doc_codes))


if __name__ == "__main__":
    unittest.main()
