"""Column aliases, number and duration parsing, and the normalized task record.
"""

from datetime import date, datetime
import re
from typing import Any, Dict, List, Optional

import pandas as pd
from ml.features import infer_category


# Accepted header aliases (compared after lower-casing and stripping non-alphanumerics).
COLUMN_ALIASES = {
    "code": ["wbscode", "wbs", "code", "taskcode", "taskid", "id", "activityid", "kodewbs"],
    "task": ["activityname", "activity", "taskname", "task", "name", "description", "aktivitas", "namaaktivitas"],
    "planned_days": ["plannedduration", "planneddurationdays", "planneddays", "duration", "durationdays", "durasi", "durasirencana"],
    "actual_days": ["actualforecastdays", "forecastdays", "actualdays", "actualduration", "forecastduration", "durasiaktual"],
    "planned_start": ["plannedstart", "startdate", "start", "baselinestart", "plannedstartdate", "tglmulai", "mulai"],
    "planned_finish": ["plannedfinish", "finishdate", "enddate", "finish", "end", "duedate", "plannedenddate", "tglselesai", "selesai"],
    "actual_start": ["actualstart", "forecaststart", "actualstartdate", "mulaiaktual"],
    "actual_finish": ["actualfinish", "forecastfinish", "actualend", "actualenddate", "selesaiaktual"],
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


# "<code>[ ]FS|SS|FF|SF[ ±lag]" or "<code> ±lag" (FS implied). Lag units: d (default), h (8 h = 1 d), w (5 d).
_PRED_LINK_RE = re.compile(
    r"^(?P<code>.+?)\s*(?:"
    r"(?P<rel>FS|SS|FF|SF)(?:\s*(?P<sign>[+-])\s*(?P<val>\d+(?:\.\d+)?)\s*(?P<unit>[dhw]?))?"
    r"|(?P<psign>[+-])\s*(?P<pval>\d+(?:\.\d+)?)\s*(?P<punit>[dhw])"
    r")$",
    re.IGNORECASE,
)
_LAG_UNIT_DAYS = {"d": 1.0, "h": 1.0 / 8.0, "w": 5.0}


def _parse_pred_token(token: str) -> tuple[str, str, float]:
    """One predecessor token -> (code, relation, lag_days); anything unrecognised is a plain FS code."""
    raw = token.strip()
    m = _PRED_LINK_RE.match(raw)
    if not m:
        return raw, "FS", 0.0
    if m.group("rel"):
        sign, val, unit = m.group("sign"), m.group("val"), m.group("unit")
        # "GLASS" or "STAFF" are codes, not GLA+SS: a bare relation must follow a digit or a space.
        before = raw[m.start("rel") - 1]
        if val is None and not (before.isdigit() or before.isspace()):
            return raw, "FS", 0.0
    else:
        sign, val, unit = m.group("psign"), m.group("pval"), m.group("punit")
    lag = 0.0
    if val is not None:
        lag = (-1.0 if sign == "-" else 1.0) * float(val) * _LAG_UNIT_DAYS[(unit or "d").lower()]
    return m.group("code").strip(), (m.group("rel") or "FS").upper(), lag

_DATE_FORMATS = (
    "%Y-%m-%d",
    "%Y/%m/%d",
    "%d/%m/%Y",
    "%m/%d/%Y",
    "%d-%m-%Y",
    "%d.%m.%Y",
    "%Y-%m-%d %H:%M:%S",
    "%Y-%m-%dT%H:%M:%S",
    "%Y/%m/%d %H:%M:%S",
)


def _parse_date(val: Any) -> Optional[datetime]:
    """Parse common spreadsheet, ISO-8601, and export date values into naive datetimes."""
    if val is None or isinstance(val, bool):
        return None
    if isinstance(val, float) and pd.isna(val):
        return None
    if isinstance(val, datetime):
        return None if pd.isna(val) else val.replace(tzinfo=None)
    if isinstance(val, date):
        return datetime(val.year, val.month, val.day)
    s = str(val).strip()
    if not s or s.lower() in {"nan", "nat", "none", "-", "n/a"}:
        return None
    try:
        return datetime.fromisoformat(s.replace("Z", "+00:00")).replace(tzinfo=None)
    except ValueError:
        pass
    for fmt in _DATE_FORMATS:
        try:
            return datetime.strptime(s, fmt)
        except ValueError:
            continue
    return None


def _parse_pred_links(raw: Any) -> List[Dict[str, Any]]:
    """Parse predecessor strings/lists into structured PDM links ({code, rel, lag_days})."""
    if isinstance(raw, list):
        tokens = [str(item).strip() for item in raw if not (isinstance(item, dict))]
        if all(isinstance(item, dict) for item in raw) and raw:
            return [
                {
                    "code": str(item["code"]).strip(),
                    "rel": str(item.get("rel", "FS")).upper(),
                    "lag_days": float(item.get("lag_days", 0.0)),
                }
                for item in raw
                if str(item.get("code", "")).strip()
            ]
    else:
        deps_raw = str(raw or "").strip()
        if deps_raw.lower() in {"", "none", "nan", "-"}:
            return []
        tokens = [d.strip() for d in re.split(r"[;,|/]+", deps_raw) if d.strip()]

    links: List[Dict[str, Any]] = []
    seen = set()
    for tok in tokens:
        if not tok or tok.lower() in {"none", "nan", "-"}:
            continue
        code, rel, lag_days = _parse_pred_token(tok)
        key = (code, rel, lag_days)
        if code and key not in seen:
            seen.add(key)
            links.append({"code": code, "rel": rel, "lag_days": lag_days})
    return links


def _parse_predecessors(raw: Any) -> List[str]:
    return list(dict.fromkeys(link["code"] for link in _parse_pred_links(raw)))


def _build_task_dict(
    *,
    code: str,
    name: str,
    planned: float,
    actual: Optional[float] = None,
    work_center: str = "",
    owner: str = "",
    predecessors: Optional[List[str]] = None,
    pred_links: Optional[List[Dict[str, Any]]] = None,
    has_dependency_column: bool = False,
    status_declared: str = "",
    critical_declared: Optional[bool] = None,
    resource_utilization: Optional[float] = None,
    drawing_revisions: Optional[float] = None,
    external_dependency: Optional[bool] = None,
    start_offset_days: Optional[float] = None,
    finish_offset_days: Optional[float] = None,
) -> Dict[str, Any]:
    planned_days = 0.0 if planned == 0 else max(0.25, planned)
    if actual is None:
        actual_days = planned_days
    elif actual == 0:
        actual_days = 0.0
    else:
        actual_days = max(0.25, actual)

    if pred_links is not None:
        resolved_links = pred_links
        resolved_preds = predecessors if predecessors is not None else list(dict.fromkeys(l["code"] for l in pred_links))
    else:
        resolved_preds = predecessors or []
        resolved_links = [{"code": c, "rel": "FS", "lag_days": 0.0} for c in resolved_preds]

    task: Dict[str, Any] = {
        "code": code,
        "task": name,
        "planned_days": planned_days,
        "actual_days": actual_days,
        "work_center": work_center,
        "owner": owner,
        "predecessors": resolved_preds,
        "pred_links": resolved_links,
        "has_dependency_column": has_dependency_column,
        "status_declared": status_declared,
        "critical_declared": critical_declared,
        "resource_utilization": resource_utilization,
        "drawing_revisions": drawing_revisions,
        "external_dependency": external_dependency,
        "category": infer_category(name, work_center),
    }
    if start_offset_days is not None:
        task["start_offset_days"] = start_offset_days
    if finish_offset_days is not None:
        task["finish_offset_days"] = finish_offset_days
    return task
