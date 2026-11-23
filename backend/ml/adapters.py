"""Dataset adapters for DSLIB v3.4 (.xlsx) and Levy (2014) Production_Data.csv."""

from __future__ import annotations

import re
from pathlib import Path
from typing import Any

import numpy as np
import openpyxl
import pandas as pd

_PDM_TOKEN_RE = re.compile(
    r"(?:(?P<rel_pre>FS|SS|FF|SF)\s*(?P<id_post>\d+)|"
    r"(?P<id_pre>\d+)\s*(?P<rel_post>FS|SS|FF|SF)?)"
    r"(?:\s*(?P<lag>[+-]\s*\d+(?:\.\d+)?)\s*[dh]?)?",
    re.IGNORECASE,
)


def _find_header_row(df_raw: pd.DataFrame, required_tokens: set[str], max_scan: int = 15) -> int:
    """Locate header row index in Excel sheets with metadata banners above the table."""
    for idx in range(min(max_scan, len(df_raw))):
        cells = {str(v).strip().lower() for v in df_raw.iloc[idx].values if pd.notna(v)}
        if required_tokens.issubset(cells):
            return idx
    raise ValueError(f"Could not find header row containing {required_tokens}")


def _read_excel_table(xlsx_path: Path, sheet_name: str, required_tokens: set[str]) -> pd.DataFrame:
    raw = pd.read_excel(xlsx_path, sheet_name=sheet_name, header=None, engine="openpyxl")
    hdr = _find_header_row(raw, required_tokens)
    df = raw.iloc[hdr + 1 :].copy()
    df.columns = [str(c).strip() for c in raw.iloc[hdr].values]
    return df.dropna(how="all").reset_index(drop=True)


def _parse_pred_tokens(raw_pred: object, valid_leaf_ids: set[str]) -> str:
    """Extract leaf predecessor links, preserving PDM relation and lag when present."""
    if pd.isna(raw_pred) or str(raw_pred).strip() in ("", "-", "0", "nan"):
        return ""
    found: list[str] = []
    for part in re.split(r"[;,\s]+", str(raw_pred).strip()):
        m = _PDM_TOKEN_RE.search(part)
        if not m:
            continue
        pid = m.group("id_pre") or m.group("id_post")
        if not pid or pid not in valid_leaf_ids:
            continue
        rel = (m.group("rel_pre") or m.group("rel_post") or "").upper()
        lag = (m.group("lag") or "").replace(" ", "")
        token = f"{pid}{rel}{lag}" if rel else pid
        if token not in found:
            found.append(token)
    return ";".join(found)


def _strip_dslib_summary_rows(df: pd.DataFrame, wbs_col: str = "WBS") -> pd.DataFrame:
    """Drop parent WBS roll-up rows (e.g. '1.2' when '1.2.1' exists) to avoid CPM double-counting."""
    if wbs_col not in df.columns:
        return df
    wbs_values = [str(v).strip() for v in df[wbs_col].fillna("")]
    wbs_set = {w for w in wbs_values if w}
    is_parent = [bool(w) and any(other.startswith(f"{w}.") for other in wbs_set) for w in wbs_values]
    return df.loc[~np.array(is_parent, dtype=bool)].reset_index(drop=True)


def _parse_resource_map(xlsx_path: Path, sheet_names: list[str]) -> dict[str, dict[str, Any]]:
    res_sheet = next((s for s in sheet_names if "resource" in s.lower()), None)
    if not res_sheet:
        return {}
    try:
        rdf = _read_excel_table(xlsx_path, res_sheet, {"id", "name"})
    except ValueError:
        return {}
    res_map: dict[str, dict[str, Any]] = {}
    for _, row in rdf.iterrows():
        rid = str(row.get("ID", "")).strip()
        if not rid or rid.lower() == "nan":
            continue
        avail = pd.to_numeric(row.get("Availability", 1.0), errors="coerce")
        res_map[rid] = {
            "name": str(row.get("Name", f"Resource_{rid}")).strip(),
            "type": str(row.get("Type", "Renewable")).strip().lower(),
            "availability": float(avail) if pd.notna(avail) and avail > 0 else 1.0,
        }
    return res_map


def _parse_resource_demand(demand_val: object, res_map: dict[str, dict[str, Any]]) -> tuple[str, float]:
    if pd.isna(demand_val) or not str(demand_val).strip():
        return ("General Operations", 0.5)
    tokens = re.findall(r"([A-Za-z0-9_]+)\s*(?:\[\s*(\d+(?:\.\d+)?)\s*\])?", str(demand_val))
    if not tokens:
        return (str(demand_val).strip(), 0.5)
    ratios: list[float] = []
    names: list[str] = []
    for tok, qty_str in tokens:
        rid = re.sub(r"^[Rr]", "", tok)
        qty = float(qty_str) if qty_str else 1.0
        info = res_map.get(rid) or res_map.get(tok)
        if info:
            names.append(info["name"])
            if "renew" in info["type"]:
                ratios.append(min(1.0, qty / info["availability"]))
        else:
            names.append(tok)
    wc_name = names[0] if names else "General Operations"
    util = float(np.clip(max(ratios) if ratios else 0.5, 0.05, 1.0))
    return (wc_name, util)


