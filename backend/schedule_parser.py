"""
Schedule ingestion: parse CSV, Excel, Word (.docx/.doc), and PDF schedules into normalized
WBS tasks and run a Critical Path Method (CPM) pass to derive start days, float,
the critical path and propagated upstream slippage.
"""

import base64
import io
import json
import os
import re
import urllib.error
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
import zipfile
from typing import Any, Dict, List, Optional, Tuple

import pandas as pd

from ml.features import infer_category

# Accepted header aliases (compared after lower-casing and stripping non-alphanumerics).
COLUMN_ALIASES = {
    "code": ["wbscode", "wbs", "code", "taskid", "id", "activityid", "kodewbs"],
    "task": ["activityname", "activity", "taskname", "task", "name", "description", "aktivitas", "namaaktivitas"],
    "planned_days": ["plannedduration", "planneddurationdays", "planneddays", "duration", "durationdays", "durasi", "durasirencana"],
    "actual_days": ["actualforecastdays", "forecastdays", "actualdays", "actualduration", "forecastduration", "durasiaktual"],
    "critical_declared": ["criticalpath", "critical", "iscritical", "jalurkritis"],
    "work_center": ["assignedworkcenter", "workcenter", "workcentre", "resource", "machine", "stasiunkerja"],
    "owner": ["owner", "pic", "assignee", "responsible", "penanggungjawab"],
    "dependency": ["dependency", "dependencies", "predecessor", "predecessors", "dependson", "pendahulu"],
    "status": ["status"],
    "resource_utilization": ["resourceutilization", "utilization", "utilisation", "load", "utilisasi"],
    "drawing_revisions": ["drawingrevisions", "revisions", "revisioncount", "revisigambar"],
    "external_dependency": ["externalvendor", "external", "vendordependency", "subcontract"],
}


class ScheduleParseError(ValueError):
    pass


def _norm(header: str) -> str:
    return re.sub(r"[^a-z0-9]", "", str(header).lower())


def _map_columns(columns: List[str]) -> Dict[str, str]:
    normalized = {_norm(c): c for c in columns}
    mapping = {}
    for field, aliases in COLUMN_ALIASES.items():
        for alias in aliases:
            if alias in normalized:
                mapping[field] = normalized[alias]
                break
    return mapping


def _to_bool(value: Any) -> Optional[bool]:
    if value is None or (isinstance(value, float) and pd.isna(value)):
        return None
    s = str(value).strip().lower()
    if s in {"true", "yes", "y", "1", "ya", "x"}:
        return True
    if s in {"false", "no", "n", "0", "tidak", ""}:
        return False
    return None


_DURATION_RE = re.compile(
    r"(\d+(?:[.,]\d+)?)\s*(days?|day|d|hari|weeks?|wks?|w|minggu|hours?|hrs?|h|jam)\b",
    re.IGNORECASE,
)
_EXACT_DURATION_RE = re.compile(
    r"^\s*([+-]?\d+(?:[.,]\d+)?)\s*(days?|day|d|hari|weeks?|wks?|w|minggu|hours?|hrs?|h|jam)?\s*$",
    re.IGNORECASE,
)
_WORD_NS = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"


def _to_float(value: Any) -> Optional[float]:
    if value is None or (isinstance(value, bool)):
        return None
    try:
        f = float(str(value).replace(",", ".").replace("%", "").strip())
        return None if pd.isna(f) else f
    except (TypeError, ValueError):
        return None


def _parse_duration_days(value: Any) -> Optional[float]:
    """Parse numeric durations or strings like '5d', '2 weeks', '4h', '3 hari' into days."""
    if value is None or isinstance(value, bool):
        return None
    if isinstance(value, (int, float)):
        return None if pd.isna(value) else float(value)
    match = _EXACT_DURATION_RE.match(str(value))
    if not match:
        return None
    try:
        num = float(match.group(1).replace(",", "."))
    except ValueError:
        return None
    unit = (match.group(2) or "").lower()
    if unit.startswith("w") or unit == "minggu":
        return num * 5.0
    if unit.startswith("h") or unit == "jam":
        return num / 8.0
    return num


