from fastapi import FastAPI, UploadFile, File, Query, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Any, Dict
import copy
import os
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from ml.predictor import analyze_schedule, model_card, score_tasks  # noqa: E402
from schedule_parser import ScheduleParseError, compute_cpm, parse_schedule_file  # noqa: E402

app = FastAPI(
    title="MDIP Manufacturing Decision Intelligence Platform API",
    description="Backend API serving IRoom System Connectors, CPM Scheduler, Delay-Risk Predictions, and Grounded Copilot RAG.",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -------------------------------------------------------------
# Data Models
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

class ScheduleUploadPayload(BaseModel):
    filename: Optional[str] = "master_project_schedule_rev3.xlsx"
    source_type: Optional[str] = "EXCEL_WBS"

# -------------------------------------------------------------
# Seed Telemetry & IRoom Mock Datasets
# -------------------------------------------------------------

SAMPLE_WBS = [
    {"code": "WBS-1.1", "predecessors": [], "task": "Drawing Technical Review & CAD/CAM Sign-off", "start_day": 0, "planned_days": 4, "actual_days": 6, "float_days": 0, "critical": True, "delay_risk": 0.72, "status": "Delayed (+2d)", "variance_days": 2, "work_center": "Tooling R&D / CAD", "owner": "Hendra Wijaya, ST"},
    {"code": "WBS-1.2", "predecessors": [], "task": "Raw Material Procurement (Alloy EN24 & M-204)", "start_day": 1, "planned_days": 6, "actual_days": 8, "float_days": 0, "critical": True, "delay_risk": 0.85, "status": "At Risk", "variance_days": 2, "work_center": "Supply Chain / Receiving", "owner": "Supply Chain Lead"},
    {"code": "WBS-1.3", "predecessors": ["WBS-1.1"], "task": "Tooling & Stamping Die Fabrication (Die-04)", "start_day": 4, "planned_days": 5, "actual_days": 5, "float_days": 2, "critical": False, "delay_risk": 0.28, "status": "On Track", "variance_days": 0, "work_center": "Wire EDM Cell 03", "owner": "Rudi Hermawan"},
    {"code": "WBS-2.1", "predecessors": ["WBS-1.1", "WBS-1.2"], "task": "CNC 5-Axis Milling & Surface Profiling", "start_day": 6, "planned_days": 7, "actual_days": 7, "float_days": 2, "critical": False, "delay_risk": 0.22, "status": "On Track", "variance_days": 0, "work_center": "CNC Milling Cell A (Makino D800Z)", "owner": "Bambang S."},
    {"code": "WBS-2.2", "predecessors": ["WBS-1.3", "WBS-2.1"], "task": "Precision Stamping & Forming (Press P-07)", "start_day": 9, "planned_days": 5, "actual_days": 6, "float_days": 0, "critical": True, "delay_risk": 0.68, "status": "Bottleneck", "variance_days": 1, "work_center": "Stamping Press Bay P-07", "owner": "Agus H."},
    {"code": "WBS-3.1", "predecessors": ["WBS-2.2"], "task": "Cell 02 Sub-Assembly & Precision Tolerancing", "start_day": 14, "planned_days": 6, "actual_days": 8, "float_days": 0, "critical": True, "delay_risk": 0.79, "status": "Lagging -11%", "variance_days": 2, "work_center": "Assembly Cell 02", "owner": "Production Supervisor"},
    {"code": "WBS-3.2", "predecessors": ["WBS-2.1"], "task": "Heat Treatment & Surface Hardening (Subcontract)", "start_day": 16, "planned_days": 4, "actual_days": 4, "float_days": 2, "critical": False, "delay_risk": 0.35, "status": "Scheduled", "variance_days": 0, "work_center": "Subcontract Furnace", "owner": "Rina Wijaya"},
    {"code": "WBS-4.1", "predecessors": ["WBS-3.1", "WBS-3.2"], "task": "CMM Metrology & Quality Acceptance Test", "start_day": 22, "planned_days": 3, "actual_days": 3, "float_days": 0, "critical": True, "delay_risk": 0.30, "status": "Pending Prior Stage", "variance_days": 0, "work_center": "CMM Metrology Lab", "owner": "Siti M."},
    {"code": "WBS-4.2", "predecessors": ["WBS-4.1"], "task": "Final Factory Acceptance (FAT) & Customer Dispatch", "start_day": 25, "planned_days": 2, "actual_days": 2, "float_days": 1, "critical": False, "delay_risk": 0.15, "status": "Scheduled", "variance_days": 0, "work_center": "Logistics Dock A", "owner": "Rian T."}
]

IROOM_MATERIALS = [
    {
        "id": "mat-01",
        "partNumber": "INGOT-AL7075-T6",
        "description": "Aerospace Grade 7075 Aluminum Round Bar 120mm",
        "supplier": "PT Metalindo Perkasa Steel",
        "eta": "Tomorrow, 14:00 WIB",
        "stockCoverHours": 36,
        "supplierLeadDays": 3,
        "status": "Critical",
        "riskScore": 0.88,
        "openPo": "PO-2026-IMJ-0891"
    },
    {
        "id": "mat-02",
        "partNumber": "FASTENER-TI-M6",
        "description": "Titanium Alloy Hex Socket Cap Screws M6x25",
        "supplier": "Fastener Global Solution Pte",
        "eta": "16 Oct 2026",
        "stockCoverHours": 72,
        "supplierLeadDays": 5,
        "status": "At Risk",
        "riskScore": 0.62,
        "openPo": "PO-2026-IMJ-0894"
    },
    {
        "id": "mat-03",
        "partNumber": "STEEL-SKD11-PL",
        "description": "Cold-Work Tool Steel Plate 35mm Pre-machined",
        "supplier": "Nippon Steel Indonesia Dist.",
        "eta": "18 Oct 2026",
        "stockCoverHours": 140,
        "supplierLeadDays": 7,
        "status": "Normal",
        "riskScore": 0.15,
        "openPo": "PO-2026-IMJ-0888"
    }
]

IROOM_PROJECTS = [
    {
        "id": "prj-01",
        "projectCode": "PRJ-AERO-2026",
        "name": "Boeing 737 Cargo Door Bracket Tooling",
        "customer": "PT Dirgantara Indonesia (PTDI)",
        "currentMilestone": "CNC 5-Axis Rough Machining",
        "progressPercent": 64,
        "targetCompletion": "28 Oct 2026",
        "delayVarianceDays": 3.5,
        "status": "Critical Risk"
    },
    {
        "id": "prj-02",
        "projectCode": "PRJ-AUTO-409",
        "name": "EV Battery Enclosure Extrusion Stamping Die",
        "customer": "Hyundai Motor Manufacturing",
        "currentMilestone": "Wire EDM Profile Slicing",
        "progressPercent": 78,
        "targetCompletion": "22 Oct 2026",
        "delayVarianceDays": 1.0,
        "status": "Delayed"
    },
    {
        "id": "prj-03",
        "projectCode": "PRJ-MED-102",
        "name": "Surgical Titanium Implant Molding Core",
        "customer": "Kalbe Farma Precision",
        "currentMilestone": "CMM Metrology Final FAT",
        "progressPercent": 92,
        "targetCompletion": "19 Oct 2026",
        "delayVarianceDays": 0,
        "status": "On Schedule"
    }
]

IROOM_DRAWINGS = [
    {
        "id": "dwg-01",
        "dwgNumber": "DWG-2026-04-REV-C",
        "title": "Upper Stamping Punch Geometry & Clearance",
        "revision": "Rev C.2",
        "engineer": "Hendra Wijaya, ST",
        "department": "Tooling R&D",
        "submittedDate": "13 Oct 2026 14:15",
        "status": "Pending Review",
        "criticalDwg": True
    },
    {
        "id": "dwg-02",
        "dwgNumber": "DWG-2026-02-REV-B",
        "title": "Base Die Fixture Cooling Channel Routing",
        "revision": "Rev B.0",
        "engineer": "Siti Rahma, MT",
        "department": "CAD/CAM Engineering",
        "submittedDate": "12 Oct 2026 09:30",
        "status": "Approved",
        "criticalDwg": False
    },
    {
        "id": "dwg-03",
        "dwgNumber": "DWG-2026-07-REV-A",
        "title": "EDM Electrode Holder Electrode Pattern",
        "revision": "Rev A.1",
        "engineer": "Agus Pratama",
        "department": "Machining Prep",
        "submittedDate": "14 Oct 2026 08:00",
        "status": "Revision Needed",
        "criticalDwg": False
    }
]

IROOM_QUOTATIONS = [
    {
        "id": "po-01",
        "poNumber": "PO-2026-IMJ-0891",
        "quotationRef": "QTN-MET-2026-442",
        "vendorName": "PT Metalindo Perkasa Steel",
        "totalValueIdr": "Rp 148.500.000",
        "status": "PO Issued",
        "paymentTerm": "Net 30 Days",
        "expedited": True
    },
    {
        "id": "po-02",
        "poNumber": "PO-2026-IMJ-0894",
        "quotationRef": "QTN-FST-2026-108",
        "vendorName": "Fastener Global Solution Pte",
        "totalValueIdr": "Rp 64.200.000",
        "status": "Pending Approval",
        "paymentTerm": "CBD (Advance 50%)",
        "expedited": True
    },
    {
        "id": "po-03",
        "poNumber": "PO-2026-IMJ-0888",
        "quotationRef": "QTN-NP-2026-902",
        "vendorName": "Nippon Steel Indonesia Dist.",
        "totalValueIdr": "Rp 312.000.000",
        "status": "PO Issued",
        "paymentTerm": "Net 45 Days",
        "expedited": False
    }
]

IROOM_OPERATIONS = [
    {
        "id": "op-01",
        "workCenter": "CNC Milling Cell 01",
        "machineId": "DMG-MORI-NLX2500",
        "operator": "Budi Santoso (Cert L2)",
        "shift": "Shift 1 (Morning)",
        "oeePercent": 88.5,
        "spindleUtilization": 94.2,
        "vibrationSensor": "NORMAL",
        "activeJob": "PRJ-AERO-2026 / WBS-1.2"
    },
    {
        "id": "op-02",
        "workCenter": "Hydraulic Press Stamping",
        "machineId": "KOMATSU-PRESS-P07",
        "operator": "Fajar Nugraha",
        "shift": "Shift 1 (Morning)",
        "oeePercent": 68.2,
        "spindleUtilization": 62.0,
        "vibrationSensor": "ELEVATED",
        "activeJob": "PRJ-AUTO-409 / Stamping Die Prep"
    },
    {
        "id": "op-03",
        "workCenter": "Wire EDM Cell 03",
        "machineId": "SODICK-ALC600G",
        "operator": "Rudi Hermawan (Cert L3)",
        "shift": "Shift 1 (Morning)",
        "oeePercent": 95.8,
        "spindleUtilization": 98.0,
        "vibrationSensor": "NORMAL",
        "activeJob": "PRJ-AUTO-409 / WBS-1.3"
    }
]

PRODUCTION_LINES = [
    {"id": "line-01", "name": "Assembly Line 01 (Precision Stamping)", "utilization": 92, "outputActual": 1240, "outputTarget": 1300, "status": "On track", "statusColor": "green"},
    {"id": "line-02", "name": "Assembly Line 02 (CNC 5-Axis Milling)", "utilization": 68, "outputActual": 890, "outputTarget": 1000, "status": "Attention", "statusColor": "warn"},
    {"id": "line-03", "name": "Packaging Line 03 (Sub-Assembly Cleanroom)", "utilization": 96, "outputActual": 1510, "outputTarget": 1500, "status": "Above target", "statusColor": "cyan"},
    {"id": "line-04", "name": "Assembly Line 04 (Wire EDM & Grinding)", "utilization": 84, "outputActual": 1080, "outputTarget": 1200, "status": "On track", "statusColor": "green"}
]

PERFORMANCE_METRICS = {
    "output": {
        "actual": [1020, 910, 1170, 740, 840, 630, 710],
        "target": [1000, 1000, 1000, 1000, 1000, 1000, 1000],
        "labels": ["1.2k", "900", "600", "300"],
        "min": 300,
        "max": 1200,
        "unit": "Units Produced"
    },
    "oee": {
        "actual": [86, 78, 83, 63, 70, 55, 61],
        "target": [85, 85, 85, 85, 85, 85, 85],
        "labels": ["100%", "80%", "60%", "40%"],
        "min": 40,
        "max": 100,
        "unit": "Overall Equipment Effectiveness (%)"
    },
    "downtime": {
        "actual": [2.4, 3.1, 2.2, 4.8, 3.9, 5.4, 4.3],
        "target": [2.5, 2.5, 2.5, 2.5, 2.5, 2.5, 2.5],
        "labels": ["6h", "4.5h", "3h", "1.5h"],
        "min": 1.5,
        "max": 6.0,
        "unit": "Cumulative Downtime (hrs)"
    }
}

DECISION_ACTIONS = [
    {
        "id": "act-rebalance",
        "title": "Rebalance Cell 02 Shift Allocation",
        "urgency": "High",
        "urgency_badge": "warn",
        "department": "Production Planning",
        "confidence": 87,
        "description": "Cell 02 sub-assembly is pacing 11% below target (890 vs 1,000 units). Transfer one cross-trained technician from Cell 04 to recover ~120 units and eliminate 0.8 days slippage.",
        "impact": "Recovers 120 units/shift; prevents downstream bottleneck on WBS-3.1",
        "owner": "Production Supervisor",
        "due": "Before 15:00 shift change",
        "source_doc": "SOP-LINE2-OPT",
        "flagged": False,
        "status": "pending",
        "checklist": [
            "Verify Level-2 aerospace certification of transferred technician (SOP-LINE2-OPT Cl. 2.2)",
            "Confirm Cell 04 output buffer remains >= 100% of shift quota",
            "Log shift transfer in Operation Tracker before 15:00 WIB"
        ]
    },
    {
        "id": "act-shortage",
        "title": "Authorize Express Ingestion for Alloy M-204",
        "urgency": "Urgent",
        "urgency_badge": "red",
        "department": "Supply Chain",
        "confidence": 91,
        "description": "Component M-204 buffer inventory will exhaust in 36 hours. Supplier standard lead time is 3 business days. Authorize express air-freight under SOP-SCM-12 to safeguard PO-089 & PO-092.",
        "impact": "Protects Rp 480M contract value from liquidated late delivery penalties",
        "owner": "Supply Chain Lead",
        "due": "Within 4 hours",
        "source_doc": "SOP-SCM-12",
        "flagged": False,
        "status": "pending",
        "checklist": [
            "Verify on-hand warehouse count for INGOT-AL7075-T6 / M-204 (<48h cover)",
            "Confirm expedited freight quote <= Rp 25.000.000 ceiling (SOP-SCM-12 Cl. 5.3)",
            "Lock supplier airway bill against PO-2026-IMJ-0891"
        ]
    },
    {
        "id": "act-inspect",
        "title": "Condition-Based Hydraulic Service (Press P-07)",
        "urgency": "Medium",
        "urgency_badge": "warn",
        "department": "Maintenance",
        "confidence": 82,
        "description": "Hydraulic vibration index rose +18% over baseline on Press P-07. Execute 45-minute seal and transducer check during scheduled die changeover before batch stamping.",
        "impact": "Avoids catastrophic die collision and estimated 4-8 hours unplanned outage",
        "owner": "Maintenance Lead",
        "due": "Before next batch run",
        "source_doc": "SOP-PRS-04",
        "flagged": False,
        "status": "pending",
        "checklist": [
            "Verify vibration transducer calibration against +15% baseline threshold (SOP-PRS-04 Cl. 3.2)",
            "Inspect hydraulic seal integrity and +/-0.02mm die clearance",
            "Record inspection ticket under ISO 9001 cl. 7.5"
        ]
    },
    {
        "id": "act-drawing",
        "title": "Fast-Track DWG-2026-04 Technical Review",
        "urgency": "Urgent",
        "urgency_badge": "red",
        "department": "Engineering & R&D",
        "confidence": 89,
        "description": "Drawing revisions for customer order PO-089 are pending sign-off for 48 hours. Activate expedited engineering review protocol under SOP-ENG-02 to release CAM toolpaths.",
        "impact": "Recovers 1.5 days critical path variance on WBS-1.1",
        "owner": "Engineering Lead",
        "due": "Today, 12:00 WIB",
        "source_doc": "SOP-ENG-02",
        "flagged": False,
        "status": "pending",
        "checklist": [
            "Verify GD&T bore compensation (+0.040mm offset) on Rev 3.1 (SOP-ENG-02 Cl. 3.1)",
            "Confirm 4-working-hour critical path SLA sign-off (Cl. 2.3)",
            "Release verified CAM toolpath to CNC Milling Cell A"
        ]
    }
]

SOP_KNOWLEDGE_INDEX = [
    {
        "doc_code": "SOP-PRS-04",
        "title": "Hydraulic Stamping & Press P-07 Operating Protocol",
        "clause": "Clause 3.2: Vibration Thresholds",
        "keywords": ["press", "p-07", "vibration", "hydraulic", "stamping", "maintenance", "changeover"],
        "excerpt": "If the vibration index exceeds baseline by more than +15%, immediate condition inspection of hydraulic seals, bearings, and load cells is mandatory before commencing the next stamping cycle."
    },
    {
        "doc_code": "SOP-SCM-12",
        "title": "Critical Component Shortage & Express Procurement",
        "clause": "Clause 2.1: Buffer Inventory Warning",
        "keywords": ["shortage", "m-204", "al7075", "ingot", "procurement", "supplier", "freight", "inventory", "po"],
        "excerpt": "When buffer stock falls below 48 hours and supplier lead time exceeds 48 hours, the Supply Chain Lead is authorized to trigger express air freight (pre-approved up to Rp 25M)."
    },
    {
        "doc_code": "SOP-LINE2-OPT",
        "title": "Assembly Cell Line Balancing & Operator Reallocation",
        "clause": "Clause 1.4: Throughput Variance Trigger",
        "keywords": ["line 2", "cell 02", "rebalance", "operator", "throughput", "shift", "lagging"],
        "excerpt": "If cell attainment falls below 90% of shift target for more than 2 consecutive hours, transfer one Level-2 cross-trained operator from an adjacent balanced cell."
    },
    {
        "doc_code": "SOP-ENG-02",
        "title": "Engineering Change Order (ECO) & Drawing Approval",
        "clause": "Clause 2.3: Expedited Turnaround",
        "keywords": ["drawing", "cad", "cam", "approval", "dwg-2026-04", "revision", "gdt"],
        "excerpt": "Critical path drawing revisions must be reviewed by the Lead Tooling Engineer within 4 working hours and validated with CMM metrology."
    }
]

AUDIT_LOG: List[Dict[str, Any]] = []

# -------------------------------------------------------------
# Part 2 PoC Specification Endpoints
# -------------------------------------------------------------

# -------------------------------------------------------------
# Active schedule analysis (CPM + XGBoost + Monte Carlo)
# -------------------------------------------------------------

DEFAULT_PROJECT_NAME = "Project Alpha - Precision Stamping & Aerospace Tooling"


def _analyze_sample() -> Dict[str, Any]:
    tasks = []
    for t in copy.deepcopy(SAMPLE_WBS):
        tasks.append({
            "code": t["code"], "task": t["task"], "planned_days": float(t["planned_days"]),
            "actual_days": float(t["actual_days"]), "predecessors": t["predecessors"],
            "has_dependency_column": True, "work_center": t["work_center"], "owner": t["owner"],
            "status_declared": t["status"],
        })
    return analyze_schedule(compute_cpm(tasks), DEFAULT_PROJECT_NAME)


ACTIVE_ANALYSIS: Dict[str, Any] = {"source": "sample", "filename": "master_project_schedule_rev3.xlsx", **_analyze_sample()}


def _risk_headline() -> str:
    a = ACTIVE_ANALYSIS
    return f"{a['overall_delay_probability']:.1f}% (+{a['estimated_project_slippage_days']:.1f}d)"


@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "engine": "MDIP PoC v1.1 (CPM + XGBoost Delay-Risk + Grounded SOP Retrieval)",
        "deployment": "Hybrid SaaS / Internal Enterprise"
    }

