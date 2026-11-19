from datetime import datetime, timezone
import hmac
import math
import os
import re
import sys
import time
from typing import Any, Dict, List, Optional

from fastapi import Body, FastAPI, File, Header, HTTPException, Path, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import database  # noqa: E402
from ml.features import infer_category  # noqa: E402
from ml.predictor import analyze_schedule, model_card, reload_models, score_tasks  # noqa: E402
from ml.train import ingest_historical_schedule, train_models  # noqa: E402
from schedule_parser import ScheduleParseError, compute_cpm, parse_schedule_file  # noqa: E402

DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")
DEFAULT_SCHEDULE_FILENAME = "master_project_schedule_rev3.csv"
DEFAULT_SCHEDULE_PATH = os.path.join(DATA_DIR, DEFAULT_SCHEDULE_FILENAME)
DEFAULT_PROJECT_NAME = "Project Alpha - Precision Stamping & Aerospace Tooling"

app = FastAPI(
    title="MDIP Manufacturing Decision Intelligence Platform API",
    description=(
        "Backend API serving SQLite-persisted IRoom System Connectors, CPM Scheduler, "
        "XGBoost Delay-Risk + SHAP + Monte Carlo Engine, and Grounded Copilot RAG."
    ),
    version="1.2.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# -------------------------------------------------------------
# Request Models
# -------------------------------------------------------------

class TaskItem(BaseModel):
    task_id: str
    name: str
    planned_days: int
    upstream_slip_days: int
    external_vendor: bool
    actual_days: Optional[int] = None
    float_days: Optional[int] = 0
    work_center: Optional[str] = ""
    resource_utilization: Optional[float] = None
    drawing_revisions: Optional[int] = 0


class CopilotQuery(BaseModel):
    question: Optional[str] = None
    message: Optional[str] = None
    role: Optional[str] = "Operations Manager"
    active_role: Optional[str] = None
    context_module: Optional[str] = None


class FlagActionPayload(BaseModel):
    action_id: str
    reviewer_role: Optional[str] = "Operations Manager"
    decision: Optional[str] = "AUTHORIZED"
    notes: Optional[str] = ""


class SopDocumentPayload(BaseModel):
    doc_code: str
    title: str
    clause: str
    keywords: List[str] = []
    excerpt: str


# -------------------------------------------------------------
# Schedule Initialization & Persistence
# -------------------------------------------------------------

def _analyze_default_schedule_file() -> Dict[str, Any]:
    if not os.path.exists(DEFAULT_SCHEDULE_PATH):
        raise RuntimeError(f"Baseline schedule file not found: {DEFAULT_SCHEDULE_PATH}")
    with open(DEFAULT_SCHEDULE_PATH, "rb") as f:
        content = f.read()
    tasks = parse_schedule_file(content, DEFAULT_SCHEDULE_FILENAME)
    return {
        "source": "file",
        "filename": DEFAULT_SCHEDULE_FILENAME,
        **analyze_schedule(tasks, DEFAULT_PROJECT_NAME),
    }


def _load_initial_analysis() -> Dict[str, Any]:
    database.init_db()
    saved = database.load_active_analysis()
    if saved and isinstance(saved.get("tasks"), list) and len(saved["tasks"]) > 0:
        return saved
    analysis = _analyze_default_schedule_file()
    database.save_active_analysis(analysis)
    return analysis


ACTIVE_ANALYSIS: Dict[str, Any] = _load_initial_analysis()


def _re_score_active_analysis() -> None:
    """Re-run CPM + freshly trained XGBoost/Monte Carlo on the active task list."""
    global ACTIVE_ANALYSIS
    tasks_in = []
    for t in ACTIVE_ANALYSIS.get("tasks", []):
        tasks_in.append({
            "code": t["code"],
            "task": t["task"],
            "planned_days": float(t["planned_days"]),
            "actual_days": float(t["actual_days"]),
            "predecessors": list(t.get("predecessors", [])),
            "has_dependency_column": True,
            "work_center": t.get("work_center", ""),
            "owner": t.get("owner", ""),
            "status_declared": t.get("status", ""),
        })
    if not tasks_in:
        return
    updated = {
        "source": ACTIVE_ANALYSIS.get("source", "file"),
        "filename": ACTIVE_ANALYSIS.get("filename", DEFAULT_SCHEDULE_FILENAME),
        **analyze_schedule(compute_cpm(tasks_in), ACTIVE_ANALYSIS.get("project_name", DEFAULT_PROJECT_NAME)),
    }
    ACTIVE_ANALYSIS = updated
    database.save_active_analysis(updated)


def _risk_headline() -> str:
    a = ACTIVE_ANALYSIS
    return f"{a['overall_delay_probability']:.1f}% (+{a['estimated_project_slippage_days']:.1f}d)"


def _sync_active_project_progress(analysis: Dict[str, Any]) -> None:
    """Reflect active schedule analysis metrics into the IRoom progress table."""
    tasks = analysis.get("tasks", [])
    completed_count = sum(
        1 for t in tasks if any(w in str(t.get("status", "")).lower() for w in ("complet", "done", "finish"))
    )
    pct = int(round((completed_count / max(1, len(tasks))) * 100)) if tasks else 0
    if pct == 0 and tasks:
        on_track = sum(1 for t in tasks if float(t.get("delay_risk", 0)) < 0.35)
        pct = int(round((on_track / len(tasks)) * 100))
    slip = float(analysis.get("estimated_project_slippage_days", 0.0))
    prob = float(analysis.get("overall_delay_probability", 0.0))
    high_tasks = [t for t in tasks if float(t.get("delay_risk", 0)) >= 0.5]
    lead_milestone = high_tasks[0]["task"] if high_tasks else (tasks[0]["task"] if tasks else "Active WBS")
    status_label = "Critical Risk" if prob >= 55.0 else ("Delayed" if slip > 0.5 else "On Schedule")

    if analysis.get("source") == "upload":
        database.upsert_stream_records(
            "progress",
            [
                {
                    "id": "prj-active",
                    "projectCode": "PRJ-UPLOADED",
                    "name": analysis.get("project_name", DEFAULT_PROJECT_NAME),
                    "customer": "Uploaded Master Schedule",
                    "currentMilestone": lead_milestone,
                    "progressPercent": max(15, min(95, pct or 50)),
                    "targetCompletion": datetime.now(timezone.utc).strftime("%d %b %Y"),
                    "delayVarianceDays": round(slip, 1),
                    "status": status_label,
                }
            ],
        )


# -------------------------------------------------------------
# Dynamic Decision, KPI, Telemetry, and RAG Computations
# -------------------------------------------------------------

CATEGORY_ROUTING: Dict[str, tuple[str, str, str]] = {
    "procurement": ("Supply Chain", "SOP-SCM-12", "Supply Chain Lead"),
    "engineering": ("Engineering & R&D", "SOP-ENG-02", "Engineering Lead"),
    "stamping": ("Maintenance", "SOP-PRS-04", "Maintenance Lead"),
    "machining": ("Production Planning", "SOP-LINE2-OPT", "Production Supervisor"),
    "assembly": ("Production Planning", "SOP-LINE2-OPT", "Production Supervisor"),
    "subcontract": ("Supply Chain", "SOP-SCM-12", "Supply Chain Lead"),
    "quality": ("Engineering & R&D", "SOP-ENG-02", "QA / Metrology Lead"),
    "logistics": ("Supply Chain", "SOP-SCM-12", "Logistics Coordinator"),
    "other": ("Production Planning", "SOP-LINE2-OPT", "Operations Manager"),
}


def _slug(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-") or "item"


def _infer_task_category(task: Dict[str, Any]) -> str:
    return infer_category(str(task.get("task", "")), str(task.get("work_center", "")))


def compute_live_decisions() -> List[Dict[str, Any]]:
    """Derive prioritized HITL decision briefs from live XGBoost/SHAP predictions & IRoom telemetry."""
    statuses = database.get_decision_statuses()
    materials = database.get_stream("materials")
    operations = database.get_stream("operations")
    drawings = database.get_stream("drawings")

    decisions: List[Dict[str, Any]] = []

    # 1. Task-level XGBoost & SHAP risk recommendations from the active schedule
    risk_tasks = sorted(
        [
            t for t in ACTIVE_ANALYSIS.get("tasks", [])
            if float(t.get("delay_risk", 0)) >= 0.35 or float(t.get("variance_days", 0)) > 0
        ],
        key=lambda t: (float(t.get("delay_risk", 0)), float(t.get("expected_slip_days", 0))),
        reverse=True,
    )

    for t in risk_tasks[:6]:
        risk = float(t.get("delay_risk", 0))
        cat = _infer_task_category(t)
        dept, sop_code, default_owner = CATEGORY_ROUTING.get(cat, CATEGORY_ROUTING["other"])
        drivers = [d.get("label", "") for d in t.get("drivers", []) if d.get("label")]
        driver_summary = ", ".join(drivers[:2]) if drivers else "critical-path schedule sensitivity"
        slip = float(t.get("expected_slip_days", 0))
        var_days = int(t.get("variance_days", 0))
        confidence = int(round(max(0.55, min(0.98, risk if risk >= 0.55 else 0.72)) * 100))

        if risk >= 0.75 or (t.get("critical") and var_days >= 2):
            urgency, badge = "Urgent", "red"
        elif risk >= 0.55:
            urgency, badge = "High", "warn"
        else:
            urgency, badge = "Medium", "warn"

        action_id = f"act-{_slug(str(t['code']))}"
        persisted = statuses.get(action_id, {})

        decisions.append({
            "id": action_id,
            "title": f"Mitigate {t['code']}: {t['task']}",
            "urgency": urgency,
            "urgency_badge": badge,
            "department": dept,
            "confidence": confidence,
            "description": (
                f"XGBoost scores {t['code']} ({t.get('work_center') or 'work center'}) at "
                f"{risk:.0%} late probability (+{slip:.1f}d expected slip, +{var_days}d variance). "
                f"Primary SHAP drivers: {driver_summary}."
            ),
            "impact": (
                f"Reduces expected +{slip:.1f}d slip on {'critical path' if t.get('critical') else 'WBS chain'} "
                f"(P50 project slip currently +{ACTIVE_ANALYSIS.get('estimated_project_slippage_days', 0):.1f}d)"
            ),
            "owner": t.get("owner") or default_owner,
            "due": "Immediate (within 4 hours)" if urgency == "Urgent" else "Before next shift handover",
            "source_doc": sop_code,
            "flagged": bool(persisted.get("flagged", False)),
            "status": persisted.get("status", "pending"),
            "checklist": [
                f"Verify field telemetry & actual progress on {t['code']} ({t.get('work_center') or dept})",
                f"Review primary SHAP driver: {driver_summary}",
                f"Apply mitigation protocol under {sop_code} and log sign-off",
            ],
        })

    # 2. Live IRoom telemetry anomalies not yet covered directly
    for mat in materials:
        cover = float(mat.get("stockCoverHours", 999))
        if cover <= 48:
            action_id = f"act-iroom-{_slug(str(mat.get('id', mat.get('partNumber', 'mat'))))}"
            persisted = statuses.get(action_id, {})
            decisions.append({
                "id": action_id,
                "title": f"Expedite Stock Cover for {mat.get('partNumber', 'Material')}",
                "urgency": "Urgent" if cover <= 36 else "High",
                "urgency_badge": "red" if cover <= 36 else "warn",
                "department": "Supply Chain",
                "confidence": int(round(max(0.75, float(mat.get("riskScore", 0.85))) * 100)),
                "description": (
                    f"{mat.get('description', mat.get('partNumber'))} has {int(cover)}h buffer remaining vs "
                    f"{mat.get('supplierLeadDays', 3)}-day vendor lead time ({mat.get('supplier', 'Supplier')})."
                ),
                "impact": f"Safeguards open purchase order {mat.get('openPo', 'PO-ACTIVE')} against line stoppage",
                "owner": "Supply Chain Lead",
                "due": "Within 4 hours",
                "source_doc": "SOP-SCM-12",
                "flagged": bool(persisted.get("flagged", False)),
                "status": persisted.get("status", "pending"),
                "checklist": [
                    f"Verify physical warehouse stock for {mat.get('partNumber')} ({int(cover)}h remaining)",
                    f"Confirm expedited freight clearance against {mat.get('openPo', 'open PO')}",
                    "Log supplier ETA confirmation under SOP-SCM-12",
                ],
            })

    for op in operations:
        vib = str(op.get("vibrationSensor", "NORMAL")).upper()
        oee = float(op.get("oeePercent", 100))
        if vib == "ELEVATED" or oee < 75.0:
            action_id = f"act-iroom-{_slug(str(op.get('id', op.get('machineId', 'op'))))}"
            persisted = statuses.get(action_id, {})
            decisions.append({
                "id": action_id,
                "title": f"Inspect {op.get('machineId', op.get('workCenter', 'Work Center'))} Anomaly",
                "urgency": "High" if vib == "ELEVATED" else "Medium",
                "urgency_badge": "warn",
                "department": "Maintenance",
                "confidence": 86 if vib == "ELEVATED" else 80,
                "description": (
                    f"{op.get('workCenter', 'Work center')} telemetry reports vibrationSensor={vib} "
                    f"and OEE={oee:.1f}% on active job {op.get('activeJob', 'scheduled run')}."
                ),
                "impact": "Prevents unplanned mechanical downtime and tool collision on stamping/machining bay",
                "owner": op.get("operator") or "Maintenance Lead",
                "due": "Before next batch changeover",
                "source_doc": "SOP-PRS-04" if "press" in str(op.get("workCenter", "")).lower() else "SOP-LINE2-OPT",
                "flagged": bool(persisted.get("flagged", False)),
                "status": persisted.get("status", "pending"),
                "checklist": [
                    f"Inspect transducer & mechanical clearances on {op.get('machineId', 'machine')}",
                    f"Verify operator load & cycle speed ({oee:.1f}% OEE)",
                    "Record preventive sign-off per ISO 9001 Cl. 7.5",
                ],
            })

    for dwg in drawings:
        if dwg.get("criticalDwg") and "approved" not in str(dwg.get("status", "")).lower():
            action_id = f"act-iroom-{_slug(str(dwg.get('id', dwg.get('dwgNumber', 'dwg'))))}"
            persisted = statuses.get(action_id, {})
            decisions.append({
                "id": action_id,
                "title": f"Expedite Critical Sign-off: {dwg.get('dwgNumber', 'Drawing')}",
                "urgency": "Urgent",
                "urgency_badge": "red",
                "department": "Engineering & R&D",
                "confidence": 89,
                "description": (
                    f"{dwg.get('title', 'Engineering drawing')} ({dwg.get('revision', 'Rev')}) submitted "
                    f"{dwg.get('submittedDate', '')} remains '{dwg.get('status', 'Pending')}'."
                ),
                "impact": "Unblocks critical-path CAM toolpath release and machining prep",
                "owner": dwg.get("engineer") or "Engineering Lead",
                "due": "Within 4 working hours",
                "source_doc": "SOP-ENG-02",
                "flagged": bool(persisted.get("flagged", False)),
                "status": persisted.get("status", "pending"),
                "checklist": [
                    f"Validate GD&T tolerances on {dwg.get('dwgNumber')} ({dwg.get('revision', '')})",
                    "Execute 4-working-hour SLA sign-off under SOP-ENG-02 Cl. 2.3",
                    "Release approved drawing to shop floor",
                ],
            })

    urgency_rank = {"Urgent": 0, "High": 1, "Medium": 2}
    decisions.sort(key=lambda d: (bool(d["flagged"]), urgency_rank.get(d["urgency"], 9), -int(d["confidence"])))
    return decisions


def _compute_overview_kpis() -> Dict[str, Any]:
    tasks = ACTIVE_ANALYSIS.get("tasks", [])
    total_planned = sum(float(t.get("planned_days", 0)) for t in tasks)
    total_actual = sum(float(t.get("actual_days", 0)) for t in tasks)
    attainment = round(min(100.0, (total_planned / total_actual) * 100.0), 1) if total_actual > 0 else 100.0
    attainment_delta = round(attainment - 100.0, 1)

    ops = database.get_stream("operations")
    dwgs = database.get_stream("drawings")
    avg_oee = sum(float(o.get("oeePercent", 85.0)) for o in ops) / max(1, len(ops))
    elevated_sensors = sum(1 for o in ops if str(o.get("vibrationSensor", "NORMAL")).upper() != "NORMAL")
    revision_dwgs = sum(1 for d in dwgs if "revision" in str(d.get("status", "")).lower())
    quality_yield = round(max(75.0, min(99.9, 100.0 - elevated_sensors * 1.8 - revision_dwgs * 1.1)), 1)
    quality_delta = round(quality_yield - 98.0, 1)

    decisions = compute_live_decisions()
    pending_count = sum(1 for d in decisions if not d["flagged"])

    prob = float(ACTIVE_ANALYSIS.get("overall_delay_probability", 0.0))
    slip = float(ACTIVE_ANALYSIS.get("estimated_project_slippage_days", 0.0))

    return {
        "attainment": attainment,
        "quality_yield": quality_yield,
        "avg_oee": round(avg_oee, 1),
        "pending_decisions": pending_count,
        "kpis": [
            {
                "label": "Schedule Attainment",
                "value": f"{attainment:.1f}%",
                "change": f"{attainment_delta:+.1f}% vs Plan",
                "status": "OK" if attainment >= 92.0 else "WARNING",
            },
            {
                "label": "ML Delay Risk",
                "value": f"{prob:.1f}%",
                "change": f"+{slip:.1f}d Slippage (P50)",
                "status": "WARNING" if prob >= 35.0 else "OK",
            },
            {
                "label": "First-Time Quality Yield",
                "value": f"{quality_yield:.1f}%",
                "change": f"{quality_delta:+.1f}% ({elevated_sensors} sensor alerts)",
                "status": "OK" if quality_yield >= 97.0 and elevated_sensors == 0 else "WARNING",
            },
            {
                "label": "Open HITL Decisions",
                "value": f"{pending_count} Pending",
                "change": f"{len(decisions)} total signals",
                "status": "OK" if pending_count == 0 else "WARNING",
            },
        ],
    }


def _compute_production_lines() -> List[Dict[str, Any]]:
    ops = database.get_stream("operations")
    tasks = ACTIVE_ANALYSIS.get("tasks", [])
    lines: List[Dict[str, Any]] = []

    for idx, op in enumerate(ops):
        util = int(round(float(op.get("spindleUtilization", 85.0))))
        oee = float(op.get("oeePercent", 85.0))
        vib = str(op.get("vibrationSensor", "NORMAL")).upper()
        target = 1000 + idx * 250
        actual = int(round(target * (oee / 100.0)))
        if vib != "NORMAL" or oee < 75.0:
            status_lbl, color = "Attention", "warn"
        elif oee >= 95.0:
            status_lbl, color = "Above target", "cyan"
        else:
            status_lbl, color = "On track", "green"

        lines.append({
            "id": str(op.get("id") or f"line-{idx + 1:02d}"),
            "name": f"{op.get('workCenter', 'Work Center')} ({op.get('machineId', 'Machine')})",
            "utilization": max(0, min(100, util)),
            "outputActual": actual,
            "outputTarget": target,
            "status": status_lbl,
            "statusColor": color,
        })

    if not lines and tasks:
        for idx, t in enumerate(tasks[:4]):
            risk = float(t.get("delay_risk", 0.2))
            util = int(round((1.0 - risk * 0.35) * 100))
            target = int(t["planned_days"] * 200)
            actual = int(round(target * (float(t["planned_days"]) / max(1.0, float(t["actual_days"])))))
            lines.append({
                "id": f"line-{_slug(str(t['code']))}",
                "name": str(t.get("work_center") or t["task"]),
                "utilization": max(20, min(100, util)),
                "outputActual": actual,
                "outputTarget": target,
                "status": "Attention" if risk >= 0.6 else "On track",
                "statusColor": "warn" if risk >= 0.6 else "green",
            })
    return lines


def _compute_performance_series(metric: str) -> Dict[str, Any]:
    ops = database.get_stream("operations")
    tasks = ACTIVE_ANALYSIS.get("tasks", [])
    avg_oee = sum(float(o.get("oeePercent", 84.0)) for o in ops) / max(1, len(ops))
    avg_util = sum(float(o.get("spindleUtilization", 85.0)) for o in ops) / max(1, len(ops))
    high_risk_ratio = sum(1 for t in tasks if float(t.get("delay_risk", 0)) >= 0.6) / max(1, len(tasks))
    avg_var = sum(float(t.get("variance_days", 0)) for t in tasks) / max(1, len(tasks))

    # Build a deterministic 7-day curve anchored on live OEE, machine load, and WBS variance
    offsets = [-0.04, 0.02, -0.01, -0.07 * (1 + high_risk_ratio), -0.03, 0.04, 0.0]

    if metric == "oee":
        target_val = 85.0
        actual = [round(max(42.0, min(99.0, avg_oee * (1.0 + d))), 1) for d in offsets]
        return {
            "actual": actual,
            "target": [target_val] * 7,
            "labels": ["100%", "80%", "60%", "40%"],
            "min": 40,
            "max": 100,
            "unit": "Overall Equipment Effectiveness (%)",
        }

    if metric == "downtime":
        base_dt = max(1.8, min(5.5, 2.0 + avg_var * 2.2 + high_risk_ratio * 1.5))
        actual = [round(max(1.6, min(5.9, base_dt * (1.0 - d * 2.0))), 2) for d in offsets]
        return {
            "actual": actual,
            "target": [2.5] * 7,
            "labels": ["6h", "4.5h", "3h", "1.5h"],
            "min": 1.5,
            "max": 6.0,
            "unit": "Cumulative Downtime (hrs)",
        }

    base_out = max(400.0, min(1150.0, 1000.0 * (avg_oee / 85.0) * (avg_util / 90.0)))
    actual_out = [int(round(max(320, min(1190, base_out * (1.0 + d))))) for d in offsets]
    return {
        "actual": actual_out,
        "target": [1000] * 7,
        "labels": ["1.2k", "900", "600", "300"],
        "min": 300,
        "max": 1200,
        "unit": "Units Produced",
    }


def _compute_iroom_overview() -> Dict[str, Any]:
    materials = database.get_stream("materials")
    projects = database.get_stream("progress")
    drawings = database.get_stream("drawings")
    quotations = database.get_stream("quotations")
    operations = database.get_stream("operations")

    alerts: List[Dict[str, str]] = []
    for m in materials:
        if float(m.get("stockCoverHours", 999)) <= 48:
            alerts.append({
                "module": "Material Delivery",
                "alert": f"{m.get('partNumber', 'Part')} stock cover at {int(m.get('stockCoverHours', 0))}h (<48h threshold)",
            })
    for p in projects:
        if float(p.get("delayVarianceDays", 0)) > 0:
            alerts.append({
                "module": "Project Progress",
                "alert": f"{p.get('name', p.get('projectCode'))} reports +{p.get('delayVarianceDays')}d variance",
            })
    for d in drawings:
        if d.get("criticalDwg") and "approved" not in str(d.get("status", "")).lower():
            alerts.append({
                "module": "Drawing Approval",
                "alert": f"{d.get('dwgNumber', 'Drawing')} awaits critical approval ({d.get('status')})",
            })
    for o in operations:
        if str(o.get("vibrationSensor", "NORMAL")).upper() != "NORMAL":
            alerts.append({
                "module": "Operation Tracker",
                "alert": f"{o.get('machineId', o.get('workCenter'))} sensor {o.get('vibrationSensor')} (OEE {o.get('oeePercent')}%)",
            })

    return {
        "status": "connected",
        "source": "IRoom SQLite Telemetry Gateway (Live Store)",
        "modules_active": 5,
        "total_active_records": {
            "materials": len(materials),
            "projects": len(projects),
            "drawings": len(drawings),
            "quotations": len(quotations),
            "operations": len(operations),
        },
        "critical_alerts": alerts,
    }


def _tokenize(text: str) -> List[str]:
    return [tok for tok in re.findall(r"[a-z0-9\-]{2,}", text.lower()) if tok]


def _run_grounded_copilot(message: str, role: str) -> Dict[str, Any]:
    """Live grounded retrieval over SQLite SOPs, active WBS tasks, and live IRoom records."""
    sops = database.get_sops()
    tasks = ACTIVE_ANALYSIS.get("tasks", [])
    materials = database.get_stream("materials")
    operations = database.get_stream("operations")
    drawings = database.get_stream("drawings")

    q_lower = message.lower().strip()
    q_tokens = set(_tokenize(message))

    # Build IDF across SOP corpus for token weighting
    n_docs = max(1, len(sops))
    doc_freq: Dict[str, int] = {}
    doc_token_sets: List[set[str]] = []
    for doc in sops:
        tokens = set(_tokenize(f"{doc['doc_code']} {doc['title']} {doc['clause']} {doc['excerpt']} {' '.join(doc['keywords'])}"))
        doc_token_sets.append(tokens)
        for tok in tokens:
            doc_freq[tok] = doc_freq.get(tok, 0) + 1

    scored_docs: List[tuple[float, Dict[str, Any]]] = []
    for doc, tokens in zip(sops, doc_token_sets):
        score = 0.0
        if doc["doc_code"].lower() in q_lower:
            score += 5.0
        for kw in doc.get("keywords", []):
            kw_low = kw.lower()
            if kw_low in q_lower:
                score += 1.5
        for tok in q_tokens:
            if tok in tokens:
                idf = math.log(1.0 + n_docs / max(1, doc_freq.get(tok, 1)))
                score += 0.8 * idf
        if score > 0:
            scored_docs.append((score, doc))

    scored_docs.sort(key=lambda item: item[0], reverse=True)
    matched_sops = [doc for _, doc in scored_docs]

    # Match WBS tasks explicitly referenced in query
    matched_tasks = [
        t for t in tasks
        if t["code"].lower() in q_lower
        or any(tok in f"{t['task']} {t.get('work_center', '')} {t.get('owner', '')}".lower() for tok in q_tokens)
    ]
    if not matched_tasks:
        matched_tasks = sorted(tasks, key=lambda t: float(t.get("delay_risk", 0)), reverse=True)[:2]

    # Match IRoom telemetry rows relevant to query
    matched_materials = [
        m for m in materials
        if any(tok in f"{m.get('partNumber', '')} {m.get('description', '')} {m.get('openPo', '')}".lower() for tok in q_tokens)
        or float(m.get("stockCoverHours", 999)) <= 48
    ][:1]
    matched_ops = [
        o for o in operations
        if any(tok in f"{o.get('workCenter', '')} {o.get('machineId', '')} {o.get('vibrationSensor', '')}".lower() for tok in q_tokens)
        or str(o.get("vibrationSensor", "NORMAL")).upper() != "NORMAL"
    ][:1]
    matched_dwgs = [
        d for d in drawings
        if any(tok in f"{d.get('dwgNumber', '')} {d.get('title', '')}".lower() for tok in q_tokens)
        or (d.get("criticalDwg") and "approved" not in str(d.get("status", "")).lower())
    ][:1]

    parts: List[str] = []
    if matched_tasks:
        t_summary = "; ".join(
            (
                f"{t['code']} ({t['task']}): {float(t['delay_risk']):.0%} delay risk, "
                f"+{float(t['expected_slip_days']):.1f}d expected slip"
                + (f" [{', '.join(d['label'] for d in t.get('drivers', [])[:2])}]" if t.get("drivers") else "")
            )
            for t in matched_tasks[:2]
        )
        parts.append(
            f"Live schedule ({ACTIVE_ANALYSIS.get('project_name', DEFAULT_PROJECT_NAME)}): {t_summary}. "
            f"Monte Carlo CPM slippage is {ACTIVE_ANALYSIS.get('overall_delay_probability', 0):.1f}% "
            f"(P50 +{ACTIVE_ANALYSIS.get('estimated_project_slippage_days', 0):.1f}d, "
            f"P80 +{ACTIVE_ANALYSIS.get('p80_slippage_days', 0):.1f}d)."
        )

    iroom_notes: List[str] = []
    for m in matched_materials:
        iroom_notes.append(
            f"{m.get('partNumber')} stock cover {int(m.get('stockCoverHours', 0))}h ({m.get('status')}, PO {m.get('openPo')})"
        )
    for o in matched_ops:
        iroom_notes.append(
            f"{o.get('machineId')} vibration={o.get('vibrationSensor')} (OEE {o.get('oeePercent')}%)"
        )
    for d in matched_dwgs:
        iroom_notes.append(f"{d.get('dwgNumber')} status={d.get('status')}")
    if iroom_notes:
        parts.append(f"Live IRoom telemetry ({role} view): {'; '.join(iroom_notes)}.")

    citations: List[Dict[str, Any]] = []
    if matched_sops:
        lead = matched_sops[0]
        parts.append(f"SOP {lead['doc_code']} ({lead['clause']}): {lead['excerpt']}")
        citations = [
            {
                "doc_code": d["doc_code"],
                "clause": d["clause"],
                "title": d["title"],
                "excerpt": d["excerpt"],
            }
            for d in matched_sops[:2]
        ]
        confidence = 0.94
    elif sops:
        # Ensure citations stay grounded in live SOP store using category of highest-risk task
        lead_cat = _infer_task_category(matched_tasks[0]) if matched_tasks else "other"
        _, target_code, _ = CATEGORY_ROUTING.get(lead_cat, CATEGORY_ROUTING["other"])
        fallback_sop = next((d for d in sops if d["doc_code"] == target_code), sops[0])
        parts.append(f"Relevant SOP ({fallback_sop['doc_code']} - {fallback_sop['clause']}): {fallback_sop['excerpt']}")
        citations = [
            {
                "doc_code": fallback_sop["doc_code"],
                "clause": fallback_sop["clause"],
                "title": fallback_sop["title"],
                "excerpt": fallback_sop["excerpt"],
            }
        ]
        confidence = 0.89
    else:
        confidence = 0.82

    reply = " ".join(parts)
    return {
        "success": True,
        "reply": reply,
        "citations": citations,
        "confidence": confidence,
        "is_grounded": True,
        "source_documents_indexed": len(sops),
    }


# -------------------------------------------------------------
# Health & Legacy Evaluation Endpoints
# -------------------------------------------------------------

@app.get("/health")
def health_check():
    status = database.db_status()
    return {
        "status": "ok",
        "engine": "MDIP PoC v1.2 (Supabase/SQLite + CPM + XGBoost Delay-Risk + Grounded SOP RAG)",
        "deployment": "Hybrid SaaS / Internal Enterprise",
        "database": status["active_engine"],
        "supabase_project_ref": status["supabase_project_ref"],
    }


@app.get("/api/health")
def api_health_check():
    status = database.db_status()
    return {
        "status": "ok",
        "engine": "MDIP PoC v1.2 (Supabase/SQLite + CPM + XGBoost Delay-Risk + Grounded SOP RAG)",
        "live": True,
        "active_filename": ACTIVE_ANALYSIS.get("filename"),
        "database": status["active_engine"],
        "supabase_project_ref": status["supabase_project_ref"],
    }


@app.get("/api/v1/db/status")
def get_db_status():
    """Report active database persistence engine (Supabase Postgres or local SQLite fallback)."""
    return database.db_status()


@app.post("/api/scheduler/upload")
async def parse_schedule(file: Optional[UploadFile] = File(None)):
    result = await upload_scheduler_v1(file)
    return {
        "filename": result["filename"],
        "status": "standardized",
        "parse_time_ms": result["parse_time_ms"],
        "tasks_extracted": result["tasks_extracted"],
        "schema_version": "mdip-v1",
    }


@app.post("/api/risks/evaluate")
def evaluate_delay_risk(tasks: List[TaskItem]):
    items: List[Dict[str, Any]] = []
    for t in tasks:
        float_days = t.float_days or 0
        items.append({
            "code": t.task_id,
            "task": t.name,
            "planned_days": float(t.planned_days),
            "actual_days": float(t.actual_days or t.planned_days),
            "float_days": float_days,
            "critical": float_days == 0,
            "upstream_slip_days": float(t.upstream_slip_days),
            "external_dependency": t.external_vendor,
            "work_center": t.work_center or "",
            "resource_utilization": t.resource_utilization,
            "drawing_revisions": t.drawing_revisions or 0,
        })
    score_tasks(items)
    results = [
        {
            "task_id": i["code"],
            "name": i["task"],
            "delay_probability": round(i["delay_risk"], 2),
            "risk_level": i["risk_level"],
            "expected_slip_days": i["expected_slip_days"],
            "drivers": [d["label"] for d in i["drivers"]] or ["Normal operating baseline"],
        }
        for i in items
    ]
    return {"evaluated_tasks": len(results), "predictions": results}


@app.post("/api/copilot/ask")
def ask_copilot(payload: CopilotQuery):
    msg = (payload.message or payload.question or "").strip() or "Summarize current project risks and bottlenecks."
    role = payload.active_role or payload.role or "Operations Manager"
    res = _run_grounded_copilot(msg, role)
    return {
        "answer": res["reply"],
        "reply": res["reply"],
        "citations": res["citations"],
        "is_grounded": res["is_grounded"],
        "confidence": res["confidence"],
    }


# -------------------------------------------------------------
# IRoom System Connector Endpoints (/api/v1/iroom/...)
# -------------------------------------------------------------

@app.get("/api/v1/iroom/materials")
def get_iroom_materials():
    return database.get_stream("materials")


@app.get("/api/v1/iroom/progress")
def get_iroom_progress():
    return database.get_stream("progress")


@app.get("/api/v1/iroom/drawings")
def get_iroom_drawings():
    return database.get_stream("drawings")


@app.get("/api/v1/iroom/quotations")
def get_iroom_quotations():
    return database.get_stream("quotations")


@app.get("/api/v1/iroom/operations")
def get_iroom_operations():
    return database.get_stream("operations")


@app.post("/api/v1/iroom/{stream}")
def ingest_iroom_stream(
    stream: str = Path(..., description="One of: materials, progress, drawings, quotations, operations"),
    records: List[Dict[str, Any]] = Body(...),
    replace: bool = Query(False, description="Replace existing stream records instead of upserting"),
):
    """Ingest live IRoom JSON telemetry records into SQLite."""
    if stream not in database.VALID_STREAMS:
        raise HTTPException(
            status_code=404,
            detail=f"Unknown IRoom stream '{stream}'. Expected one of: {', '.join(database.VALID_STREAMS)}",
        )
    count = database.upsert_stream_records(stream, records, replace=replace)
    return {
        "success": True,
        "stream": stream,
        "ingested": count,
        "total_records": len(database.get_stream(stream)),
        "replace": replace,
    }


@app.get("/api/v1/iroom/overview")
def get_iroom_overview():
    return _compute_iroom_overview()


# -------------------------------------------------------------
# Dashboard, Scheduler, ML, Decision & RAG Endpoints (/api/v1/...)
# -------------------------------------------------------------

@app.get("/api/v1/analytics/performance")
def get_performance_metric(metric: str = Query("output", enum=["output", "oee", "downtime"])):
    return _compute_performance_series(metric)


@app.get("/api/v1/dashboard/lines")
def get_production_lines():
    return _compute_production_lines()


@app.get("/api/v1/scheduler/wbs")
def get_wbs_schedule():
    return ACTIVE_ANALYSIS["tasks"]


@app.post("/api/v1/scheduler/upload")
async def upload_scheduler_v1(file: Optional[UploadFile] = File(None)):
    """Parse uploaded CSV/XLSX schedule (or reload baseline CSV file), persist to SQLite, run CPM + XGBoost."""
    global ACTIVE_ANALYSIS
    start = time.perf_counter()
    if file is None or not file.filename:
        analysis = _analyze_default_schedule_file()
        filename = DEFAULT_SCHEDULE_FILENAME
    else:
        filename = file.filename
        content = await file.read()
        if len(content) > 5 * 1024 * 1024:
            raise HTTPException(status_code=413, detail="Schedule file is larger than 5 MB.")
        try:
            tasks = parse_schedule_file(content, filename)
        except ScheduleParseError as e:
            raise HTTPException(status_code=422, detail=str(e))
        except Exception as e:
            raise HTTPException(status_code=422, detail=f"Could not read {filename}: {e}")
        project_name = os.path.splitext(filename)[0].replace("_", " ").strip() or DEFAULT_PROJECT_NAME
        analysis = {"source": "upload", "filename": filename, **analyze_schedule(tasks, project_name)}
        database.clear_decision_statuses()

    ACTIVE_ANALYSIS = analysis
    database.save_active_analysis(analysis)
    _sync_active_project_progress(analysis)

    elapsed_ms = round((time.perf_counter() - start) * 1000, 2)
    n = len(analysis["tasks"])
    return {
        "success": True,
        "filename": filename,
        "parse_time_ms": elapsed_ms,
        "tasks_extracted": n,
        "critical_path_tasks": analysis["critical_path_tasks_count"],
        "high_risk_tasks": analysis["high_risk_tasks_count"],
        "overall_delay_probability": analysis["overall_delay_probability"],
        "estimated_project_slippage_days": analysis["estimated_project_slippage_days"],
        "message": (
            f"Extracted {n} WBS activities from {filename}, computed the critical path and scored delay risk "
            f"with XGBoost: {analysis['overall_delay_probability']:.1f}% chance of project slip "
            f"(P50 +{analysis['estimated_project_slippage_days']:.1f}d)."
        ),
        "tasks": analysis["tasks"],
    }


@app.get("/api/v1/risks/prediction")
def get_delay_prediction():
    return {k: v for k, v in ACTIVE_ANALYSIS.items() if k != "source"}


@app.get("/api/v1/ml/model-card")
def get_model_card():
    """Training provenance, held-out metrics, and global feature importance of the delay-risk model."""
    return model_card()


def _require_admin_key(provided: Optional[str]) -> None:
    """Model retraining changes what every user sees, so it needs MDIP_ADMIN_KEY (sent as X-Admin-Key)."""
    expected = os.environ.get("MDIP_ADMIN_KEY", "")
    if not expected:
        raise HTTPException(status_code=403, detail="Retraining is disabled: set MDIP_ADMIN_KEY on the server to enable it.")
    if not provided or not hmac.compare_digest(provided.encode(), expected.encode()):
        raise HTTPException(status_code=401, detail="Missing or invalid X-Admin-Key header.")


@app.post("/api/v1/ml/retrain")
async def retrain_ml_models(
    file: Optional[UploadFile] = File(None),
    project_id: Optional[str] = Query(None, description="Optional unique historical project identifier"),
    x_admin_key: Optional[str] = Header(None),
):
    """
    Ingest a COMPLETED CSV/XLSX schedule (planned vs. actual) into historical training data,
    retrain XGBoost, and hot-reload. Requires the X-Admin-Key header.
    The live (in-progress) schedule is never used as training data: its "actual" days are forecasts.
    """
    _require_admin_key(x_admin_key)
    if file is None or not file.filename:
        raise HTTPException(
            status_code=422,
            detail="Upload a completed historical schedule (CSV/XLSX with planned and actual durations) to retrain.",
        )
    content = await file.read()
    if len(content) > 5 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Training schedule file is larger than 5 MB.")
    try:
        df_new = ingest_historical_schedule(content, file.filename, project_id=project_id)
        ingested_rows = int(len(df_new))
    except ScheduleParseError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Could not ingest training file {file.filename}: {e}")

    card = train_models()
    reload_models()
    _re_score_active_analysis()
    return {
        "success": True,
        "ingested_tasks": ingested_rows,
        "model_card": card,
        "updated_prediction_summary": {
            "project_name": ACTIVE_ANALYSIS.get("project_name"),
            "overall_delay_probability": ACTIVE_ANALYSIS.get("overall_delay_probability"),
            "estimated_project_slippage_days": ACTIVE_ANALYSIS.get("estimated_project_slippage_days"),
        },
    }


@app.get("/api/v1/risks/decisions")
def get_decisions():
    return compute_live_decisions()


@app.post("/api/v1/risks/decisions/flag")
def flag_decision(payload: FlagActionPayload):
    decision_val = (payload.decision or "AUTHORIZED").upper()
    live_decisions = compute_live_decisions()
    matched = next((d for d in live_decisions if d["id"] == payload.action_id), None)
    action_title = matched["title"] if matched else payload.action_id
    sop_ref = matched["source_doc"] if matched else "SOP-MDIP"
    ts = time.strftime("%Y-%m-%d %H:%M:%S")

    entry = database.record_decision_flag(
        action_id=payload.action_id,
        action_title=action_title,
        decision=decision_val,
        reviewer_role=payload.reviewer_role or "Operations Manager",
        notes=payload.notes or "Verified via HITL modal",
        sop_ref=sop_ref,
        timestamp=ts,
    )
    return {
        "success": True,
        "action_id": payload.action_id,
        "decision": decision_val,
        "status": "FLAGGED_IN_AUDIT_LOG",
        "reviewer": entry["reviewer_role"],
        "timestamp": entry["timestamp"],
        "message": f"Action {decision_val.lower()} and recorded in SQLite ISO 9001 audit log.",
    }


@app.get("/api/v1/risks/audit-log")
def get_audit_log():
    return database.get_audit_log()


@app.get("/api/v1/knowledge/docs")
def get_knowledge_docs():
    return database.get_sops()


@app.post("/api/v1/knowledge/ingest")
def ingest_knowledge_doc(payload: SopDocumentPayload):
    """Add or update an SOP document in the SQLite RAG index."""
    saved = database.upsert_sop(payload.model_dump())
    return {
        "success": True,
        "document": saved,
        "total_documents": len(database.get_sops()),
    }


@app.post("/api/v1/copilot/chat")
def copilot_chat(payload: CopilotQuery):
    msg = (payload.message or payload.question or "").strip()
    role = payload.active_role or payload.role or "Operations Manager"
    return _run_grounded_copilot(msg, role)


@app.get("/api/v1/dashboard/overview")
def get_overview(role: str = "Operations Manager"):
    computed = _compute_overview_kpis()
    live_decisions = compute_live_decisions()
    return {
        "success": True,
        "active_role": role,
        "header": {
            "title": f"Operations Cockpit ({role})",
            "sub": f"Live telemetry & XGBoost schedule intelligence ({ACTIVE_ANALYSIS.get('filename', DEFAULT_SCHEDULE_FILENAME)})",
        },
        "kpis": computed["kpis"],
        "decision_actions": live_decisions,
        "metrics": {
            "schedule_attainment": computed["attainment"],
            "quality_yield": computed["quality_yield"],
            "avg_oee": computed["avg_oee"],
            "overall_delay_probability": ACTIVE_ANALYSIS["overall_delay_probability"],
            "estimated_project_slippage_days": ACTIVE_ANALYSIS["estimated_project_slippage_days"],
            "open_decisions": computed["pending_decisions"],
        },
        "source": "fastapi_sqlite_live",
    }


@app.get("/api/v1/dashboard/export")
def export_summary(role: str = "Operations Manager"):
    computed = _compute_overview_kpis()
    return {
        "role": role,
        "project": ACTIVE_ANALYSIS.get("project_name", DEFAULT_PROJECT_NAME),
        "filename": ACTIVE_ANALYSIS.get("filename", DEFAULT_SCHEDULE_FILENAME),
        "export_date": time.strftime("%Y-%m-%d %H:%M:%S"),
        "platform": "MDIP AI Manufacturing Copilot (SQLite + XGBoost Live)",
        "summary": (
            f"Schedule Attainment: {computed['attainment']:.1f}% | "
            f"Delay Risk: {_risk_headline()} | "
            f"Quality Yield: {computed['quality_yield']:.1f}% | "
            f"Open HITL: {computed['pending_decisions']}"
        ),
    }
