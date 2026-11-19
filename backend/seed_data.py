"""
Demo seed data for MDIP: IRoom telemetry streams, SOP knowledge index and demo user accounts.
Loaded into SQLite / Supabase by database.init_db() when the tables are empty.
Edit this file to change what a fresh database starts with.
"""

from typing import Any, Dict, List

INITIAL_IROOM_DATA: Dict[str, List[Dict[str, Any]]] = {
    "materials": [
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
            "openPo": "PO-2026-IMJ-0891",
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
            "openPo": "PO-2026-IMJ-0894",
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
            "openPo": "PO-2026-IMJ-0888",
        },
    ],
    "progress": [
        {
            "id": "prj-01",
            "projectCode": "PRJ-AERO-2026",
            "name": "Boeing 737 Cargo Door Bracket Tooling",
            "customer": "PT Dirgantara Indonesia (PTDI)",
            "currentMilestone": "CNC 5-Axis Rough Machining",
            "progressPercent": 64,
            "targetCompletion": "28 Oct 2026",
            "delayVarianceDays": 3.5,
            "status": "Critical Risk",
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
            "status": "Delayed",
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
            "status": "On Schedule",
        },
    ],
    "drawings": [
        {
            "id": "dwg-01",
            "dwgNumber": "DWG-2026-04-REV-C",
            "title": "Upper Stamping Punch Geometry & Clearance",
            "revision": "Rev C.2",
            "engineer": "Hendra Wijaya, ST",
            "department": "Tooling R&D",
            "submittedDate": "13 Oct 2026 14:15",
            "status": "Pending Review",
            "criticalDwg": True,
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
            "criticalDwg": False,
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
            "criticalDwg": False,
        },
    ],
    "quotations": [
        {
            "id": "po-01",
            "poNumber": "PO-2026-IMJ-0891",
            "quotationRef": "QTN-MET-2026-442",
            "vendorName": "PT Metalindo Perkasa Steel",
            "totalValueIdr": "Rp 148.500.000",
            "status": "PO Issued",
            "paymentTerm": "Net 30 Days",
            "expedited": True,
        },
        {
            "id": "po-02",
            "poNumber": "PO-2026-IMJ-0894",
            "quotationRef": "QTN-FST-2026-108",
            "vendorName": "Fastener Global Solution Pte",
            "totalValueIdr": "Rp 64.200.000",
            "status": "Pending Approval",
            "paymentTerm": "CBD (Advance 50%)",
            "expedited": True,
        },
        {
            "id": "po-03",
            "poNumber": "PO-2026-IMJ-0888",
            "quotationRef": "QTN-NP-2026-902",
            "vendorName": "Nippon Steel Indonesia Dist.",
            "totalValueIdr": "Rp 312.000.000",
            "status": "PO Issued",
            "paymentTerm": "Net 45 Days",
            "expedited": False,
        },
    ],
    "operations": [
        {
            "id": "op-01",
            "workCenter": "CNC Milling Cell 01",
            "machineId": "DMG-MORI-NLX2500",
            "operator": "Budi Santoso (Cert L2)",
            "shift": "Shift 1 (Morning)",
            "oeePercent": 88.5,
            "spindleUtilization": 94.2,
            "vibrationSensor": "NORMAL",
            "activeJob": "PRJ-AERO-2026 / WBS-1.2",
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
            "activeJob": "PRJ-AUTO-409 / Stamping Die Prep",
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
            "activeJob": "PRJ-AUTO-409 / WBS-1.3",
        },
    ],
}

INITIAL_SOPS: List[Dict[str, Any]] = [
    {
        "doc_code": "SOP-PRS-04",
        "title": "Hydraulic Stamping & Press P-07 Operating Protocol",
        "clause": "Clause 3.2: Vibration Thresholds",
        "keywords": ["press", "p-07", "vibration", "hydraulic", "stamping", "maintenance", "changeover", "die"],
        "excerpt": (
            "If the vibration index exceeds baseline by more than +15%, immediate condition inspection "
            "of hydraulic seals, bearings, and load cells is mandatory before commencing the next stamping cycle."
        ),
    },
    {
        "doc_code": "SOP-SCM-12",
        "title": "Critical Component Shortage & Express Procurement",
        "clause": "Clause 2.1: Buffer Inventory Warning",
        "keywords": ["shortage", "m-204", "al7075", "ingot", "procurement", "supplier", "freight", "inventory", "po", "material"],
        "excerpt": (
            "When buffer stock falls below 48 hours and supplier lead time exceeds 48 hours, the Supply Chain Lead "
            "is authorized to trigger express air freight (pre-approved up to Rp 25M)."
        ),
    },
    {
        "doc_code": "SOP-LINE2-OPT",
        "title": "Assembly Cell Line Balancing & Operator Reallocation",
        "clause": "Clause 1.4: Throughput Variance Trigger",
        "keywords": ["line 2", "cell 02", "rebalance", "operator", "throughput", "shift", "lagging", "assembly", "cnc", "machining"],
        "excerpt": (
            "If cell attainment falls below 90% of shift target for more than 2 consecutive hours, transfer one "
            "Level-2 cross-trained operator from an adjacent balanced cell."
        ),
    },
    {
        "doc_code": "SOP-ENG-02",
        "title": "Engineering Change Order (ECO) & Drawing Approval",
        "clause": "Clause 2.3: Expedited Turnaround",
        "keywords": ["drawing", "cad", "cam", "approval", "dwg-2026-04", "revision", "gdt", "engineering", "sign-off"],
        "excerpt": (
            "Critical path drawing revisions must be reviewed by the Lead Tooling Engineer within 4 working hours "
            "and validated with CMM metrology."
        ),
    },
]

INITIAL_USERS: List[Dict[str, str]] = [
    {"id": "usr-ops", "email": "ops.lead@mdip.id", "name": "Budi Santoso", "role": "Operations Manager"},
    {"id": "usr-plant", "email": "plant.manager@mdip.id", "name": "Hendra Wijaya", "role": "Plant Manager"},
    {"id": "usr-prod", "email": "production.supervisor@mdip.id", "name": "Agus H.", "role": "Production Supervisor"},
    {"id": "usr-maint", "email": "maintenance.lead@mdip.id", "name": "Fajar Nugraha", "role": "Maintenance Lead"},
    {"id": "usr-qa", "email": "quality.manager@mdip.id", "name": "Siti Rahma", "role": "Quality Manager"},
    {"id": "usr-scm", "email": "supply.chain.lead@mdip.id", "name": "Rina Wijaya", "role": "Supply Chain Lead"},
]
