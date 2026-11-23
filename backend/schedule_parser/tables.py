"""Tabular schedule readers: CSV, Excel, Primavera P6 (.xer), and MS Project (.xml)."""

import io
import re
from typing import Any, Dict, List, Optional, Tuple
import xml.etree.ElementTree as ET

import pandas as pd

from schedule_parser.base import (
    ScheduleParseError,
    _build_task_dict,
    _map_columns,
    _parse_date,
    _parse_duration_days,
    _parse_pred_links,
    _to_bool,
    _to_float,
)

_WBS_CODE_RE = re.compile(r"^(?:([A-Za-z]+)[-_\s]*)?(\d+(?:\.\d+)*)$")
_ISO_DUR_RE = re.compile(
    r"^P(?:(\d+(?:\.\d+)?)D)?(?:T(?:(\d+(?:\.\d+)?)H)?(?:(\d+(?:\.\d+)?)M)?(?:(\d+(?:\.\d+)?)S)?)?$",
    re.IGNORECASE,
)
_MSP_REL_MAP = {"0": "FF", "1": "FS", "2": "SF", "3": "SS"}


def _wbs_segments(code: str) -> Optional[Tuple[str, Tuple[int, ...]]]:
    m = _WBS_CODE_RE.match(str(code).strip())
    if not m:
        return None
    prefix = (m.group(1) or "").lower()
    nums = [int(p) for p in m.group(2).split(".")]
    while len(nums) > 1 and nums[-1] == 0:
        nums.pop()
    return prefix, tuple(nums)


