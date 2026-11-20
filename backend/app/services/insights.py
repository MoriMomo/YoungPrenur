"""Live decisions, KPIs, production-line, performance and IRoom summaries derived from the active analysis.
"""

import re
from typing import Any, Dict, List, Optional

import database
from ml.features import infer_category
from ml.predictor import watch_threshold


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


def compute_live_decisions(analysis: Dict[str, Any], workspace: Optional[str] = None) -> List[Dict[str, Any]]:
    """Derive prioritized HITL decision briefs from a schedule analysis & IRoom telemetry.

    `workspace` scopes sign-off statuses to one user's schedule.
    """
    statuses = database.get_decision_statuses(workspace)
    materials = database.get_stream("materials")
    operations = database.get_stream("operations")
    drawings = database.get_stream("drawings")

    decisions: List[Dict[str, Any]] = []

    # 1. Task-level XGBoost & SHAP risk recommendations from the active schedule
    risk_tasks = sorted(
        [
            t for t in analysis.get("tasks", [])
            if float(t.get("delay_risk", 0)) >= watch_threshold() or float(t.get("variance_days", 0)) > 0
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
        confidence = round(max(0.55, min(0.98, risk if risk >= 0.55 else 0.72)) * 100)

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
                f"(P50 project slip currently +{analysis.get('estimated_project_slippage_days', 0):.1f}d)"
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
                "confidence": round(max(0.75, float(mat.get("riskScore", 0.85))) * 100),
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


def _compute_overview_kpis(analysis: Dict[str, Any], workspace: Optional[str] = None) -> Dict[str, Any]:
    tasks = analysis.get("tasks", [])
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

    decisions = compute_live_decisions(analysis, workspace)
    pending_count = sum(1 for d in decisions if not d["flagged"])

    prob = float(analysis.get("overall_delay_probability", 0.0))
    slip = float(analysis.get("estimated_project_slippage_days", 0.0))

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


def _compute_production_lines(analysis: Dict[str, Any]) -> List[Dict[str, Any]]:
    ops = database.get_stream("operations")
    tasks = analysis.get("tasks", [])
    lines: List[Dict[str, Any]] = []

    for idx, op in enumerate(ops):
        util = round(float(op.get("spindleUtilization", 85.0)))
        oee = float(op.get("oeePercent", 85.0))
        vib = str(op.get("vibrationSensor", "NORMAL")).upper()
        target = 1000 + idx * 250
        actual = round(target * (oee / 100.0))
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
            util = round((1.0 - risk * 0.35) * 100)
            target = int(t["planned_days"] * 200)
            actual = round(target * (float(t["planned_days"]) / max(1.0, float(t["actual_days"]))))
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


def _compute_performance_series(metric: str, analysis: Dict[str, Any]) -> Dict[str, Any]:
    ops = database.get_stream("operations")
    tasks = analysis.get("tasks", [])
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
    actual_out = [round(max(320, min(1190, base_out * (1.0 + d)))) for d in offsets]
    return {
        "actual": actual_out,
        "target": [1000] * 7,
        "labels": ["1.2k", "900", "600", "300"],
        "min": 300,
        "max": 1200,
        "unit": "Units Produced",
    }


def _compute_iroom_overview(extra_projects: Optional[List[Dict[str, Any]]] = None) -> Dict[str, Any]:
    materials = database.get_stream("materials")
    projects = (extra_projects or []) + database.get_stream("progress")
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
