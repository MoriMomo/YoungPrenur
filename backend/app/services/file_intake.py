"""Shared file intake: check the real file type, extract its text, and draft records for the user to review.

Nothing here saves anything; the caller shows the draft and the user confirms it.
"""

import io
import os
import re
import zipfile
from collections import Counter
from typing import Any, Dict, List, Optional

from schedule_parser.documents import _extract_docx, _extract_pdf_text, _extract_rtf_text

# Vercel rejects request bodies above ~4.5 MB; stay under it so the error is ours, not the platform's.
MAX_UPLOAD_BYTES = 4 * 1024 * 1024
MAX_UNZIPPED_BYTES = 40 * 1024 * 1024
MAX_SECTIONS = 100
MAX_SECTION_CHARS = 2000

# Kinds each purpose accepts, decided from the file's bytes, never its extension.
PURPOSE_KINDS = {"sop": {"pdf", "docx", "rtf", "text"}}


class IntakeError(ValueError):
    def __init__(self, message: str, status: int = 422):
        super().__init__(message)
        self.status = status


def sniff(content: bytes) -> Optional[str]:
    """The file's real type from its first bytes: pdf, docx, xlsx, rtf, text, or None if unsupported."""
    if content.startswith(b"%PDF-"):
        return "pdf"
    if content.startswith(b"PK\x03\x04"):
        try:
            with zipfile.ZipFile(io.BytesIO(content)) as zf:
                if sum(info.file_size for info in zf.infolist()) > MAX_UNZIPPED_BYTES:
                    raise IntakeError("This file expands to more than 40 MB when unpacked.", 413)
                names = set(zf.namelist())
        except zipfile.BadZipFile:
            return None
        if "word/document.xml" in names:
            return "docx"
        return "xlsx" if "xl/workbook.xml" in names else None
    if content.lstrip()[:5] == b"{\\rtf":
        return "rtf"
    if b"\x00" not in content[:4096]:
        try:
            content.decode("utf-8")
            return "text"
        except UnicodeDecodeError:
            return None
    return None


def extract_text(content: bytes, filename: str, kind: str) -> str:
    if kind == "pdf":
        text = _extract_pdf_text(content, filename)
        if not text.strip():
            raise IntakeError("This PDF has no text layer (it looks scanned). Upload a text PDF or a Word file.")
        return text
    if kind == "docx":
        return _extract_docx(content, filename)[1]
    if kind == "rtf":
        return _extract_rtf_text(content)
    return content.decode("utf-8-sig")


# "1.2 Title", "Clause 3: Title", "Pasal 4. Title"; numbered lines longer than a heading are body text.
_HEADING = re.compile(
    r"^(?:(?:clause|section|article|pasal|bagian)\s+)?(\d{1,2}(?:\.\d{1,2}){0,3})[.):]?\s+(\S.{0,160})$",
    re.IGNORECASE,
)
_SOP_CODE = re.compile(r"\bSOP[-_ ]?[A-Z0-9]{1,12}(?:[-_][A-Z0-9]{1,12}){0,3}\b", re.IGNORECASE)
_STOPWORDS = {
    "about", "above", "after", "again", "against", "being", "below", "between", "clause", "could", "during",
    "each", "every", "from", "have", "into", "must", "other", "procedure", "section", "shall", "should",
    "their", "there", "these", "this", "those", "through", "under", "until", "when", "where", "which",
    "while", "with", "within", "would", "yang", "dengan", "untuk", "dalam", "pada", "harus", "atau",
}


def split_clauses(text: str) -> List[Dict[str, str]]:
    """Numbered headings become clauses; without at least two, the text is cut into ~1,200-character parts."""
    sections: List[Dict[str, Any]] = []
    for raw in text.splitlines():
        line = raw.strip()
        if not line:
            continue
        m = _HEADING.match(line)
        if m:
            number, tail = m.group(1), m.group(2).strip()
            # A short tail is a heading title; a full sentence is the clause's own text.
            if len(tail) <= 60 and not tail.endswith("."):
                sections.append({"clause": f"Clause {number}: {tail.rstrip(' :')}", "lines": []})
            else:
                sections.append({"clause": f"Clause {number}", "lines": [tail]})
        elif sections:
            sections[-1]["lines"].append(line)

    clauses = [
        {"clause": s["clause"][:200], "content": " ".join(s["lines"])[:MAX_SECTION_CHARS]}
        for s in sections
        if s["lines"]
    ]
    if len(clauses) >= 2:
        return clauses[:MAX_SECTIONS]

    parts: List[str] = []
    for paragraph in re.split(r"\n\s*\n|\n", text):
        paragraph = " ".join(paragraph.split())
        if not paragraph:
            continue
        if parts and len(parts[-1]) + len(paragraph) < 1200:
            parts[-1] += " " + paragraph
        else:
            parts.append(paragraph[:MAX_SECTION_CHARS])
    return [{"clause": f"Part {i}", "content": p} for i, p in enumerate(parts[:MAX_SECTIONS], 1)]


def sop_draft(text: str, filename: str) -> Dict[str, Any]:
    stem = os.path.splitext(os.path.basename(filename))[0]
    sections = split_clauses(text)
    if not sections:
        raise IntakeError("No readable text was found in this file.")

    code_match = _SOP_CODE.search(stem) or _SOP_CODE.search(text[:4000])
    if code_match:
        doc_code = re.sub(r"[_ ]", "-", code_match.group(0)).upper()
    else:
        slug = re.sub(r"[^A-Za-z0-9]+", "-", stem).strip("-").upper()[:24]
        doc_code = f"SOP-{slug or 'UPLOAD'}"

    first_line = next((ln.strip() for ln in text.splitlines() if ln.strip()), "")
    title = first_line if 3 <= len(first_line) <= 120 and not _HEADING.match(first_line) else stem.replace("_", " ")

    words = re.findall(r"[a-zA-Z]{5,}", text.lower())
    keywords = [w for w, _ in Counter(w for w in words if w not in _STOPWORDS).most_common(6)]

    return {"doc_code": doc_code[:64], "title": title[:200], "keywords": keywords, "sections": sections}


def draft(purpose: str, content: bytes, filename: str) -> Dict[str, Any]:
    allowed = PURPOSE_KINDS.get(purpose)
    if allowed is None:
        raise IntakeError(f"Unknown upload purpose: {purpose}.", 400)
    kind = sniff(content)
    if kind not in allowed:
        raise IntakeError("Upload a PDF, Word (.docx), RTF or plain-text file.", 415)
    text = extract_text(content, filename, kind)
    return {"purpose": purpose, "filename": filename, "kind": kind, "characters": len(text), **sop_draft(text, filename)}
