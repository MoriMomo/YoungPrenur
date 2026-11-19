"""
Build historical_wbs_tasks.csv from verified real-world empirical datasets:
  1. DSLIB v3.4 (UGent Empirical Project Database with true CPM DAGs and tracking actuals)
  2. 4TU Levy 2014 Production_Data.csv (precision CNC machining job-shop routing logs)

Enforces strict anti-leakage rules:
  - CNC baseline planned_days is computed strictly causally from prior orders only.
  - Task input features are computed at pre-start snapshot (`forecast_variance_days = 0.0`).

Usage:  python -m ml.build_real_dataset  (from backend/)
"""

import glob
import os
import re
import sys
from collections import defaultdict, deque
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
import openpyxl
import pandas as pd

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from ml.features import FEATURE_NAMES, infer_category, task_features  # noqa: E402
from schedule_parser import compute_cpm  # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(HERE, "data")
RAW_DIR = os.path.join(DATA_DIR, "raw")
DSLIB_EXCEL_DIR = os.path.join(RAW_DIR, "dslib", "DSLIB 3.4", "Excel")
CNC_CSV_PATH = os.path.join(RAW_DIR, "Production_Data.csv")
HIST_PATH = os.path.join(DATA_DIR, "historical_wbs_tasks.csv")


def _parse_dslib_duration_days(val: Any) -> Optional[float]:
    """Convert DSLIB duration strings ('1d', '4h', '2w', '30m', or numeric) into 8h workdays."""
    if val is None:
        return None
    if isinstance(val, (int, float)):
        f = float(val)
        return None if np.isnan(f) else f
    s = str(val).strip().lower().replace(",", ".")
    if not s or s in {"-", "none", "nan", "n/a"}:
        return None
    m = re.match(r"^(-?\d+(?:\.\d+)?)\s*([dwmh]?)$", s)
    if not m:
        return None
    num = float(m.group(1))
    unit = m.group(2) or "d"
    if unit == "h":
        return num / 8.0
    if unit == "m":
        return num / 480.0
    if unit == "w":
        return num * 5.0
    return num


def _parse_dslib_preds(val: Any) -> List[str]:
    """Extract predecessor activity IDs from tokens like '1FS', '9SS+3d', or '3FS;7FS'."""
    if val is None:
        return []
    raw = str(val).strip()
    if not raw or raw.lower() in {"none", "nan", "-"}:
        return []
    preds: List[str] = []
    for tok in re.split(r"[;,|/]+", raw):
        tok = tok.strip()
        if not tok:
            continue
        m = re.match(r"^([A-Za-z0-9._-]+?)(?:FS|SS|FF|SF)(?:[+-].*)?$", tok, re.IGNORECASE)
        if m:
            preds.append(m.group(1))
            continue
        m2 = re.match(r"^([A-Za-z0-9._-]+)$", tok)
        if m2:
            preds.append(m2.group(1))
    return preds


def _find_header_index(rows: List[Tuple[Any, ...]], required_cols: Tuple[str, ...]) -> Optional[Tuple[int, Dict[str, int]]]:
    for idx, row in enumerate(rows[:10]):
        col_map: Dict[str, int] = {}
        for col_i, cell in enumerate(row):
            if cell is not None:
                key = " ".join(str(cell).strip().lower().split())
                if key not in col_map:
                    col_map[key] = col_i
        if all(req in col_map for req in required_cols):
            return idx, col_map
    return None


def _tp_sort_key(sheet_name: str) -> int:
    m = re.search(r"tp\s*(\d+)", sheet_name, re.IGNORECASE)
    return int(m.group(1)) if m else 0


