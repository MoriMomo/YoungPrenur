"""Critical Path Method: forward/backward pass, float, critical path and upstream slip.
"""

from collections import deque
from typing import Any, Dict, List


from schedule_parser.base import ScheduleParseError


def _compute_wc_concurrency(tasks: List[Dict[str, Any]], index: Dict[str, int], es: Dict[str, float], ef: Dict[str, float]) -> None:
    """Compute time-weighted overlapping task count per work center and store computed_utilization."""
    groups: Dict[str, List[str]] = {}
    for t in tasks:
        wc = (t.get("work_center") or "").strip().lower()
        if wc:
            groups.setdefault(wc, []).append(t["code"])

    for codes in groups.values():
        if len(codes) < 2:
            continue
        intervals = [(es[c], ef[c]) for c in codes]
        for c in codes:
            dur = ef[c] - es[c]
            if dur <= 1e-6:
                continue
            overlap_sum = sum(max(0.0, min(ef[c], e_j) - max(es[c], s_j)) for s_j, e_j in intervals)
            concurrency = overlap_sum / dur
            if concurrency > 1.0 + 1e-6:
                tasks[index[c]]["computed_utilization"] = round(min(0.98, 0.72 + 0.10 * (concurrency - 1.0)), 3)


def compute_cpm(tasks: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Forward/backward PDM/CPM pass on planned durations. Mutates and returns tasks with
    start_day, float_days, critical, upstream_slip_days, variance_days, and computed_utilization.
    Uses start/finish dates when present on dependency-less sheets; falls back to sequential chain otherwise.
    """
    codes = [t["code"] for t in tasks]
    index = {c: i for i, c in enumerate(codes)}
    if len(index) != len(codes):
        raise ScheduleParseError("Duplicate task IDs in schedule.")

    no_dep_column = not any(t.get("has_dependency_column") for t in tasks)
    has_dates = any("start_offset_days" in t for t in tasks)
    if no_dep_column:
        if has_dates:
            for t in tasks:
                if "start_offset_days" in t:
                    t["date_es_floor"] = float(t["start_offset_days"])
            for i, t in enumerate(tasks):
                if t.get("predecessors"):
                    continue
                t_start = float(t.get("start_offset_days", 0.0))
                eligible = []
                for j, prev in enumerate(tasks):
                    if j == i or "finish_offset_days" not in prev:
                        continue
                    prev_fin = float(prev["finish_offset_days"])
                    # Ensure strict DAG order even for zero-duration milestones at identical start times.
                    if prev_fin < t_start - 1e-6 or (abs(prev_fin - t_start) <= 1e-6 and float(prev["planned_days"]) > 0) or (abs(prev_fin - t_start) <= 1e-6 and j < i):
                        eligible.append((prev_fin, prev["code"]))
                if eligible:
                    max_fin = max(fin for fin, _ in eligible)
                    t["predecessors"] = [code for fin, code in eligible if abs(fin - max_fin) <= 1e-6]
        else:
            for i, t in enumerate(tasks):
                if not t.get("predecessors"):
                    t["predecessors"] = [codes[i - 1]] if i > 0 else []

    edges_in: Dict[str, List[tuple]] = {c: [] for c in codes}
    edges_out: Dict[str, List[tuple]] = {c: [] for c in codes}
    indeg = {c: 0 for c in codes}
    succ: Dict[str, List[str]] = {c: [] for c in codes}

    for t in tasks:
        raw_links = t.get("pred_links")
        if raw_links:
            seen_links = set()
            clean_links = []
            for link in raw_links:
                p_code = link["code"]
                rel = str(link.get("rel", "FS")).upper()
                lag = float(link.get("lag_days", 0.0))
                key = (p_code, rel, lag)
                if key not in seen_links:
                    seen_links.add(key)
                    clean_links.append({"code": p_code, "rel": rel, "lag_days": lag})
        else:
            clean_links = [{"code": p, "rel": "FS", "lag_days": 0.0} for p in dict.fromkeys(t.get("predecessors", []))]

        t["pred_links"] = clean_links
        t["predecessors"] = list(dict.fromkeys(link["code"] for link in clean_links))
        for predecessor in t["predecessors"]:
            if predecessor not in index:
                raise ScheduleParseError(f"Task {t['code']} references unknown predecessor {predecessor}.")
            succ[predecessor].append(t["code"])
            indeg[t["code"]] += 1
        for link in clean_links:
            edges_in[t["code"]].append((link["code"], link["rel"], link["lag_days"]))
            edges_out[link["code"]].append((t["code"], link["rel"], link["lag_days"]))

    # Topological order (Kahn).
    queue = deque(c for c in codes if indeg[c] == 0)
    order: List[str] = []
    while queue:
        c = queue.popleft()
        order.append(c)
        for s in succ[c]:
            indeg[s] -= 1
            if indeg[s] == 0:
                queue.append(s)
    if len(order) != len(codes):
        raise ScheduleParseError("Circular task dependencies in schedule.")

    es: Dict[str, float] = {}
    ef: Dict[str, float] = {}
    for c in order:
        t = tasks[index[c]]
        dur_c = float(t["planned_days"])
        earliest = float(t.get("date_es_floor", 0.0))
        for p, rel, lag in edges_in[c]:
            if rel == "SS":
                cand = es[p] + lag
            elif rel == "FF":
                cand = ef[p] - dur_c + lag
            elif rel == "SF":
                cand = es[p] - dur_c + lag
            else:  # FS
                cand = ef[p] + lag
            if cand > earliest:
                earliest = cand
        es[c] = max(0.0, earliest)
        ef[c] = es[c] + dur_c

    # Compute connected components so independent orders in one sheet don't inherit fake float.
    comp_id: Dict[str, int] = {}
    comp_end: Dict[int, float] = {}
    cid = 0
    for start_c in order:
        if start_c in comp_id:
            continue
        q = deque([start_c])
        comp_id[start_c] = cid
        max_ef = ef[start_c]
        while q:
            u = q.popleft()
            max_ef = max(max_ef, ef[u])
            for nb in (*tasks[index[u]]["predecessors"], *succ[u]):
                if nb not in comp_id:
                    comp_id[nb] = cid
                    q.append(nb)
        comp_end[cid] = max_ef
        cid += 1

    project_end = max(ef.values(), default=0.0)
    use_project_horizon = no_dep_column and has_dates

    lf: Dict[str, float] = {}
    ls: Dict[str, float] = {}
    for c in reversed(order):
        t = tasks[index[c]]
        dur_c = float(t["planned_days"])
        bound = project_end if use_project_horizon else comp_end[comp_id[c]]
        for s, rel, lag in edges_out[c]:
            if rel == "SS":
                cand_lf = (ls[s] - lag) + dur_c
            elif rel == "FF":
                cand_lf = lf[s] - lag
            elif rel == "SF":
                cand_lf = (lf[s] - lag) + dur_c
            else:  # FS
                cand_lf = ls[s] - lag
            if cand_lf < bound:
                bound = cand_lf
        lf[c] = bound
        ls[c] = lf[c] - dur_c

    _compute_wc_concurrency(tasks, index, es, ef)

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