@app.get("/api/health")
def api_health_check():
    return {
        "status": "ok",
        "engine": "MDIP PoC v1.1 (CPM + XGBoost Delay-Risk + Grounded SOP Retrieval)",
        "live": True
    }

@app.post("/api/scheduler/upload")
async def parse_schedule(file: Optional[UploadFile] = File(None)):
    result = await upload_scheduler_v1(file)
    return {
        "filename": result["filename"],
        "status": "standardized",
        "parse_time_ms": result["parse_time_ms"],
        "tasks_extracted": result["tasks_extracted"],
        "schema_version": "mdip-v1"
    }

@app.post("/api/risks/evaluate")
def evaluate_delay_risk(tasks: List[TaskItem]):
    items = []
    for t in tasks:
        float_days = t.float_days or 0
        items.append({
            "code": t.task_id, "task": t.name, "planned_days": float(t.planned_days),
            "actual_days": float(t.actual_days or t.planned_days), "float_days": float_days,
            "critical": float_days == 0, "upstream_slip_days": float(t.upstream_slip_days),
            "external_dependency": t.external_vendor, "work_center": t.work_center or "",
            "resource_utilization": t.resource_utilization, "drawing_revisions": t.drawing_revisions or 0,
        })
    score_tasks(items)
    results = [{
        "task_id": i["code"],
        "name": i["task"],
        "delay_probability": round(i["delay_risk"], 2),
        "risk_level": i["risk_level"],
        "expected_slip_days": i["expected_slip_days"],
        "drivers": [d["label"] for d in i["drivers"]] or ["Normal operating baseline"],
    } for i in items]
    return {"evaluated_tasks": len(results), "predictions": results}

