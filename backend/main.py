from fastapi import FastAPI, UploadFile, File, Query, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Any, Dict
import time

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

class CopilotQuery(BaseModel):
    question: Optional[str] = None
    message: Optional[str] = None
    role: Optional[str] = "Operations Manager"
    active_role: Optional[str] = None
    context_module: Optional[str] = None

class FlagActionPayload(BaseModel):
    action_id: str
    reviewer_role: Optional[str] = "Operations Manager"

class ScheduleUploadPayload(BaseModel):
    filename: Optional[str] = "master_project_schedule_rev3.xlsx"
    source_type: Optional[str] = "EXCEL_WBS"

# -------------------------------------------------------------
# Seed Telemetry & IRoom Mock Datasets
# -------------------------------------------------------------

SAMPLE_WBS = [
    {"code": "WBS-1.1", "task": "Material Ingestion & Inspection", "planned_days": 4, "actual_days": 4, "critical": False, "delay_risk": 0.15, "status": "COMPLETED", "variance_days": 0},
    {"code": "WBS-1.2", "task": "CNC Rough Machining (Cell A)", "planned_days": 8, "actual_days": 10, "critical": True, "delay_risk": 0.72, "status": "IN_PROGRESS", "variance_days": 2},
    {"code": "WBS-1.3", "task": "Precision Wire EDM Sub-assembly", "planned_days": 5, "actual_days": 6, "critical": True, "delay_risk": 0.65, "status": "IN_PROGRESS", "variance_days": 1},
    {"code": "WBS-1.4", "task": "Heat Treatment & Hardening", "planned_days": 6, "actual_days": 6, "critical": False, "delay_risk": 0.28, "status": "PENDING", "variance_days": 0},
    {"code": "WBS-1.5", "task": "Surface Finishing & Coating", "planned_days": 4, "actual_days": 4, "critical": False, "delay_risk": 0.20, "status": "PENDING", "variance_days": 0},
    {"code": "WBS-1.6", "task": "CMM Metrology & Quality Audit", "planned_days": 3, "actual_days": 3, "critical": True, "delay_risk": 0.40, "status": "PENDING", "variance_days": 0},
    {"code": "WBS-1.7", "task": "Final Packaging & Dispatch", "planned_days": 2, "actual_days": 2, "critical": True, "delay_risk": 0.18, "status": "PENDING", "variance_days": 0}
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
        "actual": [62, 55, 71, 45, 51, 38, 43],
        "target": [50, 50, 50, 50, 50, 50, 50],
        "labels": ["1.2k", "900", "600", "300"],
        "unit": "Units Produced"
    },
    "oee": {
        "actual": [75, 68, 72, 55, 61, 48, 53],
        "target": [50, 50, 50, 50, 50, 50, 50],
        "labels": ["100%", "80%", "60%", "40%"],
        "unit": "Overall Equipment Effectiveness (%)"
    },
    "downtime": {
        "actual": [40, 52, 37, 64, 58, 70, 61],
        "target": [65, 65, 65, 65, 65, 65, 65],
        "labels": ["12h", "9h", "6h", "3h"],
        "unit": "Cumulative Downtime (hrs)"
    }
}

# -------------------------------------------------------------
# Part 2 PoC Specification Endpoints
# -------------------------------------------------------------

@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "engine": "MDIP PoC v1.0 (Rule-Based + Grounded IRoom Retrieval)",
        "deployment": "Hybrid SaaS / Internal Enterprise"
    }

@app.get("/api/health")
def api_health_check():
    return {
        "status": "ok",
        "engine": "MDIP PoC v1.0 (Rule-Based + Grounded IRoom Retrieval)",
        "live": True
    }

@app.post("/api/scheduler/upload")
async def parse_schedule(file: Optional[UploadFile] = File(None)):
    start = time.perf_counter()
    filename = file.filename if file else "master_project_schedule_rev3.xlsx"
    elapsed_ms = round((time.perf_counter() - start) * 1000, 2)
    return {
        "filename": filename,
        "status": "standardized",
        "parse_time_ms": elapsed_ms,
        "tasks_extracted": len(SAMPLE_WBS),
        "schema_version": "mdip-v1"
    }

