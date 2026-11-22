"""
Shared feature engineering for the delay-risk model.

Training (train.py) and live inference (predictor.py) both call `task_features`
so the model always sees features computed the same way.
"""

from typing import Any, Dict, List

# Work-center categories, checked in order (first keyword hit wins).
CATEGORY_KEYWORDS = [
    (
        "subcontract",
        [
            "subcontract", "heat treat", "hardening", "coating", "plating", "outsourc", "furnace",
            "anodiz", "galvaniz", "passivat", "steriliz", "gamma irrad", "contract mfg", " cm ", " ems ", "external lab",
        ],
    ),
    (
        "procurement",
        [
            "procure", "raw material", "raw ingot", "ingot", "material", "purchase", "supply chain", "receiving", "vendor",
            "bom ", "component", "wafer", "resin", "pellet", " api ", "excipient", "customs", "import", "lead time", "supplier", "sourcing",
        ],
    ),
    (
        "engineering",
        [
            "drawing", "cad", "cam", "design", "blueprint", "sign-off", "engineering review",
            "gerber", "schematic", "layout", "recipe", "formulation", "validation protocol", "iq/oq", "dfm", "fmea", "plc", "firmware", "programming",
        ],
    ),
    (
        "stamping",
        [
            "stamp", "press", "forming", "die",
            "molding", "injection", "extrusion", "thermoform", "casting", "forging", "tablet press", "compression", "punch", "blanking",
        ],
    ),
    (
        "machining",
        [
            "cnc", "milling", "lathe", "machin", "edm", "grind", "turning", "lapping", "wire cut", "laser", "setup", "round grinding", "flat grinding",
            "smt", "reflow", "pick and place", "wave solder", "etch", "lithography", "coat", "dispens", "compound", "mixing", "granulat", "ferment", "reactor", "distill", "curing", "autoclave", "weld", "fabricat", " cut",
        ],
    ),
    (
        "assembly",
        [
            "assembl", "cleanroom", "fitting",
            "integrat", "sub-assembl", "subassembl", "wiring", "harness", "panel build", "box build", "encapsulat", "filling", "bottling", "blister", "kitting", "splicing",
        ],
    ),
    (
        "quality",
        [
            "cmm", "metrology", "quality", "inspection", "qa ", " qa", "q.c.", "qc", "acceptance test",
            " aoi", "aoi ", "x-ray", " ict", "ict ", "functional test", "burn-in", " fat", "fat ", " sat", "sat ", "hplc", "assay", "microbio", "stability", "sterility", "calibration", "audit", "verify", "validation",
        ],
    ),
    (
        "logistics",
        [
            "logistic", "dispatch", "packag", "packing", "shipping", "dock",
            "cold chain", "pallet", "warehouse", "freight", "export", "release", "handover", "delivery",
        ],
    ),
]
CATEGORIES = [name for name, _ in CATEGORY_KEYWORDS] + ["other"]

EXTERNAL_CATEGORIES = {"procurement", "subcontract"}

# Typical shop-floor load per category when the schedule has no utilization column.
DEFAULT_UTILIZATION = {
    "subcontract": 0.75, "procurement": 0.70, "engineering": 0.85, "stamping": 0.90,
    "machining": 0.88, "assembly": 0.85, "quality": 0.75, "logistics": 0.60, "other": 0.80,
}

NUMERIC_FEATURES = [
    "planned_days",
    "float_days",
    "on_critical_path",
    "forecast_variance_days",
    "upstream_slip_days",
    "external_dependency",
    "n_predecessors",
    "resource_utilization",
    "drawing_revisions",
]
FEATURE_NAMES = NUMERIC_FEATURES + [f"wc_{c}" for c in CATEGORIES]

# Human-readable driver labels used in the dashboard's root-cause breakdown.
FEATURE_LABELS = {
    "planned_days": "Activity duration",
    "float_days": "Thin schedule float buffer",
    "on_critical_path": "On critical path (zero float)",
    "forecast_variance_days": "Forecast overrun vs. plan",
    "upstream_slip_days": "Upstream predecessor slippage",
    "external_dependency": "External vendor / subcontract dependency",
    "n_predecessors": "Dependency fan-in",
    "resource_utilization": "Work-center capacity load",
    "drawing_revisions": "Drawing revision churn",
}
CATEGORY_LABELS = {
    "subcontract": "Subcontract process", "procurement": "Material procurement",
    "engineering": "Engineering / drawing review", "stamping": "Stamping press constraint",
    "machining": "CNC machining capacity", "assembly": "Assembly cell staffing",
    "quality": "Quality / metrology gate", "logistics": "Logistics & dispatch", "other": "Other work center",
}


def infer_category(task_name: str, work_center: str = "") -> str:
    text = f" {task_name} {work_center} ".lower()
    for name, keywords in CATEGORY_KEYWORDS:
        if any(k in text for k in keywords):
            return name
    return "other"


def feature_label(feature: str) -> str:
    if feature.startswith("wc_"):
        return CATEGORY_LABELS.get(feature[3:], feature)
    return FEATURE_LABELS.get(feature, feature)


def task_features(task: Dict[str, Any]) -> Dict[str, float]:
    """Map a normalized WBS task dict (see schedule_parser) to model features."""
    category = task.get("category") or infer_category(task.get("task", ""), task.get("work_center", ""))
    planned = float(task.get("planned_days", 1) or 1)
    actual = float(task.get("actual_days", planned) or planned)
    external = task.get("external_dependency")
    if external is None:
        external = category in EXTERNAL_CATEGORIES
    utilization = task.get("resource_utilization")
    if utilization is None:
        utilization = task.get("computed_utilization")
    if utilization is None:
        utilization = DEFAULT_UTILIZATION[category]

    feats = {
        "planned_days": planned,
        "float_days": float(task.get("float_days", 0) or 0),
        "on_critical_path": 1.0 if task.get("critical") else 0.0,
        "forecast_variance_days": actual - planned,
        "upstream_slip_days": float(task.get("upstream_slip_days", 0) or 0),
        "external_dependency": 1.0 if external else 0.0,
        "n_predecessors": float(len(task.get("predecessors", []) or [])),
        "resource_utilization": float(utilization),
        "drawing_revisions": float(task.get("drawing_revisions", 0) or 0),
    }
    for c in CATEGORIES:
        feats[f"wc_{c}"] = 1.0 if c == category else 0.0
    return feats


def feature_matrix(tasks: List[Dict[str, Any]]) -> List[List[float]]:
    rows = []
    for t in tasks:
        f = task_features(t)
        rows.append([f[name] for name in FEATURE_NAMES])
    return rows