def _trim_excerpt(text: str, limit: int = 4000) -> Optional[str]:
    """Normalize whitespace and cap stored document text for Copilot retrieval."""
    cleaned = re.sub(r"[ \t]+", " ", text or "")
    cleaned = re.sub(r"\n{3,}", "\n\n", cleaned).strip()
    if not cleaned:
        return None
    if len(cleaned) <= limit:
        return cleaned
    return cleaned[: limit - 3].rstrip() + "..."


def _parse_predecessors(raw: Any) -> List[str]:
    if isinstance(raw, list):
        items = [str(item).strip() for item in raw]
        return [d for d in items if d and d.lower() not in {"none", "nan", "-"}]
    deps_raw = str(raw or "").strip()
    if deps_raw.lower() in {"", "none", "nan", "-"}:
        return []
    return [d.strip() for d in re.split(r"[;,|/]+", deps_raw) if d.strip()]


def _build_task_dict(
    *,
    code: str,
    name: str,
    planned: float,
    actual: Optional[float] = None,
    work_center: str = "",
    owner: str = "",
    predecessors: Optional[List[str]] = None,
    has_dependency_column: bool = False,
    status_declared: str = "",
    critical_declared: Optional[bool] = None,
    resource_utilization: Optional[float] = None,
    drawing_revisions: Optional[float] = None,
    external_dependency: Optional[bool] = None,
) -> Dict[str, Any]:
    planned_days = max(0.25, planned)
    actual_days = max(0.25, actual) if actual is not None else planned_days
    return {
        "code": code,
        "task": name,
        "planned_days": planned_days,
        "actual_days": actual_days,
        "work_center": work_center,
        "owner": owner,
        "predecessors": predecessors or [],
        "has_dependency_column": has_dependency_column,
        "status_declared": status_declared,
        "critical_declared": critical_declared,
        "resource_utilization": resource_utilization,
        "drawing_revisions": drawing_revisions,
        "external_dependency": external_dependency,
        "category": infer_category(name, work_center),
    }


def read_table(content: bytes, filename: str) -> pd.DataFrame:
    name = filename.lower()
    if name.endswith((".xlsx", ".xlsm", ".xls")):
        return pd.read_excel(io.BytesIO(content))
    if name.endswith(".csv") or name.endswith(".txt"):
        text = content.decode("utf-8-sig", errors="replace")
        lines = text.splitlines()
        first = lines[0] if lines else ""
        sep = ";" if first.count(";") > first.count(",") else ","
        return pd.read_csv(io.StringIO(text), sep=sep)
    raise ScheduleParseError(
        f"Unsupported file type: {filename}. Upload a .csv, .xlsx, .pdf, or .docx schedule."
    )


def normalize_rows(df: pd.DataFrame) -> List[Dict[str, Any]]:
    df = df.dropna(how="all")
    cols = _map_columns(list(df.columns))
    if "task" not in cols or "planned_days" not in cols:
        raise ScheduleParseError(
            "Could not find required columns. Need at least an activity name and a planned duration "
            f"(found headers: {', '.join(map(str, df.columns))})."
        )

    tasks: List[Dict[str, Any]] = []
    for i, row in enumerate(df.to_dict(orient="records")):
        get = lambda f: row.get(cols[f]) if f in cols else None  # noqa: E731
        name = str(get("task") or "").strip()
        if pd.isna(get("task")):
            name = ""
        planned = _parse_duration_days(get("planned_days"))
        if not name or planned is None or planned <= 0:
            continue
        actual = _parse_duration_days(get("actual_days"))
        if actual is not None and actual <= 0:
            actual = None
        code_val = get("code")
        code = (
            f"WBS-{i + 1}"
            if code_val is None or (isinstance(code_val, float) and pd.isna(code_val)) or not str(code_val).strip()
            else str(code_val).strip()
        )
        wc_val = get("work_center")
        work_center = "" if wc_val is None or (isinstance(wc_val, float) and pd.isna(wc_val)) else str(wc_val).strip()
        owner_val = get("owner")
        owner = "" if owner_val is None or (isinstance(owner_val, float) and pd.isna(owner_val)) else str(owner_val).strip()
        dep_val = get("dependency")
        preds = [] if dep_val is None or (isinstance(dep_val, float) and pd.isna(dep_val)) else _parse_predecessors(dep_val)
        status_val = get("status")
        status_declared = (
            "" if status_val is None or (isinstance(status_val, float) and pd.isna(status_val)) else str(status_val).strip()
        )
        util = _to_float(get("resource_utilization"))
        if util is not None and util > 1.5:
            util = util / 100.0

        tasks.append(
            _build_task_dict(
                code=code,
                name=name,
                planned=planned,
                actual=actual,
                work_center=work_center,
                owner=owner,
                predecessors=preds,
                has_dependency_column="dependency" in cols,
                status_declared=status_declared,
                critical_declared=_to_bool(get("critical_declared")),
                resource_utilization=util,
                drawing_revisions=_to_float(get("drawing_revisions")),
                external_dependency=_to_bool(get("external_dependency")),
            )
        )
    if not tasks:
        raise ScheduleParseError("No schedule rows with an activity name and planned duration were found.")
    return tasks


