"""
Synthetic training data for the MDIP delay-risk model.

There is no labelled historical schedule data from the industry partner yet, so we
simulate project-based manufacturing jobs: each project is a dependency graph of WBS
activities that goes through the same CPM pass used at inference time. The realized
slip at completion is generated from domain heuristics (vendor dependency, capacity
load, drawing churn, upstream slip, forecast overrun) plus noise and unobserved
disruptions, so the model cannot score perfectly.

Replace this with real historical schedules (planned vs. actual) when available.

Usage:  python -m ml.generate_dataset  (from backend/)
"""

import os
import sys

import numpy as np
import pandas as pd

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from schedule_parser import compute_cpm  # noqa: E402
from ml.features import DEFAULT_UTILIZATION, EXTERNAL_CATEGORIES, FEATURE_NAMES, task_features  # noqa: E402

SEED = 42
N_PROJECTS = 900
OUT_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data", "synthetic_wbs_tasks.csv")

# (category, example activity names, planned-duration range in days)
STAGES = [
    ("engineering", ["Drawing Technical Review & CAD/CAM Sign-off", "Design Review & Blueprint Release"], (2, 6)),
    ("procurement", ["Raw Material Procurement (Alloy EN24)", "Raw Ingot Delivery & Receiving"], (3, 10)),
    ("machining", ["CNC 5-Axis Milling & Surface Profiling", "CNC Lathe Turning", "Wire EDM Profiling"], (3, 9)),
    ("stamping", ["Precision Stamping & Forming", "Stamping Die Tryout"], (2, 7)),
    ("subcontract", ["Heat Treatment & Surface Hardening (Subcontract)", "Surface Coating (Subcontract)"], (2, 6)),
    ("assembly", ["Sub-Assembly & Precision Tolerancing", "Final Assembly"], (3, 8)),
    ("quality", ["CMM Metrology & Quality Acceptance Test", "Final Inspection"], (1, 4)),
    ("logistics", ["Packaging & Customer Dispatch", "Logistics Dock Handover"], (1, 2)),
]
CATEGORY_EFFECT = {
    "engineering": 0.4, "procurement": 0.8, "machining": 0.3, "stamping": 0.5,
    "subcontract": 0.6, "assembly": 0.4, "quality": 0.1, "logistics": 0.0, "other": 0.2,
}


def simulate_project(rng: np.random.Generator, pid: int):
    # Pick a plausible sequence of stages; some stages repeat as parallel work packages.
    stages = [s for s in STAGES if rng.random() < 0.85]
    if len(stages) < 3:
        stages = STAGES[:3] + STAGES[-2:]
    extra = [STAGES[rng.integers(1, 6)] for _ in range(rng.integers(0, 5))]
    ordered = sorted(stages + extra, key=lambda s: [x[0] for x in STAGES].index(s[0]))

    tasks = []
    for i, (cat, names, (lo, hi)) in enumerate(ordered):
        planned = int(rng.integers(lo, hi + 1))
        util = float(np.clip(DEFAULT_UTILIZATION[cat] + rng.normal(0, 0.09), 0.4, 1.05))
        revisions = int(rng.poisson(0.9 if cat in {"engineering", "machining", "stamping"} else 0.2))
        external = cat in EXTERNAL_CATEGORIES or rng.random() < 0.05
        # Current forecast overrun, driven by the same pressures as the final slip.
        mean_var = 0.7 * external + 5 * max(0.0, util - 0.85) + 0.35 * revisions + 0.03 * planned
        variance = int(np.clip(np.round(rng.normal(mean_var, 0.9)), -1, 6))
        preds = []
        if i > 0:
            window = list(range(max(0, i - 3), i))
            k = 1 if rng.random() < 0.7 else 2
            preds = [f"P{pid}-T{j}" for j in rng.choice(window, size=min(k, len(window)), replace=False)]
        tasks.append({
            "code": f"P{pid}-T{i}",
            "task": str(rng.choice(names)),
            "category": cat,
            "planned_days": float(planned),
            "actual_days": float(max(1, planned + variance)),
            "predecessors": preds,
            "has_dependency_column": True,
            "resource_utilization": round(util, 3),
            "drawing_revisions": revisions,
            "external_dependency": external,
        })
    compute_cpm(tasks)

    rows = []
    for t in tasks:
        f = task_features(t)
        hidden_disruption = rng.binomial(1, 0.08) * rng.uniform(1, 4)  # machine breakdown, absenteeism...
        vendor_shock = rng.gamma(2.0, 0.8) if f["external_dependency"] else 0.0
        slip = (
            0.6 * max(0.0, f["forecast_variance_days"])
            + 0.45 * f["upstream_slip_days"]
            + vendor_shock
            + 6.0 * max(0.0, f["resource_utilization"] - 0.85)
            + 0.5 * f["drawing_revisions"]
            + 0.04 * f["planned_days"]
            + CATEGORY_EFFECT[t["category"]]
            + hidden_disruption
            + rng.normal(0, 0.8)
            - 2.0
        )
        slip = max(0.0, slip)
        row = {name: f[name] for name in FEATURE_NAMES}
        row.update({
            "project_id": pid,
            "code": t["code"],
            "task": t["task"],
            "category": t["category"],
            "realized_slip_days": round(slip, 2),
            "late": int(slip > f["float_days"] + 0.5),
        })
        rows.append(row)
    return rows


def main():
    rng = np.random.default_rng(SEED)
    rows = []
    for pid in range(N_PROJECTS):
        rows.extend(simulate_project(rng, pid))
    df = pd.DataFrame(rows)
    os.makedirs(os.path.dirname(OUT_PATH), exist_ok=True)
    df.to_csv(OUT_PATH, index=False)
    print(f"Wrote {len(df)} tasks from {N_PROJECTS} projects to {OUT_PATH}")
    print(f"Late rate: {df['late'].mean():.1%} | mean slip: {df['realized_slip_days'].mean():.2f}d")


if __name__ == "__main__":
    main()
