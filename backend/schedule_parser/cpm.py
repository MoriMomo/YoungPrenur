"""Critical Path Method: forward/backward pass, float, critical path and upstream slip.
"""

from collections import deque
from typing import Any, Dict, List


from schedule_parser.base import ScheduleParseError


def compute_cpm(tasks: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Forward/backward CPM pass on planned durations. Mutates and returns tasks with
    start_day, float_days, critical, upstream_slip_days and variance_days.
    If no dependency column exists, activities are treated as a sequential chain.
    """
    codes = [t["code"] for t in tasks]
    index = {c: i for i, c in enumerate(codes)}
    if len(index) != len(codes):
        raise ScheduleParseError("Duplicate task IDs in schedule.")
    no_dep_column = not any(t.get("has_dependency_column") for t in tasks)
    for i, t in enumerate(tasks):
        if no_dep_column and not t.get("predecessors"):
            t["predecessors"] = [codes[i - 1]] if i > 0 else []
        t["predecessors"] = list(dict.fromkeys(t.get("predecessors", [])))
        for predecessor in t["predecessors"]:
            if predecessor not in index:
                raise ScheduleParseError(f"Task {t['code']} references unknown predecessor {predecessor}.")

    # Topological order (Kahn).
    indeg = {c: 0 for c in codes}
    succ: Dict[str, List[str]] = {c: [] for c in codes}
    for t in tasks:
        for p in t["predecessors"]:
            succ[p].append(t["code"])
            indeg[t["code"]] += 1
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
        es[c] = max((ef[p] for p in t["predecessors"] if p in ef), default=0.0)
        ef[c] = es[c] + t["planned_days"]

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

    lf: Dict[str, float] = {}
    ls: Dict[str, float] = {}
    for c in reversed(order):
        t = tasks[index[c]]
        lf[c] = min((ls[s] for s in succ[c] if s in ls), default=comp_end[comp_id[c]])
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