@app.post("/api/copilot/ask")
def ask_copilot(payload: CopilotQuery):
    return {
        "answer": (
            "Based on the current project schedule, WBS-1.2 carries an 85% delay risk "
            "due to a 2-day upstream slip in raw plate procurement and external vendor dependency."
        ),
        "citations": [
            {"doc_id": "SCH-IMAJIN-04.xlsx", "Location": "Row 14, Col D-G", "verified": True},
            {"doc_id": "SOP-SCM-12.pdf", "Location": "Clause 2.1 (Vendor Lead Time)", "verified": True}
        ]
    }

# -------------------------------------------------------------
# IRoom System Connector Endpoints (/api/v1/iroom/...)
# -------------------------------------------------------------

@app.get("/api/v1/iroom/materials")
def get_iroom_materials():
    return IROOM_MATERIALS

@app.get("/api/v1/iroom/progress")
def get_iroom_progress():
    return IROOM_PROJECTS

@app.get("/api/v1/iroom/drawings")
def get_iroom_drawings():
    return IROOM_DRAWINGS

@app.get("/api/v1/iroom/quotations")
def get_iroom_quotations():
    return IROOM_QUOTATIONS

@app.get("/api/v1/iroom/operations")
def get_iroom_operations():
    return IROOM_OPERATIONS

