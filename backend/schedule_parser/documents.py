"""Word, RTF and PDF text extraction plus a heuristic reader for schedules written as text.
"""

import io
import re
import xml.etree.ElementTree as ET
import zipfile
from typing import Any, Dict, List, Tuple

from schedule_parser.base import ScheduleParseError, _DURATION_RE, _build_task_dict, _map_columns, _parse_duration_days
from schedule_parser.tables import _table_rows_to_tasks


_WORD_NS = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"


def _paragraph_text(elem: ET.Element) -> str:
    parts: List[str] = []
    for node in elem.iter():
        if node.tag == f"{_WORD_NS}t" and node.text:
            parts.append(node.text)
        elif node.tag == f"{_WORD_NS}tab":
            parts.append("\t")
        elif node.tag in (f"{_WORD_NS}br", f"{_WORD_NS}cr"):
            parts.append("\n")
    return "".join(parts)


def _extract_rtf_text(content: bytes) -> str:
    raw = content.decode("utf-8", errors="replace")
    raw = re.sub(r"\{\\\*?[^{}]*\}", " ", raw)
    raw = raw.replace("\\par", "\n").replace("\\line", "\n").replace("\\tab", " | ")
    raw = re.sub(r"\\'[0-9a-fA-F]{2}", " ", raw)
    raw = re.sub(r"\\[a-zA-Z]+-?\d*\s?", " ", raw)
    raw = raw.replace("{", "").replace("}", "")
    return raw


def _extract_docx(content: bytes, filename: str) -> Tuple[List[List[List[str]]], str]:
    """Extract tables and ordered document text from .docx (or RTF-wrapped .doc) bytes."""
    low = filename.lower()
    if low.endswith(".doc") and content[:2] != b"PK":
        if content.lstrip().startswith(b"{\\rtf"):
            return [], _extract_rtf_text(content)
        raise ScheduleParseError(
            "Legacy binary .doc files are not supported directly. Save as .docx or .pdf and upload again."
        )

    try:
        with zipfile.ZipFile(io.BytesIO(content)) as zf:
            if zf.getinfo("word/document.xml").file_size > 40 * 1024 * 1024:
                raise ScheduleParseError(f"{filename} expands to more than 40 MB when unpacked.")
            xml_bytes = zf.read("word/document.xml")
        root = ET.fromstring(xml_bytes)
    except (zipfile.BadZipFile, KeyError, ET.ParseError, OSError) as exc:
        raise ScheduleParseError(f"Could not read Word document {filename}.") from exc

    body = root.find(f"{_WORD_NS}body")
    if body is None:
        return [], ""

    tables: List[List[List[str]]] = []
    text_lines: List[str] = []

    def _collect_table(tbl_elem: ET.Element) -> None:
        table_rows: List[List[str]] = []
        for tr in tbl_elem.findall(f"{_WORD_NS}tr"):
            row_cells: List[str] = []
            for tc in tr.findall(f"{_WORD_NS}tc"):
                cell_parts = [_paragraph_text(p).strip() for p in tc.findall(f".//{_WORD_NS}p")]
                cell_text = " ".join(part for part in cell_parts if part)
                row_cells.append(cell_text)
            if any(row_cells):
                table_rows.append(row_cells)
                text_lines.append(" | ".join(c for c in row_cells if c))
        if table_rows:
            tables.append(table_rows)

    for child in body:
        if child.tag == f"{_WORD_NS}p":
            txt = _paragraph_text(child).strip()
            if txt:
                text_lines.append(txt)
        elif child.tag == f"{_WORD_NS}tbl":
            _collect_table(child)

    if not text_lines and not tables:
        for tbl in root.findall(f".//{_WORD_NS}tbl"):
            _collect_table(tbl)
        for p in root.findall(f".//{_WORD_NS}p"):
            txt = _paragraph_text(p).strip()
            if txt:
                text_lines.append(txt)

    return tables, "\n".join(text_lines)


def _extract_pdf_text(content: bytes, filename: str) -> str:
    """Extract embedded text from PDF pages using pypdf when installed."""
    try:
        from pypdf import PdfReader
    except ImportError:
        return ""

    try:
        reader = PdfReader(io.BytesIO(content))
        pages = [(page.extract_text() or "").strip() for page in reader.pages]
        return "\n".join(p for p in pages if p)
    except Exception as exc:
        raise ScheduleParseError(f"Could not read PDF {filename}: {exc}") from exc