@app.post("/api/risks/evaluate")
def evaluate_delay_risk(tasks: List[TaskItem]):
    results = []
    for t in tasks:
        score = 0.15
        drivers = []
        if t.upstream_slip_days > 0:
            score += min(0.45, t.upstream_slip_days * 0.1)
            drivers.append(f"Upstream slippage (+{t.upstream_slip_days}d)")
        if t.external_vendor:
            score += 0.25
            drivers.append("External vendor dependency")
        if t.planned_days > 14:
            score += 0.10
            drivers.append("Long duration task (>14d)")

        risk_prob = round(min(score, 0.98), 2)
        results.append({
            "task_id": t.task_id,
            "name": t.name,
            "delay_probability": risk_prob,
            "risk_level": "HIGH" if risk_prob >= 0.6 else ("MEDIUM" if risk_prob >= 0.35 else "LOW"),
            "drivers": drivers or ["Normal operating baseline"]
        })
    return {"evaluated_tasks": len(results), "predictions": results}

@app.post("/api/copilot/ask")
def ask_copilot(payload: CopilotQuery):
    return {
        "answer": (
            "Based on the current project schedule, Fabrication Stage B carries a 75% delay risk "
            "due to a 4-day upstream slip in raw plate procurement and external vendor dependency."
        ),
        "citations": [
            {"doc_id": "SCH-IMAJIN-04.xlsx", "Location": "Row 14, Col D-G", "verified": True},
            {"doc_id": "SOP-PROC-02.pdf", "Location": "Section 3.2 (Vendor Lead Time)", "verified": True}
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
        "source": "IRoom Manufacturing Telemetry Gateway",
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
    return SAMPLE_WBS

@app.post("/api/v1/scheduler/upload")
def upload_scheduler_v1(payload: Optional[ScheduleUploadPayload] = None):
    filename = payload.filename if payload else "master_project_schedule_rev3.xlsx"
    return {
        "success": True,
        "filename": filename,
        "tasks_extracted": len(SAMPLE_WBS),
        "critical_path_tasks": sum(1 for t in SAMPLE_WBS if t["critical"]),
        "high_risk_tasks": sum(1 for t in SAMPLE_WBS if t["delay_risk"] > 0.6),
        "message": f"Extracted and normalized {len(SAMPLE_WBS)} WBS activities from {filename}.",
        "tasks": SAMPLE_WBS
    }

@app.get("/api/v1/risks/prediction")
def get_delay_prediction():
    return {
        "project_name": "Project Alpha - Precision Stamping & Aerospace Tooling",
        "overall_delay_probability": 65.2,
        "critical_path_tasks_count": sum(1 for t in SAMPLE_WBS if t["critical"]),
        "high_risk_tasks_count": sum(1 for t in SAMPLE_WBS if t["delay_risk"] > 0.6),
        "estimated_project_slippage_days": 3.5,
        "risk_drivers": [
            {"factor": "CNC Machine Availability", "impact": "High (+2.1d)", "severity": "HIGH"},
            {"factor": "Raw Ingot Lead Time", "impact": "Medium (+1.0d)", "severity": "MEDIUM"},
            {"factor": "Tooling Wear Rate", "impact": "Low (+0.4d)", "severity": "LOW"}
        ],
        "tasks": SAMPLE_WBS,
        "methodology": "Rule-Based PoC Heuristic v0.1"
    }

@app.get("/api/v1/risks/decisions")
def get_decisions():
    return [
        {
            "id": "ACT-001",
            "title": "Otorisasi Overtime Operator CNC Cell A",
            "urgency": "Kritis (Hari Ini)",
            "urgency_badge": "CRITICAL",
            "department": "Produksi",
            "confidence": 92.5,
            "description": "Menambahkan shift lembur 3.5 jam untuk mengejar deviasi 2 hari pada WBS-1.2.",
            "impact": "Memulihkan 80% keterlambatan jalur kritis",
            "owner": "Budi Santoso (Kadiv Machining)",
            "due": "Hari Ini, 16:00 WIB",
            "source_doc": "SOP-PROD-2024-V2.pdf",
            "flagged": False
        },
        {
            "id": "ACT-002",
            "title": "Pengalihan Vendor Heat Treatment Sekunder",
            "urgency": "Tinggi (24 Jam)",
            "urgency_badge": "HIGH",
            "department": "Procurement",
            "confidence": 88.0,
            "description": "Mempersiapkan purchase order darurat ke mitra bersertifikasi AS9100 cadangan.",
            "impact": "Mitigasi bottleneck antrian oven hardening 4 hari",
            "owner": "Rina Wijaya (Lead Buyer)",
            "due": "Besok, 10:00 WIB",
            "source_doc": "VENDOR-CONTRACT-SEC-09.docx",
            "flagged": False
        }
    ]

@app.post("/api/v1/risks/decisions/flag")
def flag_decision(payload: FlagActionPayload):
    return {
        "success": True,
        "action_id": payload.action_id,
        "status": "FLAGGED_IN_AUDIT_LOG",
        "reviewer": payload.reviewer_role,
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
        "message": "Action successfully verified and recorded by human supervisor."
    }

@app.post("/api/v1/copilot/chat")
def copilot_chat(payload: CopilotQuery):
    msg = payload.message or payload.question or ""
    return {
        "success": True,
        "reply": (
            "Berdasarkan analisis telemetri IRoom aktif dan dokumen SOP manufaktur terverifikasi: "
            "Aktivitas WBS-1.2 (CNC Rough Machining) memiliki probabilitas deviasi keterlambatan 72% "
            "akibat akumulasi variansi +2 hari pada Cell A dan ketergantungan material Alloy AL7075-T6."
        ),
        "citations": [
            {
                "doc_code": "SCH-IMAJIN-04",
                "clause": "WBS Section 1.2",
                "title": "Master Manufacturing Schedule Rev 3",
                "excerpt": "Upstream plate delivery variance logged at +2.0 days."
            },
            {
                "doc_code": "SOP-PROD-02",
                "clause": "Section 4.1 (Bottleneck Remediation)",
                "title": "Standard Operating Procedure CNC Milling",
                "excerpt": "When spindle utilization exceeds 90%, load balancing to Cell B is required."
            }
        ],
        "confidence": 0.94,
        "is_grounded": True,
        "source_documents_indexed": 4
    }

@app.get("/api/v1/dashboard/overview")
def get_overview(role: str = "Operations Manager"):
    return {
        "success": True,
        "active_role": role,
        "header": {
            "title": f"Operations Cockpit — {role}",
            "sub": "Real-time decision intelligence & risk mitigation telemetry"
        },
        "kpis": [
            {"label": "Jadwal On-Time Rate", "value": "88.4%", "change": "+2.1%", "status": "POSITIVE"},
            {"label": "Probabilitas Delay Proyek", "value": "65.2%", "change": "+4.0%", "status": "WARNING"},
            {"label": "Estimasi Slippage", "value": "3.5 Hari", "change": "+0.5d", "status": "DANGER"},
            {"label": "Keputusan Terbuka", "value": "2 Kritis", "change": "Action Needed", "status": "WARNING"}
        ],
        "source": "fastapi_poc_live"
    }

@app.get("/api/v1/dashboard/export")
def export_summary(role: str = "Operations Manager"):
    return {
        "role": role,
        "export_date": time.strftime("%Y-%m-%d %H:%M:%S"),
        "platform": "MDIP AI Manufacturing Copilot",
        "summary": "OEE: 82.4% | On-Time Rate: 88.4% | Critical Actions: 2 pending approval"
    }