def _table_rows_to_tasks(rows: List[List[str]]) -> List[Dict[str, Any]]:
    """Try normalizing extracted matrix rows (e.g. from Word or text tables) into WBS tasks."""
    for hdr_idx in range(min(5, len(rows))):
        header = [str(cell or "").strip() for cell in rows[hdr_idx]]
        if not any(header):
            continue
        cols = _map_columns(header)
        if "task" not in cols or "planned_days" not in cols:
            continue
        width = len(header)
        body: List[List[str]] = []
        for raw_row in rows[hdr_idx + 1 :]:
            padded = [str(c or "").strip() for c in raw_row[:width]] + [""] * max(0, width - len(raw_row))
            if any(padded):
                body.append(padded)
        if not body:
            continue
        try:
            return normalize_rows(pd.DataFrame(body, columns=header))
        except ScheduleParseError:
            continue
    return []


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


def _normalize_ai_tasks(raw_tasks: List[Any]) -> List[Dict[str, Any]]:
    """Normalize structured tasks returned by Gemini into the exact schema compute_cpm expects."""
    tasks: List[Dict[str, Any]] = []
    has_any_deps = any(
        isinstance(item, dict) and bool(_parse_predecessors(item.get("predecessors")))
        for item in raw_tasks
    )
    for idx, item in enumerate(raw_tasks):
        if not isinstance(item, dict):
            continue
        name = str(item.get("task") or item.get("name") or item.get("activity") or "").strip()
        planned = _parse_duration_days(item.get("planned_days"))
        if planned is None:
            planned = _parse_duration_days(item.get("planned"))
        if not name or planned is None or planned <= 0:
            continue
        actual = _parse_duration_days(item.get("actual_days"))
        if actual is None:
            actual = _parse_duration_days(item.get("actual"))
        if actual is not None and actual <= 0:
            actual = None
        code = str(item.get("code") or f"WBS-{len(tasks) + 1}").strip()
        preds = _parse_predecessors(item.get("predecessors"))
        critical_raw = item.get("critical")
        critical_declared = bool(critical_raw) if isinstance(critical_raw, bool) else _to_bool(critical_raw)

        tasks.append(
            _build_task_dict(
                code=code or f"WBS-{idx + 1}",
                name=name,
                planned=planned,
                actual=actual,
                work_center=str(item.get("work_center") or "").strip(),
                owner=str(item.get("owner") or "").strip(),
                predecessors=preds,
                has_dependency_column=has_any_deps,
                status_declared=str(item.get("status") or "").strip(),
                critical_declared=critical_declared,
            )
        )
    return tasks