def _tasks_to_rows(project_id: str, tasks: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    compute_cpm(tasks)
    out: List[Dict[str, Any]] = []
    for t in tasks:
        f = task_features({**t, "actual_days": t["planned_days"]})  # pre-start snapshot
        realized_slip = round(max(0.0, float(t["actual_days"]) - float(t["planned_days"])), 2)
        row: Dict[str, Any] = {name: f[name] for name in FEATURE_NAMES}
        row.update({
            "project_id": project_id,
            "code": t["code"],
            "task": t["task"],
            "category": t["category"],
            "realized_slip_days": realized_slip,
            "late": int(realized_slip > f["float_days"] + 0.5),
        })
        out.append(row)
    return out


def extract_dslib_rows(excel_dir: str = DSLIB_EXCEL_DIR) -> Tuple[List[Dict[str, Any]], int]:
    """Extract empirical projects with tracking actuals and CPM DAGs from DSLIB Excel workbooks."""
    if not os.path.isdir(excel_dir):
        return [], 0

    files = sorted(
        f for f in glob.glob(os.path.join(excel_dir, "*.xlsx"))
        if not os.path.basename(f).startswith("._")
    )
    all_rows: List[Dict[str, Any]] = []
    n_projects = 0

    for path in files:
        fname = os.path.basename(path)
        proj_code = fname.split(" ", 1)[0].strip()
        wb = openpyxl.load_workbook(path, read_only=True, data_only=True)
        try:
            if "Baseline Schedule" not in wb.sheetnames:
                continue
            pc_sheets = sorted(
                [s for s in wb.sheetnames if "project control" in s.lower()],
                key=_tp_sort_key,
            )
            if not pc_sheets:
                continue

            base_rows = list(wb["Baseline Schedule"].iter_rows(values_only=True))
            base_hdr = _find_header_index(base_rows, ("id", "name", "duration"))
            if not base_hdr:
                continue
            b_idx, b_cols = base_hdr

            pc_rows = list(wb[pc_sheets[-1]].iter_rows(values_only=True))
            pc_hdr = _find_header_index(pc_rows, ("id", "actual duration"))
            if not pc_hdr:
                continue
            p_idx, p_cols = pc_hdr
        finally:
            wb.close()

        tracking_by_id: Dict[str, Dict[str, Any]] = {}
        for row in pc_rows[p_idx + 1:]:
            if not row or row[p_cols["id"]] is None:
                continue
            aid = str(row[p_cols["id"]]).strip()
            act_dur = _parse_dslib_duration_days(row[p_cols["actual duration"]])
            rem_col = p_cols.get("remaining duration")
            rem_dur = _parse_dslib_duration_days(row[rem_col]) if rem_col is not None and rem_col < len(row) else None
            start_col = p_cols.get("actual start")
            act_start = row[start_col] if start_col is not None and start_col < len(row) else None
            tracking_by_id[aid] = {
                "actual_days": act_dur,
                "remaining_days": rem_dur,
                "actual_start": act_start,
            }

        raw_activities: List[Dict[str, Any]] = []
        wbs_values: List[str] = []
        wbs_col = b_cols.get("wbs")
        pred_col = b_cols.get("predecessors")
        res_col = b_cols.get("resource demand")

        for row in base_rows[b_idx + 1:]:
            if not row or row[b_cols["id"]] is None:
                continue
            aid = str(row[b_cols["id"]]).strip()
            name = str(row[b_cols["name"]] or "").strip()
            if not aid or not name or aid == "0":
                continue
            wbs = str(row[wbs_col]).strip() if wbs_col is not None and wbs_col < len(row) and row[wbs_col] is not None else ""
            if wbs:
                wbs_values.append(wbs)
            planned = _parse_dslib_duration_days(row[b_cols["duration"]])
            preds = _parse_dslib_preds(row[pred_col]) if pred_col is not None and pred_col < len(row) else []
            res_text = str(row[res_col] or "").strip() if res_col is not None and res_col < len(row) else ""
            raw_activities.append({
                "code": aid,
                "task": name,
                "wbs": wbs,
                "planned_days": planned,
                "preds": preds,
                "work_center": res_text,
            })

        # Keep leaf WBS nodes only (drop parent summary rollups).
        parent_wbs: set[str] = set()
        for w in wbs_values:
            parts = w.split(".")
            for i in range(1, len(parts)):
                parent_wbs.add(".".join(parts[:i]))

        tasks: List[Dict[str, Any]] = []
        for item in raw_activities:
            if item["wbs"] and item["wbs"] in parent_wbs:
                continue
            planned = item["planned_days"]
            trk = tracking_by_id.get(item["code"])
            if planned is None or trk is None:
                continue
            actual = trk["actual_days"]
            if actual is None or actual <= 0 or planned <= 0:
                continue
            rem = trk["remaining_days"]
            is_finished = (rem is not None and rem <= 1e-6) or (rem is None and trk["actual_start"] is not None)
            if not is_finished:
                continue
            if not (0.25 <= planned <= 90.0 and 0.25 <= actual <= 120.0):
                continue

            cat = infer_category(item["task"], item["work_center"])
            tasks.append({
                "code": item["code"],
                "task": item["task"],
                "planned_days": round(planned, 2),
                "actual_days": round(actual, 2),
                "predecessors": item["preds"],
                "has_dependency_column": True,
                "work_center": item["work_center"],
                "category": cat,
            })

        if len(tasks) < 4:
            continue

        all_rows.extend(_tasks_to_rows(f"dslib_{proj_code}", tasks))
        n_projects += 1

    return all_rows, n_projects


def _parse_span_hours(val: Any) -> float:
    m = re.match(r"^\s*(\d+):(\d{2})\s*$", str(val or "").strip())
    if not m:
        return 0.0
    return int(m.group(1)) + int(m.group(2)) / 60.0


def extract_cnc_4tu_rows(csv_path: str = CNC_CSV_PATH, warmup_cases: int = 15) -> Tuple[List[Dict[str, Any]], int]:
    """Extract real CNC machining orders with strictly causal prior-order standard times."""
    if not os.path.exists(csv_path):
        return [], 0

    df = pd.read_csv(csv_path)
    df.columns = [" ".join(str(c).split()) for c in df.columns]
    df["_hours"] = df["Span"].map(_parse_span_hours)

    def _case_num(val: Any) -> int:
        m = re.search(r"(\d+)", str(val or ""))
        return int(m.group(1)) if m else 0

    df["_case_num"] = df["Case ID"].map(_case_num)

    # Merge consecutive log lines belonging to the same (Case ID, Activity, Resource) routing step.
    orders: Dict[int, List[Dict[str, Any]]] = defaultdict(list)
    for row in df.to_dict(orient="records"):
        cid = int(row["_case_num"])
        act = " ".join(str(row.get("Activity") or "").split())
        res = " ".join(str(row.get("Resource") or "").split())
        part = " ".join(str(row.get("Part Desc.") or "").split())
        qty = float(row.get("Work Order Qty") or 1.0)
        hrs = float(row["_hours"] or 0.0)
        if not cid or not act or hrs <= 0.0:
            continue

        steps = orders[cid]
        if steps and steps[-1]["activity"] == act and steps[-1]["resource"] == res:
            steps[-1]["hours"] += hrs
            steps[-1]["qty"] = max(steps[-1]["qty"], qty)
        else:
            steps.append({
                "activity": act,
                "resource": res,
                "part": part,
                "qty": max(1.0, qty),
                "hours": hrs,
            })

    prior_part_act: Dict[Tuple[str, str], List[float]] = defaultdict(list)
    prior_act: Dict[str, List[float]] = defaultdict(list)
    rolling_res_orders: deque[set[str]] = deque(maxlen=20)

    all_rows: List[Dict[str, Any]] = []
    n_projects = 0

    for case_num in sorted(orders.keys()):
        steps = orders[case_num]
        # Compute rolling utilization share from strictly prior orders.
        res_counts: Dict[str, int] = defaultdict(int)
        for used_set in rolling_res_orders:
            for r in used_set:
                res_counts[r] += 1
        win_len = max(1, len(rolling_res_orders))

        tasks: List[Dict[str, Any]] = []
        if case_num > warmup_cases:
            for idx, st in enumerate(steps):
                act = st["activity"]
                part = st["part"]
                qty = st["qty"]
                if len(prior_part_act[(part, act)]) >= 3:
                    med_hpu = float(np.median(prior_part_act[(part, act)]))
                elif len(prior_act[act]) >= 3:
                    med_hpu = float(np.median(prior_act[act]))
                else:
                    continue

                planned_days = max(0.25, round((med_hpu * qty) / 8.0, 2))
                actual_days = max(0.25, round(st["hours"] / 8.0, 2))
                share = res_counts.get(st["resource"], 0) / win_len
                util = round(min(0.98, max(0.55, 0.55 + 0.43 * share)), 3)

                cat = infer_category(act, st["resource"])
                tasks.append({
                    "code": f"OP-{idx + 1}",
                    "task": act,
                    "planned_days": planned_days,
                    "actual_days": actual_days,
                    "predecessors": [],
                    "has_dependency_column": False,
                    "work_center": st["resource"],
                    "resource_utilization": util,
                    "category": cat,
                })

            if len(tasks) >= 3:
                all_rows.extend(_tasks_to_rows(f"cnc_{case_num:04d}", tasks))
                n_projects += 1

        # Update causal priors only AFTER predicting planned_days for this entire order.
        order_resources: set[str] = set()
        for st in steps:
            hpu = st["hours"] / max(1.0, st["qty"])
            prior_part_act[(st["part"], st["activity"])].append(hpu)
            prior_act[st["activity"]].append(hpu)
            if st["resource"]:
                order_resources.add(st["resource"])
        rolling_res_orders.append(order_resources)

    return all_rows, n_projects


def build_historical_dataset(out_path: str = HIST_PATH) -> pd.DataFrame:
    dslib_rows, dslib_projs = extract_dslib_rows()
    cnc_rows, cnc_projs = extract_cnc_4tu_rows()

    combined = dslib_rows + cnc_rows
    if not combined:
        raise RuntimeError("No real historical rows extracted. Check raw files under backend/ml/data/raw/.")

    df = pd.DataFrame(combined)
    df["project_id"] = df["project_id"].astype(str)
    df = df.drop_duplicates(subset=["project_id", "code"], keep="last").reset_index(drop=True)
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    df.to_csv(out_path, index=False)

    print(f"Wrote {len(df)} tasks across {df['project_id'].nunique()} projects to {out_path}")
    for tag, n_proj, sub in [
        ("dslib", dslib_projs, df[df["project_id"].str.startswith("dslib_")]),
        ("cnc_4tu", cnc_projs, df[df["project_id"].str.startswith("cnc_")]),
    ]:
        cats = sub["category"].value_counts().head(5).to_dict() if len(sub) else {}
        print(
            f"  - {tag}: {n_proj} projects, {len(sub)} tasks | "
            f"late={sub['late'].mean():.1%} | mean_slip={sub['realized_slip_days'].mean():.2f}d | top_cats={cats}"
        )
    return df


if __name__ == "__main__":
    build_historical_dataset()
