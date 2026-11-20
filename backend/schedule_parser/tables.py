"""CSV and Excel schedules: read the sheet and normalize its rows into WBS tasks.
"""

import io
from typing import Any, Dict, List

import pandas as pd

from schedule_parser.base import ScheduleParseError, _build_task_dict, _map_columns, _parse_duration_days, _parse_predecessors, _to_bool, _to_float


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