def _extract_schedule_with_gemini(
    filename: str,
    pdf_bytes: Optional[bytes] = None,
    text: str = "",
) -> Tuple[Optional[Dict[str, Any]], Optional[str]]:
    """Use Gemini to read PDF bytes or Word text directly into structured WBS tasks and summary."""
    api_key = os.environ.get("GEMINI_API_KEY", "").strip()
    if not api_key:
        return None, None

    model = os.environ.get("GEMINI_MODEL", "gemini-2.5-flash").strip() or "gemini-2.5-flash"
    instruction = (
        "Extract every work-breakdown / manufacturing schedule activity from this document into strict JSON "
        "matching this exact schema:\n"
        '{"project_name": "string or null", '
        '"document_summary": "3-5 sentence summary of scope, milestones, constraints, and key risks", '
        '"tasks": [{"code": "WBS-1.1", "task": "Activity name", "planned_days": 5.0, '
        '"actual_days": 5.0, "predecessors": ["WBS-1.0"], "work_center": "", '
        '"owner": "", "status": "", "critical": false}]}.\n'
        "Convert durations in weeks (1w = 5 days) or hours (8h = 1 day) to numeric days. "
        "If actual_days is omitted, set it equal to planned_days. Return JSON only."
    )

    parts: List[Dict[str, Any]] = []
    if pdf_bytes is not None:
        parts.append(
            {
                "inline_data": {
                    "mime_type": "application/pdf",
                    "data": base64.b64encode(pdf_bytes).decode("ascii"),
                }
            }
        )
        preview = f"\n\nExtracted text preview:\n{text[:8000]}" if text.strip() else ""
        parts.append({"text": f"Filename: {filename}\n\n{instruction}{preview}"})
    else:
        parts.append(
            {"text": f"Filename: {filename}\n\n{instruction}\n\nDocument content:\n{text[:24000]}"}
        )

    url = (
        f"https://generativelanguage.googleapis.com/v1beta/models/{urllib.parse.quote(model)}:generateContent"
        f"?key={urllib.parse.quote(api_key)}"
    )
    payload = json.dumps(
        {
            "contents": [{"role": "user", "parts": parts}],
            "generationConfig": {
                "responseMimeType": "application/json",
                "temperature": 0.1,
            },
        }
    ).encode("utf-8")
    req = urllib.request.Request(
        url, data=payload, headers={"Content-Type": "application/json"}, method="POST"
    )
    try:
        with urllib.request.urlopen(req, timeout=35) as resp:
            data = json.loads(resp.read().decode("utf-8"))
        raw = data["candidates"][0]["content"]["parts"][0]["text"].strip()
        cleaned_json = re.sub(
            r"^```(?:json)?\s*|\s*```$", "", raw, flags=re.IGNORECASE
        ).strip()
        parsed = json.loads(cleaned_json)
    except urllib.error.HTTPError as exc:
        if exc.code in (400, 401, 403):
            return None, "Invalid GEMINI_API_KEY"
        if exc.code == 429:
            return None, "Gemini API quota or rate limit exceeded"
        return None, f"Gemini HTTP {exc.code}"
    except (ValueError, KeyError, IndexError):
        return None, "Gemini returned invalid schedule JSON"
    except Exception:
        return None, "Gemini API request timed out or failed"

    if not isinstance(parsed, dict):
        return None, "Gemini returned unexpected schedule format"

    tasks = _normalize_ai_tasks(parsed.get("tasks") or [])
    if not tasks:
        return None, "Gemini found no WBS activities with planned durations"

    proj_raw = parsed.get("project_name")
    project_name = str(proj_raw).strip() if isinstance(proj_raw, str) and proj_raw.strip() else None
    summary_raw = parsed.get("document_summary")
    document_summary = (
        str(summary_raw).strip() if isinstance(summary_raw, str) and summary_raw.strip() else None
    )
    return {
        "project_name": project_name,
        "document_summary": document_summary,
        "tasks": tasks,
    }, None


