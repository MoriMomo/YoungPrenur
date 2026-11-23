"""Shared file intake: real-type checks, SOP clause drafts, the extract endpoint and per-clause SOP storage."""

import io
import os
import sqlite3
import sys
import tempfile
import unittest
import zipfile

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from tests.test_api_security import SecurityTestBase  # noqa: E402

import database  # noqa: E402
from app.services import file_intake  # noqa: E402
from app.services.file_intake import IntakeError, sniff, split_clauses  # noqa: E402

SOP_TEXT = """Hydraulic Press Changeover Procedure
SOP-PRS-09
1. Purpose
Defines the safe die changeover on press P-07.
2. Lockout
2.1 The operator shall isolate hydraulic pressure and apply a personal lock before touching the die.
3 Verification
Run one dry cycle and record tonnage before production restarts.
"""


def make_zip(files):
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        for name, data in files.items():
            zf.writestr(name, data)
    return buf.getvalue()


def make_docx(paragraphs):
    ns = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
    body = "".join(f"<w:p><w:r><w:t>{p}</w:t></w:r></w:p>" for p in paragraphs)
    return make_zip({"word/document.xml": f'<w:document xmlns:w="{ns}"><w:body>{body}</w:body></w:document>'})


class TestSniffAndSplit(unittest.TestCase):
    def test_sniff_uses_bytes_not_names(self):
        self.assertEqual(sniff(b"%PDF-1.7 ..."), "pdf")
        self.assertEqual(sniff(make_docx(["x"])), "docx")
        self.assertEqual(sniff(make_zip({"xl/workbook.xml": "<x/>"})), "xlsx")
        self.assertEqual(sniff(b"{\\rtf1 hello}"), "rtf")
        self.assertEqual(sniff("plain text, ünïcode".encode()), "text")
        self.assertIsNone(sniff(b"MZ\x90\x00\x03\x00binary"))
        self.assertIsNone(sniff(make_zip({"random.bin": "x"})))

    def test_zip_bomb_is_refused(self):
        bomb = make_zip({"word/document.xml": b"\0" * (file_intake.MAX_UNZIPPED_BYTES + 1)})
        with self.assertRaises(IntakeError) as ctx:
            sniff(bomb)
        self.assertEqual(ctx.exception.status, 413)

    def test_numbered_headings_become_clauses(self):
        clauses = split_clauses(SOP_TEXT)
        self.assertEqual([c["clause"] for c in clauses], ["Clause 1: Purpose", "Clause 2.1", "Clause 3: Verification"])
        self.assertIn("personal lock", clauses[1]["content"])

    def test_unnumbered_text_is_cut_into_parts(self):
        clauses = split_clauses("First paragraph about torque.\n\nSecond paragraph about seals.")
        self.assertEqual(clauses[0]["clause"], "Part 1")
        self.assertIn("seals", clauses[0]["content"])

    def test_sop_draft_finds_code_title_and_keywords(self):
        d = file_intake.draft("sop", SOP_TEXT.encode(), "changeover.txt")
        self.assertEqual(d["doc_code"], "SOP-PRS-09")
        self.assertEqual(d["title"], "Hydraulic Press Changeover Procedure")
        self.assertIn("hydraulic", d["keywords"])

    def test_draft_rejects_wrong_kind_and_purpose(self):
        with self.assertRaises(IntakeError) as ctx:
            file_intake.draft("sop", make_zip({"xl/workbook.xml": "<x/>"}), "plan.xlsx")
        self.assertEqual(ctx.exception.status, 415)
        with self.assertRaises(IntakeError) as ctx:
            file_intake.draft("payroll", b"text", "a.txt")
        self.assertEqual(ctx.exception.status, 400)