def _extract_tp_df(xlsx_path: Path, sheet_name: str) -> pd.DataFrame | None:
    try:
        return _read_excel_table(xlsx_path, sheet_name, {"id", "actual duration"})
    except ValueError:
        return None


def _build_mdip_frame_from_dslib(
    base_df: pd.DataFrame,
    tp_df: pd.DataFrame,
    res_map: dict[str, dict[str, Any]],
) -> pd.DataFrame:
    tp_idx = tp_df.copy()
    tp_idx["ID"] = tp_idx["ID"].astype(str).str.strip()
    tp_lookup = tp_idx.set_index("ID")

    leaf_ids = set(base_df["ID"].astype(str).str.strip())
    rows: list[dict[str, Any]] = []

    for _, row in base_df.iterrows():
        tid = str(row["ID"]).strip()
        planned = float(pd.to_numeric(row.get("Duration", 0.0), errors="coerce") or 0.0)
        wc_name, util = _parse_resource_demand(row.get("Resource Demand"), res_map)
        is_ext = int(any(k in wc_name.lower() for k in ("subcontract", "vendor", "supplier", "ext")))

        pc = 0.0
        actual_dur = 0.0
        if tid in tp_lookup.index:
            trow = tp_lookup.loc[tid]
            if isinstance(trow, pd.DataFrame):
                trow = trow.iloc[0]
            pc_raw = pd.to_numeric(trow.get("PC", 0.0), errors="coerce")
            pc = float(pc_raw) if pd.notna(pc_raw) else 0.0
            if pc > 1.0:
                pc = pc / 100.0
            ad_raw = pd.to_numeric(trow.get("Actual Duration", 0.0), errors="coerce")
            actual_dur = float(ad_raw) if pd.notna(ad_raw) else 0.0

        if pc >= 0.999:
            status = "Completed"
            forecast_days = actual_dur if actual_dur > 0 else planned
        elif pc > 0.0:
            status = "In Progress"
            forecast_days = actual_dur / max(pc, 0.10) if actual_dur > 0 else planned
        else:
            status = "Not Started"
            forecast_days = planned

        rows.append(
            {
                "WBS_Code": tid,
                "Activity_Name": str(row.get("Name", f"Task_{tid}")).strip(),
                "Planned_Duration_Days": max(0.0, planned),
                "Actual_Forecast_Days": max(0.0, round(forecast_days, 3)),
                "Predecessors": _parse_pred_tokens(row.get("Predecessors"), leaf_ids),
                "Assigned_Work_Center": wc_name,
                "Owner": wc_name,
                "Status": status,
                "Resource_Utilization": round(util, 3),
                "Drawing_Revisions": 0,
                "External_Vendor": "External" if is_ext else "",
            }
        )
    return pd.DataFrame(rows)


def load_dslib_snapshot_pairs(xlsx_path: str | Path) -> list[tuple[str, pd.DataFrame, pd.DataFrame]]:
    """Pair intermediate DSLIB TP tabs (inputs) with the final TP tab (ground truth)."""
    xlsx_path = Path(xlsx_path)
    wb = openpyxl.load_workbook(xlsx_path, read_only=True, data_only=True)
    sheet_names = wb.sheetnames
    wb.close()

    base_sheet = next((s for s in sheet_names if "baseline" in s.lower()), sheet_names[0])
    base_df = _read_excel_table(xlsx_path, base_sheet, {"id", "name", "duration"})
    base_df["ID"] = base_df["ID"].astype(str).str.strip()
    base_df = base_df[base_df["ID"].str.lower() != "nan"].copy()
    base_df = _strip_dslib_summary_rows(base_df, wbs_col="WBS")

    res_map = _parse_resource_map(xlsx_path, sheet_names)

    tp_sheets: list[tuple[str, pd.DataFrame]] = []
    for s in sheet_names:
        if s == base_sheet or "resource" in s.lower() or "agenda" in s.lower():
            continue
        tdf = _extract_tp_df(xlsx_path, s)
        if tdf is not None and len(tdf) > 0:
            tp_sheets.append((s, tdf))

    if len(tp_sheets) < 2:
        return []

    _, final_tp = tp_sheets[-1]
    final_df = _build_mdip_frame_from_dslib(base_df, final_tp, res_map)

    mid_candidates = tp_sheets[:-1]
    pick_indices = sorted(
        set(np.linspace(0, len(mid_candidates) - 1, num=min(3, len(mid_candidates)), dtype=int))
    )
    pairs: list[tuple[str, pd.DataFrame, pd.DataFrame]] = []
    for idx in pick_indices:
        tp_name, tp_df = mid_candidates[idx]
        snap_df = _build_mdip_frame_from_dslib(base_df, tp_df, res_map)
        pairs.append((f"{xlsx_path.stem}__{tp_name}", snap_df, final_df))
    return pairs