def compute_cpm(tasks: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Forward/backward CPM pass on planned durations. Mutates and returns tasks with
    start_day, float_days, critical, upstream_slip_days and variance_days.
    If no dependency column exists, activities are treated as a sequential chain.
    """
    codes = [t["code"] for t in tasks]
    index = {c: i for i, c in enumerate(codes)}
    no_dep_column = not any(t.get("has_dependency_column") for t in tasks)
    for i, t in enumerate(tasks):
        if no_dep_column and not t.get("predecessors"):
            t["predecessors"] = [codes[i - 1]] if i > 0 else []
        t["predecessors"] = [p for p in t.get("predecessors", []) if p in index and p != t["code"]]

    # Topological order (Kahn); falls back to file order on cycles.
    indeg = {c: 0 for c in codes}
    succ: Dict[str, List[str]] = {c: [] for c in codes}
    for t in tasks:
        for p in t["predecessors"]:
            succ[p].append(t["code"])
            indeg[t["code"]] += 1
    queue = [c for c in codes if indeg[c] == 0]
    order: List[str] = []
    while queue:
        c = queue.pop(0)
        order.append(c)
        for s in succ[c]:
            indeg[s] -= 1
            if indeg[s] == 0:
                queue.append(s)
    if len(order) != len(codes):
        order = codes

    es: Dict[str, float] = {}
    ef: Dict[str, float] = {}
    for c in order:
        t = tasks[index[c]]
        es[c] = max((ef[p] for p in t["predecessors"] if p in ef), default=0.0)
        ef[c] = es[c] + t["planned_days"]
    project_end = max(ef.values())

    lf: Dict[str, float] = {}
    ls: Dict[str, float] = {}
    for c in reversed(order):
        t = tasks[index[c]]
        lf[c] = min((ls[s] for s in succ[c] if s in ls), default=project_end)
        ls[c] = lf[c] - t["planned_days"]

    # Propagated slip: forecast overrun carried forward through predecessors.
    carried: Dict[str, float] = {}
    for c in order:
        t = tasks[index[c]]
        upstream = max((carried[p] for p in t["predecessors"] if p in carried), default=0.0)
        variance = t["actual_days"] - t["planned_days"]
        t["start_day"] = int(round(es[c]))
        t["float_days"] = round(max(0.0, ls[c] - es[c]), 2)
        t["critical"] = t["float_days"] <= 1e-6
        t["upstream_slip_days"] = round(upstream, 2)
        t["variance_days"] = round(variance, 2)
        carried[c] = max(0.0, upstream + variance)
    return tasks


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


def parse_schedule_document(content: bytes, filename: str) -> Dict[str, Any]:
    """Parse CSV, Excel, Word (.docx/.doc), or PDF files into CPM-computed WBS tasks and text metadata."""
    low = filename.lower()
    if low.endswith((".csv", ".txt", ".xlsx", ".xlsm", ".xls")):
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

        ai_result, ai_error = _extract_schedule_with_gemini(filename, text=full_text)
        if ai_result:
            return _doc_result(
                ai_result["tasks"],
                "gemini_document",
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
        raise ScheduleParseError(
            f"Could not find WBS activities with planned durations in {filename}. "
            "Include a schedule table (Activity Name + Planned Duration), or configure GEMINI_API_KEY for AI reading."
        )

    if low.endswith(".pdf"):
        pdf_text = _extract_pdf_text(content, filename)
        ai_result, ai_error = _extract_schedule_with_gemini(filename, pdf_bytes=content, text=pdf_text)
        if ai_result:
            combined = "\n\n".join(
                part for part in (ai_result.get("document_summary") or "", pdf_text) if part.strip()
            )
            return _doc_result(
                ai_result["tasks"],
                "gemini_pdf",
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
        if not pdf_text.strip():
            raise ScheduleParseError(
                f"No extractable text found in {filename}. Scanned PDFs require GEMINI_API_KEY so AI can read the file."
            )
        raise ScheduleParseError(
            f"Could not extract WBS tasks with planned durations from {filename}. "
            "Configure GEMINI_API_KEY for AI document reading or include columns like Activity Name and Planned Duration (days)."
        )

    raise ScheduleParseError(
        f"Unsupported file type: {filename}. Upload a .csv, .xlsx, .pdf, or .docx schedule."
    )


def parse_schedule_file(content: bytes, filename: str) -> List[Dict[str, Any]]:
    return parse_schedule_document(content, filename)["tasks"]
