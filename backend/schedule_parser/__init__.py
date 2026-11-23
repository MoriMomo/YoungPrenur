"""
Schedule ingestion: parse CSV, Excel, Word (.docx/.doc), and PDF schedules into normalized
WBS tasks and run a Critical Path Method (CPM) pass to derive start days, float,
the critical path and propagated upstream slippage.

Modules: base (column aliases, number/duration parsing, task records), tables (CSV/Excel),
documents (Word, PDF and plain-text extraction), ai_reader (optional Gemini reader), cpm.
"""

from typing import Any, Dict, List, Optional

from schedule_parser.ai_reader import _extract_schedule_with_ai
from schedule_parser.base import ScheduleParseError, _trim_excerpt
from schedule_parser.cpm import compute_cpm
from schedule_parser.documents import _extract_docx, _extract_pdf_text, _parse_text_schedule_heuristic
from schedule_parser.tables import _table_rows_to_tasks, normalize_rows, read_table


def _doc_result(
    tasks: List[Dict[str, Any]],
    extraction_method: str,
    *,
    project_name: Optional[str] = None,
    document_summary: Optional[str] = None,
    document_excerpt: Optional[str] = None,
    ai_error: Optional[str] = None,
) -> Dict[str, Any]:
    return {
        "tasks": compute_cpm(tasks),
        "project_name": project_name,
        "extraction_method": extraction_method,
        "document_summary": document_summary,
        "document_excerpt": document_excerpt,
        "ai_error": ai_error,
    }


def parse_schedule_document(content: bytes, filename: str, allow_external_ai: bool = True) -> Dict[str, Any]:
    """Parse CSV, Excel, Word (.docx/.doc), or PDF files into CPM-computed WBS tasks and text metadata.

    allow_external_ai=False (on-premises mode) never sends the document to Gemini; only tables and
    selectable text are read locally.
    """
    low = filename.lower()
    if low.endswith((".csv", ".txt", ".xlsx", ".xlsm", ".xls", ".xer", ".xml")):
        return _doc_result(normalize_rows(read_table(content, filename)), "table")

    if low.endswith((".docx", ".doc")):
        tables, full_text = _extract_docx(content, filename)
        excerpt = _trim_excerpt(full_text)
        table_tasks: List[Dict[str, Any]] = []
        for tbl in tables:
            table_tasks.extend(_table_rows_to_tasks(tbl))
        if table_tasks:
            return _doc_result(table_tasks, "docx_table", document_excerpt=excerpt)
        if not full_text.strip():
            raise ScheduleParseError(f"No readable text or tables found in Word document {filename}.")

        ai_result, ai_error = (
            _extract_schedule_with_ai(filename, text=full_text) if allow_external_ai else (None, None)
        )
        if ai_result:
            provider = ai_result.get("provider", "gemini")
            return _doc_result(
                ai_result["tasks"],
                f"{provider}_document",
                project_name=ai_result.get("project_name"),
                document_summary=ai_result.get("document_summary"),
                document_excerpt=excerpt,
            )

        text_tasks = _parse_text_schedule_heuristic(full_text)
        if text_tasks:
            return _doc_result(text_tasks, "docx_text", document_excerpt=excerpt, ai_error=ai_error)

        if ai_error:
            raise ScheduleParseError(
                f"AI reader could not extract WBS tasks from {filename} ({ai_error}), "
                "and no structured WBS table was found."
            )
        if not allow_external_ai:
            raise ScheduleParseError(f"Could not find a schedule table in {filename}. On-premises mode reads only schedule tables and selectable text. Switch to Cloud mode to let the AI reader extract tasks from this document.")
        raise ScheduleParseError(
            f"Could not find WBS activities with planned durations in {filename}. "
            "Include a schedule table (Activity Name + Planned Duration), or configure DEEPSEEK_API_KEY / GEMINI_API_KEY for AI reading."
        )

    if low.endswith(".pdf"):
        pdf_text = _extract_pdf_text(content, filename)
        ai_result, ai_error = (
            _extract_schedule_with_ai(filename, pdf_bytes=content, text=pdf_text)
            if allow_external_ai
            else (None, None)
        )
        if ai_result:
            provider = ai_result.get("provider", "gemini")
            combined = "\n\n".join(
                part for part in (ai_result.get("document_summary") or "", pdf_text) if part.strip()
            )
            return _doc_result(
                ai_result["tasks"],
                f"{provider}_pdf",
                project_name=ai_result.get("project_name"),
                document_summary=ai_result.get("document_summary"),
                document_excerpt=_trim_excerpt(combined),
            )

        if pdf_text.strip():
            text_tasks = _parse_text_schedule_heuristic(pdf_text)
            if text_tasks:
                return _doc_result(
                    text_tasks,
                    "pdf_text",
                    document_excerpt=_trim_excerpt(pdf_text),
                    ai_error=ai_error,
                )

        if ai_error and not pdf_text.strip():
            raise ScheduleParseError(
                f"AI reader failed on {filename} ({ai_error}) and no selectable text was found in the PDF."
            )
        if ai_error:
            raise ScheduleParseError(
                f"AI reader could not extract WBS tasks from {filename} ({ai_error}), "
                "and local PDF table parsing found no matching activity durations."
            )
        if not allow_external_ai:
            raise ScheduleParseError(f"Could not find schedule activities in {filename}. On-premises mode reads only schedule tables and selectable text. Switch to Cloud mode to let the AI reader extract tasks from this document.")
        if not pdf_text.strip():
            raise ScheduleParseError(
                f"No extractable text found in {filename}. Scanned PDFs require GEMINI_API_KEY so AI can read the file."
            )
        raise ScheduleParseError(
            f"Could not extract WBS tasks with planned durations from {filename}. "
            "Configure DEEPSEEK_API_KEY / GEMINI_API_KEY for AI document reading or include columns like Activity Name and Planned Duration (days)."
        )

    raise ScheduleParseError(
        f"Unsupported file type: {filename}. Upload a .csv, .xlsx, .pdf, or .docx schedule."
    )


def parse_schedule_file(content: bytes, filename: str) -> List[Dict[str, Any]]:
    return parse_schedule_document(content, filename)["tasks"]


from schedule_parser.base import COLUMN_ALIASES  # noqa: E402

__all__ = [
    "COLUMN_ALIASES",
    "ScheduleParseError",
    "compute_cpm",
    "normalize_rows",
    "parse_schedule_document",
    "parse_schedule_file",
    "read_table",
]
