"""
Schedule ingestion: parse CSV/XLSX master schedules into normalized WBS tasks
and run a Critical Path Method (CPM) pass to derive start days, float,
the critical path and propagated upstream slippage.
"""

import io
import re
from typing import Any, Dict, List, Optional

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


def _to_float(value: Any) -> Optional[float]:
    try:
        f = float(str(value).replace(",", ".").replace("%", "").strip())
        return None if pd.isna(f) else f
    except (TypeError, ValueError):
        return None


def read_table(content: bytes, filename: str) -> pd.DataFrame:
    name = filename.lower()
    if name.endswith((".xlsx", ".xlsm", ".xls")):
        return pd.read_excel(io.BytesIO(content))
    if name.endswith(".csv") or name.endswith(".txt"):
        text = content.decode("utf-8-sig", errors="replace")
        sep = ";" if text.splitlines()[0].count(";") > text.splitlines()[0].count(",") else ","
        return pd.read_csv(io.StringIO(text), sep=sep)
    raise ScheduleParseError(f"Unsupported file type: {filename}. Upload a .csv or .xlsx schedule.")


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
        planned = _to_float(get("planned_days"))
        if not name or planned is None:
            continue
        planned = max(1.0, planned)
        actual = _to_float(get("actual_days"))
        actual = max(1.0, actual) if actual is not None else planned
        code = str(get("code") or f"WBS-{i + 1}").strip()
        work_center = str(get("work_center") or "").strip()
        deps_raw = str(get("dependency") or "").strip()
        preds = [] if deps_raw.lower() in {"", "none", "nan", "-"} else [d.strip() for d in re.split(r"[;,|/]+", deps_raw) if d.strip()]
        util = _to_float(get("resource_utilization"))
        if util is not None and util > 1.5:
            util = util / 100.0

        tasks.append({
            "code": code,
            "task": name,
            "planned_days": planned,
            "actual_days": actual,
            "work_center": work_center,
            "owner": str(get("owner") or "").strip(),
            "predecessors": preds,
            "has_dependency_column": "dependency" in cols,
            "status_declared": str(get("status") or "").strip(),
            "critical_declared": _to_bool(get("critical_declared")),
            "resource_utilization": util,
            "drawing_revisions": _to_float(get("drawing_revisions")),
            "external_dependency": _to_bool(get("external_dependency")),
            "category": infer_category(name, work_center),
        })
    if not tasks:
        raise ScheduleParseError("No schedule rows with an activity name and planned duration were found.")
    return tasks


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
        t["float_days"] = int(round(max(0.0, ls[c] - es[c])))
        t["critical"] = t["float_days"] == 0
        t["upstream_slip_days"] = round(upstream, 2)
        t["variance_days"] = round(variance, 2)
        carried[c] = max(0.0, upstream + variance)
    return tasks


def parse_schedule_file(content: bytes, filename: str) -> List[Dict[str, Any]]:
    return compute_cpm(normalize_rows(read_table(content, filename)))