@app.get("/api/v1/iroom/overview")
def get_iroom_overview():
    return {
        "status": "connected",
        "source": "IRoom Manufacturing Telemetry Gateway (Simulated PoC)",
        "modules_active": 5,
        "total_active_records": {
            "materials": len(IROOM_MATERIALS),
            "projects": len(IROOM_PROJECTS),
            "drawings": len(IROOM_DRAWINGS),
            "quotations": len(IROOM_QUOTATIONS),
            "operations": len(IROOM_OPERATIONS)
        },
        "critical_alerts": [
            {"module": "Material Delivery", "alert": "INGOT-AL7075-T6 stock cover under 36 hours"},
            {"module": "Project Progress", "alert": "Boeing Cargo Door bracket tooling has 3.5d delay risk"},
            {"module": "Operation Tracker", "alert": "Komatsu Press P-07 vibration +18% above baseline"}
        ]
    }

# -------------------------------------------------------------
# Dashboard & Analytics Endpoints (/api/v1/...)
# -------------------------------------------------------------

@app.get("/api/v1/analytics/performance")
def get_performance_metric(metric: str = Query("output", enum=["output", "oee", "downtime"])):
    return PERFORMANCE_METRICS.get(metric, PERFORMANCE_METRICS["output"])

@app.get("/api/v1/dashboard/lines")
def get_production_lines():
    return PRODUCTION_LINES

