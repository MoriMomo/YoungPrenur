"""Column aliases, number and duration parsing, and the normalized task record.
"""

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
    planned_days = 0.0 if planned == 0 else max(0.25, planned)
    if actual is None:
        actual_days = planned_days
    elif actual == 0:
        actual_days = 0.0
    else:
        actual_days = max(0.25, actual)
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
