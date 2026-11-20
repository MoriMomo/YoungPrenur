"""Critical Path Method: forward/backward pass, float, critical path and upstream slip.
"""

from typing import Any, Dict, List


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