@app.get("/api/v1/scheduler/wbs")
def get_wbs_schedule():
    return ACTIVE_ANALYSIS["tasks"]

@app.post("/api/v1/scheduler/upload")
async def upload_scheduler_v1(file: Optional[UploadFile] = File(None)):
    """Parse an uploaded CSV/XLSX schedule (or reload the sample when no file is sent), run CPM and score it."""
    global ACTIVE_ANALYSIS
    start = time.perf_counter()
    if file is None or not file.filename:
        filename = "master_project_schedule_rev3.xlsx"
        analysis = {"source": "sample", "filename": filename, **_analyze_sample()}
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
    ACTIVE_ANALYSIS = analysis
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
    """Training provenance, held-out metrics and global feature importance of the delay-risk model."""
    return model_card()


@app.get("/api/v1/risks/decisions")
def get_decisions():
    return DECISION_ACTIONS

@app.post("/api/v1/risks/decisions/flag")
def flag_decision(payload: FlagActionPayload):
    decision_val = (payload.decision or "AUTHORIZED").upper()
    action_title = payload.action_id
    sop_ref = "SOP-MDIP"
    for act in DECISION_ACTIONS:
        if act["id"] == payload.action_id:
            act["flagged"] = True
            act["status"] = "overridden" if decision_val == "OVERRIDDEN" else "authorized"
            action_title = act["title"]
            sop_ref = act["source_doc"]
            break

    entry = {
        "id": f"AUD-{len(AUDIT_LOG) + 1:03d}",
        "action_id": payload.action_id,
        "action_title": action_title,
        "decision": decision_val,
        "reviewer_role": payload.reviewer_role,
        "notes": payload.notes or "Verified via HITL modal",
        "sop_ref": sop_ref,
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S")
    }
    AUDIT_LOG.insert(0, entry)

    return {
        "success": True,
        "action_id": payload.action_id,
        "decision": decision_val,
        "status": "FLAGGED_IN_AUDIT_LOG",
        "reviewer": payload.reviewer_role,
        "timestamp": entry["timestamp"],
        "message": f"Action {decision_val.lower()} and recorded by human supervisor."
    }