def load_levy_production_schedules(
    csv_path: str | Path,
    train_ratio: float = 0.70,
    shift_hours: float = 8.0,
) -> tuple[list[tuple[str, pd.DataFrame, pd.DataFrame]], list[tuple[str, pd.DataFrame, pd.DataFrame]]]:
    """Convert Levy (2014) Production_Data.csv into chronological train/test (snapshot, final) pairs."""
    df = pd.read_csv(csv_path)
    df["Start Timestamp"] = pd.to_datetime(df["Start Timestamp"])
    df["Complete Timestamp"] = pd.to_datetime(df["Complete Timestamp"])
    df["dur_days"] = (
        (df["Complete Timestamp"] - df["Start Timestamp"]).dt.total_seconds() / (3600.0 * shift_hours)
    ).clip(lower=0.05)

    case_starts = df.groupby("Case ID")["Start Timestamp"].min().sort_values()
    split_idx = int(len(case_starts) * train_ratio)
    train_cases = set(case_starts.index[:split_idx])

    train_step_totals = (
        df[df["Case ID"].isin(train_cases)]
        .groupby(["Case ID", "Activity"])["dur_days"]
        .sum()
        .reset_index()
    )
    activity_planned = train_step_totals.groupby("Activity")["dur_days"].median().to_dict()
    global_median = float(train_step_totals["dur_days"].median())

    resource_intervals = {
        res: grp[["Start Timestamp", "Complete Timestamp"]].to_numpy()
        for res, grp in df.groupby("Resource")
    }
    res_max_conc = {
        res: max(
            1,
            int(np.max([np.sum((iv[:, 0] <= t) & (iv[:, 1] >= t)) for t in iv[:, 0]])),
        )
        for res, iv in resource_intervals.items()
    }

    train_pairs: list[tuple[str, pd.DataFrame, pd.DataFrame]] = []
    test_pairs: list[tuple[str, pd.DataFrame, pd.DataFrame]] = []

    for case_id, grp in df.groupby("Case ID"):
        grp = grp.sort_values("Start Timestamp")
        agg = (
            grp.groupby("Activity", sort=False)
            .agg(
                first_start=("Start Timestamp", "min"),
                last_end=("Complete Timestamp", "max"),
                actual_days=("dur_days", "sum"),
                resource=("Resource", "first"),
                worker=("Worker ID", "first"),
            )
            .reset_index()
            .sort_values("first_start")
            .reset_index(drop=True)
        )
        if len(agg) < 3:
            continue

        cutoff = agg["first_start"].iloc[len(agg) // 2]
        snap_rows: list[dict[str, Any]] = []
        final_rows: list[dict[str, Any]] = []
        prev_code = ""

        for i, r in agg.iterrows():
            code = f"{case_id}.{i + 1:02d}"
            planned = float(activity_planned.get(r["Activity"], global_median))
            actual = float(r["actual_days"])
            res_name = str(r["resource"])

            iv = resource_intervals[res_name]
            conc = int(np.sum((iv[:, 0] <= r["first_start"]) & (iv[:, 1] >= r["first_start"])))
            util = min(1.0, conc / max(1, res_max_conc[res_name]))

            if r["last_end"] <= cutoff:
                snap_status = "Completed"
                snap_forecast = actual
            elif r["first_start"] < cutoff < r["last_end"]:
                snap_status = "In Progress"
                elapsed = max(0.05, (cutoff - r["first_start"]).total_seconds() / (3600.0 * shift_hours))
                snap_forecast = max(planned, elapsed)
            else:
                snap_status = "Not Started"
                snap_forecast = planned

            base_record = {
                "WBS_Code": code,
                "Activity_Name": str(r["Activity"]),
                "Planned_Duration_Days": round(planned, 3),
                "Predecessors": prev_code,
                "Assigned_Work_Center": res_name,
                "Owner": str(r["worker"]),
                "Resource_Utilization": round(util, 3),
                "Drawing_Revisions": 0,
                "External_Vendor": "",
            }
            snap_rows.append({**base_record, "Actual_Forecast_Days": round(snap_forecast, 3), "Status": snap_status})
            final_rows.append({**base_record, "Actual_Forecast_Days": round(actual, 3), "Status": "Completed"})
            prev_code = code

        pair = (f"levy_{case_id}", pd.DataFrame(snap_rows), pd.DataFrame(final_rows))
        if case_id in train_cases:
            train_pairs.append(pair)
        else:
            test_pairs.append(pair)

    return train_pairs, test_pairs