def _strip_wbs_summary_rows(tasks: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Remove WBS summary/parent roll-up rows and re-point dependencies onto terminal leaf children."""
    if len(tasks) < 3:
        return tasks

    segs = {t["code"]: _wbs_segments(t["code"]) for t in tasks}
    children_map: Dict[str, List[Dict[str, Any]]] = {}
    stripped_codes = set()

    for t in tasks:
        seg_p = segs[t["code"]]
        if seg_p is None:
            continue
        pref_p, tup_p = seg_p
        children = [
            c
            for c in tasks
            if c["code"] != t["code"]
            and segs[c["code"]] is not None
            and segs[c["code"]][0] == pref_p
            and len(segs[c["code"]][1]) > len(tup_p)
            and segs[c["code"]][1][: len(tup_p)] == tup_p
        ]
        if len(children) < 2:
            continue
        child_codes = {c["code"] for c in children}
        p_preds = set(t.get("predecessors", []))
        if p_preds & child_codes:
            continue
        max_child_dur = max(float(c["planned_days"]) for c in children)
        if t.get("is_summary") is True or float(t["planned_days"]) + 1e-6 >= max_child_dur:
            stripped_codes.add(t["code"])
            children_map[t["code"]] = children

    if not stripped_codes or len(stripped_codes) == len(tasks):
        return tasks

    terminal_map: Dict[str, List[str]] = {}
    for p_code in stripped_codes:
        leaves = [c for c in children_map[p_code] if c["code"] not in stripped_codes]
        if not leaves:
            terminal_map[p_code] = []
            continue
        leaf_codes = {c["code"] for c in leaves}
        non_terminal = {
            pred for c in leaves for pred in c.get("predecessors", []) if pred in leaf_codes
        }
        terminals = [c["code"] for c in leaves if c["code"] not in non_terminal]
        terminal_map[p_code] = terminals or [c["code"] for c in leaves]

    kept: List[Dict[str, Any]] = []
    for t in tasks:
        if t["code"] in stripped_codes:
            continue
        subtree_parents = {p_code for p_code, chs in children_map.items() if any(c["code"] == t["code"] for c in chs)}
        new_links: List[Dict[str, Any]] = []
        seen = set()
        for link in t.get("pred_links", [{"code": c, "rel": "FS", "lag_days": 0.0} for c in t.get("predecessors", [])]):
            p_code = link["code"]
            if p_code in stripped_codes:
                if p_code in subtree_parents:
                    continue
                for repl in terminal_map.get(p_code, []):
                    key = (repl, link.get("rel", "FS"), float(link.get("lag_days", 0.0)))
                    if repl != t["code"] and key not in seen:
                        seen.add(key)
                        new_links.append({"code": repl, "rel": key[1], "lag_days": key[2]})
            else:
                key = (p_code, link.get("rel", "FS"), float(link.get("lag_days", 0.0)))
                if key not in seen:
                    seen.add(key)
                    new_links.append({"code": p_code, "rel": key[1], "lag_days": key[2]})
        t["pred_links"] = new_links
        t["predecessors"] = list(dict.fromkeys(l["code"] for l in new_links))
        kept.append(t)
    return kept


def _parse_iso_duration_days(text: Optional[str]) -> Optional[float]:
    if not text:
        return None
    m = _ISO_DUR_RE.match(text.strip())
    if not m:
        return None
    days = float(m.group(1) or 0.0)
    hours = float(m.group(2) or 0.0)
    mins = float(m.group(3) or 0.0)
    secs = float(m.group(4) or 0.0)
    return days + (hours / 8.0) + (mins / 480.0) + (secs / 28800.0)


def _local_tag(tag: str) -> str:
    return tag.split("}")[-1] if "}" in tag else tag


def _read_xer_tables(content: bytes) -> pd.DataFrame:
    """Parse Primavera P6 .xer TASK, TASKPRED, CALENDAR, RSRC, TASKRSRC, and PROJECT tables."""
    try:
        text = content.decode("utf-8-sig")
    except UnicodeDecodeError:
        text = content.decode("cp1252", errors="replace")

    tables: Dict[str, List[Dict[str, str]]] = {}
    cur_table: Optional[str] = None
    cur_fields: List[str] = []

    for line in text.splitlines():
        if not line:
            continue
        parts = line.split("\t")
        tag = parts[0]
        if tag == "%T" and len(parts) > 1:
            cur_table = parts[1].strip().upper()
            tables.setdefault(cur_table, [])
            cur_fields = []
        elif tag == "%F":
            cur_fields = [f.strip() for f in parts[1:]]
        elif tag == "%R" and cur_table and cur_fields:
            vals = parts[1:] + [""] * max(0, len(cur_fields) - len(parts[1:]))
            tables[cur_table].append(dict(zip(cur_fields, vals)))

    raw_tasks = tables.get("TASK", [])
    if not raw_tasks:
        raise ScheduleParseError("No %T TASK records found in Primavera P6 .xer file.")

    cal_hours: Dict[str, float] = {}
    for cal in tables.get("CALENDAR", []):
        cid = cal.get("clndr_id", "").strip()
        raw_day_hr = cal.get("day_hr_cnt", "").strip()
        if cid and raw_day_hr:
            try:
                hr = float(raw_day_hr)
                if hr > 0:
                    cal_hours[cid] = hr
            except ValueError:
                pass

    rsrc_names: Dict[str, str] = {}
    for r in tables.get("RSRC", []):
        rid = r.get("rsrc_id", "").strip()
        rname = (r.get("rsrc_name") or r.get("rsrc_short_name") or "").strip()
        if rid and rname:
            rsrc_names[rid] = rname

    task_wc: Dict[str, str] = {}
    for tr in tables.get("TASKRSRC", []):
        tid = tr.get("task_id", "").strip()
        rid = tr.get("rsrc_id", "").strip()
        if tid and tid not in task_wc and rid in rsrc_names:
            task_wc[tid] = rsrc_names[rid]

    recalc_dt = None
    for proj in tables.get("PROJECT", []):
        recalc_dt = _parse_date(proj.get("last_recalc_date"))
        if recalc_dt is not None:
            break

    id_to_code: Dict[str, str] = {}
    task_day_hr: Dict[str, float] = {}
    used_codes = set()
    filtered_tasks = []
    for row in raw_tasks:
        if row.get("task_type", "").strip().upper() in {"TT_WBS", "TT_LOE"}:
            continue
        tid = row.get("task_id", "").strip()
        tcode = row.get("task_code", "").strip() or tid
        if tcode in used_codes and tid:
            tcode = f"{tcode}-{tid}"
        if tid:
            id_to_code[tid] = tcode
            task_day_hr[tid] = cal_hours.get(row.get("clndr_id", "").strip(), 8.0)
        used_codes.add(tcode)
        filtered_tasks.append((tid, tcode, row))

    preds_by_tid: Dict[str, List[str]] = {}
    for pred_row in tables.get("TASKPRED", []):
        tid = pred_row.get("task_id", "").strip()
        p_tid = pred_row.get("pred_task_id", "").strip()
        if tid and p_tid in id_to_code:
            p_code = id_to_code[p_tid]
            rel = pred_row.get("pred_type", "PR_FS").replace("PR_", "").upper() or "FS"
            day_hr = task_day_hr.get(tid, 8.0)
            try:
                lag_days = float(pred_row.get("lag_hr_cnt") or 0.0) / day_hr
            except ValueError:
                lag_days = 0.0
            tok = f"{p_code}{rel}" + (f"{lag_days:+.4g}d" if abs(lag_days) > 1e-6 else "")
            preds_by_tid.setdefault(tid, []).append(tok)

    rows = []
    for tid, tcode, row in filtered_tasks:
        day_hr = cal_hours.get(row.get("clndr_id", "").strip(), 8.0)
        dur_days: Any = ""
        raw_hr = row.get("target_drtn_hr_cnt", "").strip()
        if raw_hr:
            try:
                dur_days = round(float(raw_hr) / day_hr, 4)
            except ValueError:
                dur_days = ""
        status_code = row.get("status_code", "").strip()
        status = "Completed" if status_code == "TK_Complete" else status_code

        actual_forecast: Any = ""
        act_start_raw = row.get("act_start_date", "").strip()
        remain_raw = row.get("remain_drtn_hr_cnt", "").strip()
        if status_code == "TK_Active" and remain_raw and act_start_raw and recalc_dt is not None:
            act_start_dt = _parse_date(act_start_raw)
            if act_start_dt is not None:
                try:
                    remain_days = max(0.0, float(remain_raw) / day_hr)
                    elapsed_days = max(0.0, (recalc_dt - act_start_dt).total_seconds() / 86400.0)
                    actual_forecast = round(elapsed_days + remain_days, 4)
                except ValueError:
                    actual_forecast = ""

        rows.append({
            "WBS Code": tcode,
            "Activity Name": row.get("task_name", "").strip(),
            "Planned Duration": dur_days,
            "Actual_Forecast_Days": actual_forecast,
            "Planned Start": row.get("target_start_date", "").strip(),
            "Planned Finish": row.get("target_end_date", "").strip(),
            "Actual Start": act_start_raw,
            "Actual Finish": row.get("act_end_date", "").strip(),
            "Assigned_Work_Center": task_wc.get(tid, ""),
            "Predecessors": ";".join(preds_by_tid.get(tid, [])),
            "Status": status,
        })
    return pd.DataFrame(rows)


def _read_msp_xml_tables(content: bytes) -> pd.DataFrame:
    """Parse MS Project XML <Task> elements into a normalized DataFrame."""
    try:
        root = ET.fromstring(content)
    except ET.ParseError as exc:
        raise ScheduleParseError(f"Invalid MS Project XML file: {exc}") from exc

    task_elems = [el for el in root.iter() if _local_tag(el.tag) == "Task"]
    if not task_elems:
        raise ScheduleParseError("No <Task> elements found in MS Project XML file.")

    def _child_text(parent: ET.Element, name: str) -> str:
        for ch in parent:
            if _local_tag(ch.tag) == name and ch.text:
                return ch.text.strip()
        return ""

    valid_nodes = []
    uid_to_code: Dict[str, str] = {}
    used_codes = set()
    for el in task_elems:
        uid = _child_text(el, "UID")
        name = _child_text(el, "Name")
        summary = _child_text(el, "Summary")
        if uid == "0" or summary == "1" or not name:
            continue
        code = _child_text(el, "WBS") or uid or name
        if code in used_codes and uid:
            code = f"{code}-{uid}"
        used_codes.add(code)
        if uid:
            uid_to_code[uid] = code
        valid_nodes.append((code, el))

    rows = []
    for code, el in valid_nodes:
        dur_days = _parse_iso_duration_days(_child_text(el, "Duration"))
        pred_tokens = []
        for ch in el:
            if _local_tag(ch.tag) != "PredecessorLink":
                continue
            p_uid = _child_text(ch, "PredecessorUID")
            if p_uid in uid_to_code:
                rel = _MSP_REL_MAP.get(_child_text(ch, "Type") or "1", "FS")
                lag_raw = _child_text(ch, "LinkLag")
                try:
                    lag_days = float(lag_raw) / 4800.0 if lag_raw else 0.0
                except ValueError:
                    lag_days = 0.0
                tok = f"{uid_to_code[p_uid]}{rel}" + (f"{lag_days:+.4g}d" if abs(lag_days) > 1e-6 else "")
                pred_tokens.append(tok)
        pct = _child_text(el, "PercentComplete")
        status = "Completed" if pct in {"100", "100.0"} else ""
        rows.append({
            "WBS Code": code,
            "Activity Name": _child_text(el, "Name"),
            "Planned Duration": dur_days if dur_days is not None else "",
            "Planned Start": _child_text(el, "Start"),
            "Planned Finish": _child_text(el, "Finish"),
            "Actual Start": _child_text(el, "ActualStart"),
            "Actual Finish": _child_text(el, "ActualFinish"),
            "Work Center": _child_text(el, "WorkCenter") or _child_text(el, "ResourceNames"),
            "Predecessors": ";".join(pred_tokens),
            "Status": status,
        })
    return pd.DataFrame(rows)


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
    if name.endswith(".xer"):
        return _read_xer_tables(content)
    if name.endswith(".xml"):
        return _read_msp_xml_tables(content)
    raise ScheduleParseError(
        f"Unsupported file type: {filename}. Upload a .csv, .xlsx, .xer, .xml, .pdf, or .docx schedule."
    )


def normalize_rows(df: pd.DataFrame) -> List[Dict[str, Any]]:
    df = df.dropna(how="all")
    cols = _map_columns(list(df.columns))
    has_dates = "planned_start" in cols and "planned_finish" in cols
    if "task" not in cols or ("planned_days" not in cols and not has_dates):
        raise ScheduleParseError(
            "Could not find required columns. Need an activity name and either a planned duration "
            "or planned start/finish dates "
            f"(found headers: {', '.join(map(str, df.columns))})."
        )

    tasks: List[Dict[str, Any]] = []
    start_dates: List[Optional[Any]] = []
    for i, row in enumerate(df.to_dict(orient="records")):
        get = lambda f: row.get(cols[f]) if f in cols else None  # noqa: E731
        raw_name = get("task")
        name = "" if raw_name is None or (isinstance(raw_name, float) and pd.isna(raw_name)) else str(raw_name).strip()

        p_start = _parse_date(get("planned_start")) if "planned_start" in cols else None
        p_finish = _parse_date(get("planned_finish")) if "planned_finish" in cols else None
        planned = _parse_duration_days(get("planned_days")) if "planned_days" in cols else None
        if planned is None and p_start is not None and p_finish is not None and p_finish >= p_start:
            planned = max(0.25, (p_finish - p_start).total_seconds() / 86400.0)
        if not name or planned is None or planned < 0:
            continue

        actual = _parse_duration_days(get("actual_days")) if "actual_days" in cols else None
        if actual is not None and actual < 0:
            actual = None
        if actual is None and "actual_finish" in cols:
            a_start = _parse_date(get("actual_start")) if "actual_start" in cols else None
            a_finish = _parse_date(get("actual_finish"))
            eff_start = a_start or p_start
            if eff_start is not None and a_finish is not None and a_finish >= eff_start:
                actual = max(0.25, (a_finish - eff_start).total_seconds() / 86400.0)

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
        pred_links = [] if dep_val is None or (isinstance(dep_val, float) and pd.isna(dep_val)) else _parse_pred_links(dep_val)
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
                pred_links=pred_links,
                has_dependency_column="dependency" in cols,
                status_declared=status_declared,
                critical_declared=_to_bool(get("critical_declared")),
                resource_utilization=util,
                drawing_revisions=_to_float(get("drawing_revisions")),
                external_dependency=_to_bool(get("external_dependency")),
            )
        )
        start_dates.append(p_start)

    valid_starts = [dt for dt in start_dates if dt is not None]
    if valid_starts:
        min_start = min(valid_starts)
        for t, dt in zip(tasks, start_dates):
            if dt is not None:
                start_off = max(0.0, (dt - min_start).total_seconds() / 86400.0)
                t["start_offset_days"] = round(start_off, 4)
                t["finish_offset_days"] = round(start_off + t["planned_days"], 4)

    if not tasks:
        raise ScheduleParseError("No schedule rows with an activity name and planned duration were found.")
    return _strip_wbs_summary_rows(tasks)


def _table_rows_to_tasks(rows: List[List[str]]) -> List[Dict[str, Any]]:
    """Try normalizing extracted matrix rows (e.g. from Word or text tables) into WBS tasks."""
    for hdr_idx in range(min(5, len(rows))):
        header = [str(cell or "").strip() for cell in rows[hdr_idx]]
        if not any(header):
            continue
        cols = _map_columns(header)
        has_dates = "planned_start" in cols and "planned_finish" in cols
        if "task" not in cols or ("planned_days" not in cols and not has_dates):
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