class TestExtractEndpoint(SecurityTestBase):
    URL = "/api/v1/files/extract?purpose=sop"

    def post(self, data, name="sop.txt", headers=None):
        return self.client.post(self.URL, files={"file": (name, data)}, headers=headers or {})

    def test_requires_sign_in(self):
        self.assertEqual(self.post(SOP_TEXT.encode()).status_code, 401)

    def test_reads_word_sop_into_a_draft_without_saving(self):
        headers = self.login()
        docs_before = self.client.get("/api/v1/knowledge/docs", headers=headers).json()
        self.assertEqual(docs_before, [])
        res = self.post(make_docx(SOP_TEXT.splitlines()), name="SOP-PRS-09.docx", headers=headers)
        self.assertEqual(res.status_code, 200, res.text)
        body = res.json()
        self.assertEqual((body["kind"], body["doc_code"]), ("docx", "SOP-PRS-09"))
        self.assertEqual(len(body["sections"]), 3)
        self.assertEqual(self.client.get("/api/v1/knowledge/docs", headers=headers).json(), [])

    def test_rejects_binary_and_oversized_files(self):
        headers = self.login()
        self.assertEqual(self.post(b"MZ\x90\x00binary", name="sop.pdf", headers=headers).status_code, 415)
        big = b"a" * (file_intake.MAX_UPLOAD_BYTES + 1)
        self.assertEqual(self.post(big, headers=headers).status_code, 413)

    def test_batch_ingest_keeps_every_clause_and_sample_toggle(self):
        headers = self.login()
        # User starts completely blank on SOP knowledge and IRoom streams.
        self.assertEqual(self.client.get("/api/v1/knowledge/docs", headers=headers).json(), [])
        self.assertEqual(self.client.get("/api/v1/iroom/materials", headers=headers).json(), [])

        rows = [
            {"doc_code": "SOP-TST-01", "title": "Test", "clause": f"Clause {i}", "keywords": ["test"], "excerpt": f"Text {i}"}
            for i in (1, 2)
        ]
        res = self.client.post("/api/v1/knowledge/ingest-batch", json=rows, headers=headers)
        self.assertEqual(res.status_code, 200, res.text)
        docs = self.client.get("/api/v1/knowledge/docs", headers=headers).json()
        saved = [d for d in docs if d["doc_code"] == "SOP-TST-01"]
        self.assertEqual(sorted(d["clause"] for d in saved), ["Clause 1", "Clause 2"])
        too_long = [{**rows[0], "excerpt": "x" * 4001}]
        self.assertEqual(self.client.post("/api/v1/knowledge/ingest-batch", json=too_long, headers=headers).status_code, 422)

        # Explicit sample buttons populate only the signed-in user's workspace and can be cleared back to blank.
        self.assertEqual(self.client.post("/api/v1/knowledge/load-sample", headers=headers).status_code, 200)
        self.assertGreater(len(self.client.get("/api/v1/knowledge/docs", headers=headers).json()), 2)
        self.assertEqual(self.client.delete("/api/v1/knowledge/docs", headers=headers).status_code, 200)
        self.assertEqual(self.client.get("/api/v1/knowledge/docs", headers=headers).json(), [])

        self.assertEqual(self.client.post("/api/v1/iroom/load-sample", headers=headers).status_code, 200)
        self.assertGreater(len(self.client.get("/api/v1/iroom/materials", headers=headers).json()), 0)
        self.assertEqual(self.client.delete("/api/v1/iroom", headers=headers).status_code, 200)
        self.assertEqual(self.client.get("/api/v1/iroom/materials", headers=headers).json(), [])

    def test_decisions_match_user_sops_dynamically_without_hardcoded_refs(self):
        headers = self.login()
        csv_bytes = (
            "WBS Code,Activity Name,Planned Duration,Actual Forecast Days,Predecessors\n"
            "OP-1,SMT Reflow Oven Setup,4,7,\n"
        ).encode("utf-8")
        self.assertEqual(
            self.client.post("/api/v1/scheduler/upload", files={"file": ("smt.csv", csv_bytes, "text/csv")}, headers=headers).status_code,
            200,
        )
        # With zero SOPs uploaded, decisions leave source_doc blank rather than fabricating SOP-SCM-12.
        decs_empty = self.client.get("/api/v1/risks/decisions", headers=headers).json()
        self.assertTrue(decs_empty)
        self.assertEqual(decs_empty[0]["source_doc"], "")

        # Upload a matching user SOP and confirm the decision dynamically cites it.
        sop_res = self.client.post(
            "/api/v1/knowledge/ingest",
            json={
                "doc_code": "SOP-SMT-99",
                "title": "Reflow Profile Verification",
                "clause": "Clause 4.1: Thermal Soak",
                "keywords": ["smt", "reflow", "thermal"],
                "excerpt": "Verify oven thermocouple calibration before launching SMT reflow production.",
            },
            headers=headers,
        )
        self.assertEqual(sop_res.status_code, 200)
        decs_linked = self.client.get("/api/v1/risks/decisions", headers=headers).json()
        self.assertEqual(decs_linked[0]["source_doc"], "SOP-SMT-99")
        self.assertIn("SOP-SMT-99", " ".join(decs_linked[0]["checklist"]))

        self.assertEqual(self.client.delete("/api/v1/knowledge/docs", headers=headers).status_code, 200)


class TestSopKeyMigration(unittest.TestCase):
    def test_old_single_key_table_is_rebuilt(self):
        orig = database.DB_PATH
        with tempfile.TemporaryDirectory(ignore_cleanup_errors=True) as tmp:  # SQLite keeps the file open on Windows
            database.DB_PATH = os.path.join(tmp, "old.db")
            try:
                with sqlite3.connect(database.DB_PATH) as conn:
                    conn.execute(
                        "CREATE TABLE sop_documents (doc_code TEXT PRIMARY KEY, title TEXT NOT NULL, clause TEXT NOT NULL,"
                        " keywords_json TEXT NOT NULL, excerpt TEXT NOT NULL, updated_at TEXT NOT NULL)"
                    )
                    conn.execute("INSERT INTO sop_documents VALUES ('SOP-OLD-1', 'Old', 'Clause 1', '[]', 'Kept', 'now')")
                database.init_db()
                database.upsert_sop({"doc_code": "SOP-OLD-1", "title": "Old", "clause": "Clause 2", "excerpt": "New"})
                clauses = sorted(d["clause"] for d in database.get_sops() if d["doc_code"] == "SOP-OLD-1")
                self.assertEqual(clauses, ["Clause 1", "Clause 2"])
            finally:
                database.DB_PATH = orig


if __name__ == "__main__":
    unittest.main()