@app.get("/api/v1/risks/audit-log")
def get_audit_log():
    return AUDIT_LOG

@app.post("/api/v1/copilot/chat")
def copilot_chat(payload: CopilotQuery):
    msg = (payload.message or payload.question or "").strip()
    role = payload.active_role or payload.role or "Operations Manager"
    q_lower = msg.lower()

    scored_docs = []
    for doc in SOP_KNOWLEDGE_INDEX:
        score = 0
        if doc["doc_code"].lower() in q_lower:
            score += 3
        if doc["doc_code"] == "SOP-ENG-02" and any(k in q_lower for k in ["dwg-", "drawing", "blueprint"]):
            score += 2
        for kw in doc["keywords"]:
            if kw in q_lower:
                score += 1
        if score > 0:
            scored_docs.append((score, doc))

    scored_docs.sort(key=lambda item: item[0], reverse=True)
    matched_docs = [doc for _, doc in scored_docs]

    if matched_docs:
        lead = matched_docs[0]
        reply = (
            f"Grounded guidance from {lead['doc_code']} ({lead['title']}) for {role}: "
            f"{lead['clause']} states: {lead['excerpt']}"
        )
        citations = [
            {
                "doc_code": d["doc_code"],
                "clause": d["clause"],
                "title": d["title"],
                "excerpt": d["excerpt"]
            }
            for d in matched_docs[:2]
        ]
        confidence = 0.94
    elif any(k in q_lower for k in ["wbs", "delay", "slip", "schedule", "cnc"]):
        top = sorted(ACTIVE_ANALYSIS["tasks"], key=lambda t: t["delay_risk"], reverse=True)[:2]
        top_txt = " and ".join(
            f"{t['code']} {t['task']} ({t['delay_risk']:.0%} risk, +{t['expected_slip_days']:.1f}d expected)" for t in top
        )
        reply = (
            f"XGBoost delay-risk analysis ({role}): {top_txt} are the highest-risk activities. "
            f"Monte Carlo over the CPM network gives a {ACTIVE_ANALYSIS['overall_delay_probability']:.1f}% chance "
            f"of project slip (P50 +{ACTIVE_ANALYSIS['estimated_project_slippage_days']:.1f}d, "
            f"P80 +{ACTIVE_ANALYSIS['p80_slippage_days']:.1f}d). "
            f"Review SOP-SCM-12 and SOP-LINE2-OPT before executing mitigation."
        )
        citations = [
            {
                "doc_code": SOP_KNOWLEDGE_INDEX[1]["doc_code"],
                "clause": SOP_KNOWLEDGE_INDEX[1]["clause"],
                "title": SOP_KNOWLEDGE_INDEX[1]["title"],
                "excerpt": SOP_KNOWLEDGE_INDEX[1]["excerpt"]
            },
            {
                "doc_code": SOP_KNOWLEDGE_INDEX[2]["doc_code"],
                "clause": SOP_KNOWLEDGE_INDEX[2]["clause"],
                "title": SOP_KNOWLEDGE_INDEX[2]["title"],
                "excerpt": SOP_KNOWLEDGE_INDEX[2]["excerpt"]
            }
        ]
        confidence = 0.91
    else:
        reply = (
            f"Priority assessment for {role}: "
            f"1. Resolve Alloy M-204 / INGOT-AL7075-T6 stock cover (36h left vs 3-day vendor lead time). "
            f"2. Perform condition inspection on Press P-07 (+18% vibration exceeds +15% threshold). "
            f"3. Rebalance Cell 02 staffing to recover ~120 units/shift."
        )
        citations = [
            {
                "doc_code": SOP_KNOWLEDGE_INDEX[1]["doc_code"],
                "clause": SOP_KNOWLEDGE_INDEX[1]["clause"],
                "title": SOP_KNOWLEDGE_INDEX[1]["title"],
                "excerpt": SOP_KNOWLEDGE_INDEX[1]["excerpt"]
            },
            {
                "doc_code": SOP_KNOWLEDGE_INDEX[0]["doc_code"],
                "clause": SOP_KNOWLEDGE_INDEX[0]["clause"],
                "title": SOP_KNOWLEDGE_INDEX[0]["title"],
                "excerpt": SOP_KNOWLEDGE_INDEX[0]["excerpt"]
            }
        ]
        confidence = 0.93

    return {
        "success": True,
        "reply": reply,
        "citations": citations,
        "confidence": confidence,
        "is_grounded": True,
        "source_documents_indexed": len(SOP_KNOWLEDGE_INDEX)
    }