def _split_delimited_line(line: str, mode: str) -> List[str]:
    if mode == "pipe":
        parts = [p.strip() for p in line.strip().strip("|").split("|")]
        return parts
    if mode == "tab":
        return [p.strip() for p in line.split("\t")]
    return [p.strip() for p in re.split(r"\s{2,}", line.strip())]


def _parse_text_schedule_heuristic(text: str) -> List[Dict[str, Any]]:
    """Local offline parser for tabular lines or duration-tagged schedule prose."""
    lines = [ln.strip() for ln in (text or "").splitlines() if ln.strip()]
    if not lines:
        return []

    # Pass 1: find delimited table blocks (|, tab, or multi-space columns).
    for mode in ("pipe", "tab", "spaces"):
        for idx, line in enumerate(lines):
            if mode == "pipe" and "|" not in line:
                continue
            if mode == "tab" and "\t" not in line:
                continue
            header = _split_delimited_line(line, mode)
            if len(header) < 2:
                continue
            cols = _map_columns(header)
            if "task" not in cols or "planned_days" not in cols:
                continue
            rows: List[List[str]] = [header]
            for follow in lines[idx + 1 :]:
                if re.fullmatch(r"[-|:+\s]+", follow):
                    continue
                if mode == "pipe" and "|" not in follow:
                    break
                if mode == "tab" and "\t" not in follow:
                    break
                cells = _split_delimited_line(follow, mode)
                if len(cells) < 2:
                    break
                rows.append(cells)
            tasks = _table_rows_to_tasks(rows)
            if tasks:
                return tasks

    # Pass 2: extract duration-tagged activity lines (e.g. "WBS-1.1 Tooling design - 5 days").
    tasks: List[Dict[str, Any]] = []
    skip_prefixes = ("total", "subtotal", "page ", "summary", "wbs code", "project name", "note:")
    for line in lines:
        low = line.lower()
        if any(low.startswith(prefix) for prefix in skip_prefixes):
            continue
        matches = list(_DURATION_RE.finditer(line))
        if not matches:
            continue
        planned = _parse_duration_days(matches[0].group(0))
        if planned is None or planned <= 0:
            continue
        actual = _parse_duration_days(matches[1].group(0)) if len(matches) > 1 else None
        if actual is not None and actual <= 0:
            actual = None

        dep_match = re.search(
            r"(?:depends?\s*on|predecessors?|after)\s*[:\-]?\s*([A-Za-z0-9_.\-,\s]+)",
            line,
            re.IGNORECASE,
        )
        predecessors: List[str] = []
        if dep_match:
            predecessors = re.findall(
                r"\b(?:(?:WBS|OP|TASK|ACT|T)[-_]?\d+(?:\.\d+)*|\d+(?:\.\d+)+)\b",
                dep_match.group(1),
                re.IGNORECASE,
            )

        cleaned = re.sub(r"^\s*[-*•]+\s*", "", line)
        code = ""
        code_match = re.match(
            r"^\s*((?:WBS|OP|TASK|ACT|T)[-_]?\d+(?:\.\d+)*|\d+(?:\.\d+)+)\b[\s:|\-]*",
            cleaned,
            re.IGNORECASE,
        )
        if code_match:
            code = code_match.group(1).strip()
            cleaned = cleaned[code_match.end() :]

        if dep_match:
            dep_start = cleaned.lower().find(dep_match.group(0).lower().split()[0])
            if dep_start > 0:
                cleaned = cleaned[:dep_start]

        for m in reversed(matches):
            span_start = cleaned.find(m.group(0))
            if span_start != -1:
                cleaned = cleaned[:span_start] + " " + cleaned[span_start + len(m.group(0)) :]

        task_name = re.sub(r"\s*[|(\[]\s*", " ", cleaned)
        task_name = re.sub(r"[\])]+", " ", task_name)
        task_name = re.sub(r"\b(?:planned|actual|forecast|duration)\s*[:\-]?\s*", "", task_name, flags=re.IGNORECASE)
        task_name = re.sub(r"\s{2,}", " ", task_name).strip(" -:|,;.")
        if sum(ch.isalpha() for ch in task_name) < 3:
            continue

        tasks.append(
            _build_task_dict(
                code=code or f"WBS-{len(tasks) + 1}",
                name=task_name,
                planned=planned,
                actual=actual,
                predecessors=predecessors,
                has_dependency_column=bool(predecessors),
            )
        )
    return tasks