@app.get("/api/v1/dashboard/overview")
def get_overview(role: str = "Operations Manager"):
    return {
        "success": True,
        "active_role": role,
        "header": {
            "title": f"Operations Cockpit ({role})",
            "sub": "TRL 4 decision intelligence & risk mitigation telemetry (FastAPI PoC)"
        },
        "kpis": [
            {"label": "Schedule Attainment", "value": "91.5%", "change": "-2.5%", "status": "WARNING"},
            {"label": "ML Delay Risk", "value": f"{ACTIVE_ANALYSIS['overall_delay_probability']:.1f}%", "change": f"+{ACTIVE_ANALYSIS['estimated_project_slippage_days']:.1f}d Slippage", "status": "WARNING" if ACTIVE_ANALYSIS["overall_delay_probability"] >= 35 else "OK"},
            {"label": "First-Time Quality Yield", "value": "97.1%", "change": "-0.6%", "status": "WARNING"},
            {"label": "Open HITL Decisions", "value": f"{sum(1 for a in DECISION_ACTIONS if not a['flagged'])} Pending", "change": "Review Required", "status": "WARNING"}
        ],
        "source": "fastapi_poc_live"
    }

@app.get("/api/v1/dashboard/export")
def export_summary(role: str = "Operations Manager"):
    return {
        "role": role,
        "export_date": time.strftime("%Y-%m-%d %H:%M:%S"),
        "platform": "MDIP AI Manufacturing Copilot (TRL 4 PoC)",
        "summary": f"Schedule Attainment: 91.5% | Delay Risk: {_risk_headline()} | Quality Yield: 97.1%"
    }
