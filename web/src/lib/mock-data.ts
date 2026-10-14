import {
  ManufacturingRole,
  RolePreset,
  DecisionAction,
  RiskItem,
  WbsTask,
  KnowledgeDoc,
  RiskDriver,
  ProductionLineItem,
  MaterialDeliveryItem,
  ProjectProgressItem,
  DrawingApprovalItem,
  QuotationPoItem,
  OperationTrackerItem
} from "@/types";

export const ROLES: ManufacturingRole[] = [
  "Operations Manager",
  "Plant Manager",
  "Production Supervisor",
  "Maintenance Lead",
  "Quality Manager",
  "Supply Chain Lead"
];

export const ROLE_PRESETS: Record<ManufacturingRole, RolePreset> = {
  "Operations Manager": {
    title: "Good morning, Operations Manager",
    sub: "Project delivery cockpit: WBS progress, critical path delay risks, and cross-department decisions.",
    kpis: [
      { title: "Project Schedule Attainment", value: "91.5%", trend: "↓ 2.5%", subtle: "vs. planned baseline", icon: "▥", status: "warn" },
      { title: "Overall Delay Risk", value: "65.2%", trend: "+3.5d Slippage", subtle: "critical path exposed", icon: "⚑", status: "alert" },
      { title: "First-Time Quality Yield", value: "97.1%", trend: "↓ 0.6%", subtle: "CMM inspection pass", icon: "✓", status: "warn" },
      { title: "Active Milestone Actions", value: "4", trend: "2 urgent today", subtle: "human review queue", icon: "◉", status: "alert" }
    ]
  },
  "Plant Manager": {
    title: "Good morning, Plant Manager",
    sub: "Monitor plant-wide project delivery performance, contract slippage, and penalty exposure.",
    kpis: [
      { title: "Overall Milestone Compliance", value: "94.8%", trend: "↑ 1.8%", subtle: "target: 95.0%", icon: "▥", status: "normal" },
      { title: "Critical Path Slippage", value: "3.5 Days", trend: "Cell 02 & M-204", subtle: "forecasted variance", icon: "⏱", status: "alert" },
      { title: "Contract Penalty Exposure", value: "Rp 480M", trend: "PO-089 & PO-092", subtle: "late delivery clauses", icon: "⚑", status: "alert" },
      { title: "On-Time In-Full (OTIF)", value: "96.2%", trend: "↑ 0.4%", subtle: "30-day rolling index", icon: "✓", status: "normal" }
    ]
  },
  "Production Supervisor": {
    title: "Good morning, Production Supervisor",
    sub: "Manage cell throughput, technician shift assignments, and WBS fabrication schedules.",
    kpis: [
      { title: "Cell 02 Shift Throughput", value: "890 / 1,000", trend: "↓ 11% below pace", subtle: "Assembly Cell 02", icon: "⚙", status: "alert" },
      { title: "Cells 01 & 04 Attainment", value: "95.4%", trend: "↑ On schedule", subtle: "Normal progression", icon: "▥", status: "normal" },
      { title: "Shift Technician Allocation", value: "92%", trend: "1 technician shortage", subtle: "Cell 02 evening shift", icon: "♙", status: "warn" },
      { title: "Setup & Tooling Delay", value: "1.4 hrs", trend: "↓ 0.3h vs yesterday", subtle: "Die changeover", icon: "⌁", status: "normal" }
    ]
  },
  "Maintenance Lead": {
    title: "Good morning, Maintenance Lead",
    sub: "Prioritize machine health signals, vibration drift on Press P-07, and tooling maintenance.",
    kpis: [
      { title: "Press P-07 Vibration Index", value: "+18%", trend: "Above normal baseline", subtle: "Hydraulic stamping station", icon: "⌁", status: "alert" },
      { title: "Machine Fleet MTBF", value: "142 hrs", trend: "↑ 8.5% improvement", subtle: "Plant rolling metric", icon: "◉", status: "normal" },
      { title: "Open PM Work Orders", value: "8 / 10", trend: "2 scheduled today", subtle: "Tooling preventive checks", icon: "▥", status: "normal" },
      { title: "Estimated Downtime Risk", value: "2.1 hrs", trend: "P-07 risk window", subtle: "Mitigate before batch", icon: "⚑", status: "warn" }
    ]
  },
  "Quality Manager": {
    title: "Good morning, Quality Manager",
    sub: "Track CMM metrology inspection pass rate, drawing tolerance NCRs, and tooling wear.",
    kpis: [
      { title: "First-Pass Quality Yield", value: "97.1%", trend: "↓ 0.6% vs baseline", subtle: "Target: 98.0%", icon: "✓", status: "warn" },
      { title: "Dimension Variance Scrap", value: "2.9%", trend: "Code DF-04 stamping", subtle: "Cell 02 tooling wear", icon: "◈", status: "warn" },
      { title: "Incoming Material QC", value: "98.4%", trend: "↑ 0.2% Alloy EN24", subtle: "Batch #882 certified", icon: "▥", status: "normal" },
      { title: "Open Non-Conformance Reports", value: "3", trend: "1 awaiting vendor RCA", subtle: "M-204 coating spec", icon: "⚑", status: "alert" }
    ]
  },
  "Supply Chain Lead": {
    title: "Good morning, Supply Chain Lead",
    sub: "Monitor vendor lead times, raw material stock cover, and project delivery commitments.",
    kpis: [
      { title: "Alloy M-204 Stock Cover", value: "36 hrs", trend: "Critical shortage risk", subtle: "Vendor lead time: 3 days", icon: "⇄", status: "alert" },
      { title: "Supplier On-Time Delivery", value: "88.6%", trend: "↓ 3.4% Vendor PT Baja", subtle: "Last 14 shipments", icon: "▥", status: "warn" },
      { title: "Expedited Air Freight Cost", value: "Rp 15M", trend: "Air cargo 500 units", subtle: "Protects 2 PO deliveries", icon: "◉", status: "warn" },
      { title: "At-Risk Customer Orders", value: "2 Orders", trend: "PO-089 & PO-092", subtle: "Delay penalty window", icon: "⚑", status: "alert" }
    ]
  }
};

export const INITIAL_ACTIONS: DecisionAction[] = [
  {
    id: "act-rebalance",
    title: "Rebalance Cell 02 Shift Allocation",
    urgency: "High",
    urgencyBadge: "warn",
    department: "Production Planning",
    confidence: 87,
    description: "Cell 02 sub-assembly is pacing 11% below target (890 vs 1,000 units). Transfer one cross-trained technician from Cell 04 to recover ~120 units and eliminate 0.8 days slippage.",
    impact: "Recovers 120 units/shift; prevents downstream bottleneck on WBS-3.1",
    owner: "Production Supervisor",
    due: "Before 15:00 shift change",
    sourceDoc: "SOP-LINE2-OPT",
    flagged: false
  },
  {
    id: "act-shortage",
    title: "Authorize Express Ingestion for Alloy M-204",
    urgency: "Urgent",
    urgencyBadge: "red",
    department: "Supply Chain",
    confidence: 91,
    description: "Component M-204 buffer inventory will exhaust in 36 hours. Supplier standard lead time is 3 business days. Authorize express air-freight under SOP-SCM-12 to safeguard PO-089 & PO-092.",
    impact: "Protects Rp 480M contract value from liquidated late delivery penalties",
    owner: "Supply Chain Lead",
    due: "Within 4 hours",
    sourceDoc: "SOP-SCM-12",
    flagged: false
  },
  {
    id: "act-inspect",
    title: "Condition-Based Hydraulic Service (Press P-07)",
    urgency: "Medium",
    urgencyBadge: "warn",
    department: "Maintenance",
    confidence: 82,
    description: "Hydraulic vibration index rose +18% over baseline on Press P-07. Execute 45-minute seal and transducer check during scheduled die changeover before batch stamping.",
    impact: "Avoids catastrophic die collision and estimated 4-8 hours unplanned outage",
    owner: "Maintenance Lead",
    due: "Before next batch run",
    sourceDoc: "SOP-PRS-04",
    flagged: false
  },
  {
    id: "act-drawing",
    title: "Fast-Track DWG-2026-04 Technical Review",
    urgency: "Urgent",
    urgencyBadge: "red",
    department: "Engineering & R&D",
    confidence: 89,
    description: "Drawing revisions for customer order PO-089 are pending sign-off for 48 hours. Activate expedited engineering review protocol under SOP-PRJ-01 to release CAM toolpaths.",
    impact: "Recovers 1.5 days critical path variance on WBS-1.1",
    owner: "Engineering Lead",
    due: "Today, 12:00 WIB",
    sourceDoc: "SOP-ENG-02",
    flagged: false
  }
];

export const RISKS_AND_OPPORTUNITIES: RiskItem[] = [
  {
    id: "R1",
    type: "risk",
    symbol: "!",
    symbolClass: "warn",
    title: "Critical Supplier Lead-Time Delay",
    desc: "Alloy M-204 · 36h inventory cover vs. 3-day lead time · Impacts 2 customer milestones",
    dept: "Supply Chain",
    badge: "Critical Risk",
    badgeClass: "red"
  },
  {
    id: "R2",
    type: "risk",
    symbol: "⌁",
    symbolClass: "warn",
    title: "Press P-07 Tooling Vibration Drift",
    desc: "Hydraulic stamping station · Vibration +18% above tolerance · Quality defect risk",
    dept: "Maintenance",
    badge: "Monitor",
    badgeClass: "warn"
  },
  {
    id: "R3",
    type: "risk",
    symbol: "⏱",
    symbolClass: "warn",
    title: "Drawing Technical Review Bottleneck",
    desc: "DWG-2026-04 revision cycle exceeded target buffer by 2 days · Upstream critical path",
    dept: "Engineering",
    badge: "Critical Path",
    badgeClass: "red"
  },
  {
    id: "O1",
    type: "opportunity",
    symbol: "↗",
    symbolClass: "green",
    title: "Shift Rebalancing Schedule Recovery",
    desc: "Cell 02 · Transferring 1 operator recovers +120 units/shift (~0.8 days slippage)",
    dept: "Operations",
    badge: "Actionable",
    badgeClass: "lower"
  }
];

export const WBS_TASKS: WbsTask[] = [
  {
    code: "WBS-1.1",
    task: "Drawing Technical Review & CAD/CAM Sign-off",
    plannedDays: 5,
    actualDays: 7,
    critical: true,
    delayRisk: 0.72,
    status: "Delayed (+2d)",
    varianceDays: 2
  },
  {
    code: "WBS-1.2",
    task: "Raw Material Procurement (Alloy EN24 & M-204)",
    plannedDays: 10,
    actualDays: 12,
    critical: true,
    delayRisk: 0.85,
    status: "At Risk",
    varianceDays: 2
  },
  {
    code: "WBS-1.3",
    task: "Tooling & Stamping Die Fabrication (Die-04)",
    plannedDays: 8,
    actualDays: 8,
    critical: false,
    delayRisk: 0.28,
    status: "On Track",
    varianceDays: 0
  },
  {
    code: "WBS-2.1",
    task: "CNC 5-Axis Milling & Surface Profiling",
    plannedDays: 9,
    actualDays: 9,
    critical: false,
    delayRisk: 0.22,
    status: "On Track",
    varianceDays: 0
  },
  {
    code: "WBS-2.2",
    task: "Precision Stamping & Forming (Press P-07)",
    plannedDays: 6,
    actualDays: 7,
    critical: true,
    delayRisk: 0.68,
    status: "Bottleneck",
    varianceDays: 1
  },
  {
    code: "WBS-3.1",
    task: "Cell 02 Sub-Assembly & Precision Tolerancing",
    plannedDays: 12,
    actualDays: 14,
    critical: true,
    delayRisk: 0.79,
    status: "Lagging -11%",
    varianceDays: 2
  },
  {
    code: "WBS-3.2",
    task: "Heat Treatment & Surface Hardening (Subcontract)",
    plannedDays: 5,
    actualDays: 5,
    critical: false,
    delayRisk: 0.35,
    status: "Scheduled",
    varianceDays: 0
  },
  {
    code: "WBS-4.1",
    task: "CMM Metrology & Quality Acceptance Test",
    plannedDays: 4,
    actualDays: 4,
    critical: true,
    delayRisk: 0.30,
    status: "Pending Prior Stage",
    varianceDays: 0
  },
  {
    code: "WBS-4.2",
    task: "Final Factory Acceptance (FAT) & Customer Dispatch",
    plannedDays: 3,
    actualDays: 3,
    critical: false,
    delayRisk: 0.15,
    status: "Scheduled",
    varianceDays: 0
  }
];

export const RISK_DRIVERS: RiskDriver[] = [
  {
    factor: "Drawing Technical Review Variance",
    weight: "34%",
    impact: "High (DWG-2026-04 revisions pending sign-off)"
  },
  {
    factor: "Component M-204 Vendor Lead Time",
    weight: "28%",
    impact: "High (36h cover remaining against 3-day supplier transit)"
  },
  {
    factor: "Press P-07 Mechanical Constraint",
    weight: "22%",
    impact: "Medium (Hydraulic vibration +18% above nominal baseline)"
  },
  {
    factor: "Cell 02 Operator Staffing Deficit",
    weight: "16%",
    impact: "Medium (1 technician shortage on evening shift)"
  }
];

export const KNOWLEDGE_DOCS: KnowledgeDoc[] = [
  {
    id: "sop-prs-04",
    code: "SOP-PRS-04",
    title: "Hydraulic Stamping & Press P-07 Operating Protocol",
    category: "Maintenance & Tooling",
    keywords: ["press", "p-07", "vibration", "hydraulic", "stamping", "maintenance"],
    summary: "Mandatory vibration thresholds, hydraulic pressure baselines, and safety inspection guidelines for mechanical stamping presses.",
    sections: [
      {
        clause: "Clause 3.2 — Vibration Thresholds",
        content: "If the vibration index exceeds baseline by more than +15%, immediate condition inspection of hydraulic seals, bearings, and load cells is mandatory before commencing the next stamping cycle."
      },
      {
        clause: "Clause 4.1 — Die Alignment Tolerances",
        content: "Die clearance tolerance must be maintained within ±0.02mm. Deviations exceeding this threshold accelerate tooling wear DF-04 and introduce edge burrs."
      }
    ]
  },
  {
    id: "sop-scm-12",
    code: "SOP-SCM-12",
    title: "Critical Component Shortage & Express Procurement",
    category: "Supply Chain",
    keywords: ["shortage", "m-204", "procurement", "supplier", "freight", "inventory"],
    summary: "Defines rapid-response workflows when component stock buffers drop below supplier lead times.",
    sections: [
      {
        clause: "Clause 2.1 — Buffer Inventory Warning",
        content: "When buffer stock falls below 48 hours and supplier lead time exceeds 48 hours, the Supply Chain Lead is authorized to trigger express air freight to protect customer orders."
      },
      {
        clause: "Clause 5.3 — Commercial Penalty Protection",
        content: "Expedited shipping costs up to Rp 25,000,000 are pre-approved when mitigating contract delivery penalties exceeding Rp 100,000,000."
      }
    ]
  },
  {
    id: "sop-line2-opt",
    code: "SOP-LINE2-OPT",
    title: "Assembly Cell Line Balancing & Operator Reallocation",
    category: "Operations",
    keywords: ["line 2", "cell 02", "rebalance", "operator", "throughput", "shift"],
    summary: "Procedures for dynamic technician transfers across manufacturing cells during unexpected throughput variances.",
    sections: [
      {
        clause: "Clause 1.4 — Throughput Variance Trigger",
        content: "If cell attainment falls below 90% of shift target for more than 2 consecutive hours, the supervisor may request one cross-trained operator transfer from adjacent balanced cells."
      },
      {
        clause: "Clause 2.2 — Safety & Certification",
        content: "Only technicians with verified Level-2 assembly certification may be reassigned to high-precision aerospace stamping cells."
      }
    ]
  },
  {
    id: "sop-eng-02",
    code: "SOP-ENG-02",
    title: "Engineering Change Order (ECO) & Drawing Approval",
    category: "Engineering",
    keywords: ["drawing", "cad", "cam", "approval", "dwg-2026-04", "revision"],
    summary: "Expedited sign-off protocol for engineering drawing revisions and CAM toolpath releases.",
    sections: [
      {
        clause: "Clause 2.3 — Expedited Turnaround",
        content: "Critical path drawing revisions must be reviewed by the Lead Tooling Engineer within 4 working hours of submission."
      },
      {
        clause: "Clause 3.1 — Tolerancing Verification",
        content: "All revisions involving GD&T adjustments must undergo coordinate metrology validation before full batch production."
      }
    ]
  }
];

export const PERFORMANCE_CHART_DATA = {
  output: {
    actual: [62, 55, 71, 45, 51, 38, 43],
    target: [50, 50, 50, 50, 50, 50, 50],
    labels: ["1.2k", "900", "600", "300"],
    unit: "Units Produced"
  },
  oee: {
    actual: [75, 68, 72, 55, 61, 48, 53],
    target: [50, 50, 50, 50, 50, 50, 50],
    labels: ["100%", "80%", "60%", "40%"],
    unit: "Overall Equipment Effectiveness (%)"
  },
  downtime: {
    actual: [40, 52, 37, 64, 58, 70, 61],
    target: [65, 65, 65, 65, 65, 65, 65],
    labels: ["12h", "9h", "6h", "3h"],
    unit: "Cumulative Downtime (hrs)"
  }
};

export const PRODUCTION_LINES_DATA: ProductionLineItem[] = [
  {
    id: "line-01",
    name: "Assembly Line 01 (Precision Stamping)",
    utilization: 92,
    outputActual: 1240,
    outputTarget: 1300,
    status: "On track",
    statusColor: "green"
  },
  {
    id: "line-02",
    name: "Assembly Line 02 (CNC 5-Axis Milling)",
    utilization: 68,
    outputActual: 890,
    outputTarget: 1000,
    status: "Attention",
    statusColor: "warn"
  },
  {
    id: "line-03",
    name: "Packaging Line 03 (Sub-Assembly Cleanroom)",
    utilization: 96,
    outputActual: 1510,
    outputTarget: 1500,
    status: "Above target",
    statusColor: "cyan"
  },
  {
    id: "line-04",
    name: "Assembly Line 04 (Wire EDM & Grinding)",
    utilization: 84,
    outputActual: 1080,
    outputTarget: 1200,
    status: "On track",
    statusColor: "green"
  }
];

export const IROOM_MATERIALS: MaterialDeliveryItem[] = [
  {
    id: "mat-01",
    partNumber: "INGOT-AL7075-T6",
    description: "Aerospace Grade 7075 Aluminum Round Bar 120mm",
    supplier: "PT Metalindo Perkasa Steel",
    eta: "Tomorrow, 14:00 WIB",
    stockCoverHours: 36,
    supplierLeadDays: 3,
    status: "Critical",
    riskScore: 0.88,
    openPo: "PO-2026-IMJ-0891"
  },
  {
    id: "mat-02",
    partNumber: "FASTENER-TI-M6",
    description: "Titanium Alloy Hex Socket Cap Screws M6x25",
    supplier: "Fastener Global Solution Pte",
    eta: "16 Oct 2026",
    stockCoverHours: 72,
    supplierLeadDays: 5,
    status: "At Risk",
    riskScore: 0.62,
    openPo: "PO-2026-IMJ-0894"
  },
  {
    id: "mat-03",
    partNumber: "STEEL-SKD11-PL",
    description: "Cold-Work Tool Steel Plate 35mm Pre-machined",
    supplier: "Nippon Steel Indonesia Dist.",
    eta: "18 Oct 2026",
    stockCoverHours: 140,
    supplierLeadDays: 7,
    status: "Normal",
    riskScore: 0.15,
    openPo: "PO-2026-IMJ-0888"
  }
];

export const IROOM_PROJECTS: ProjectProgressItem[] = [
  {
    id: "prj-01",
    projectCode: "PRJ-AERO-2026",
    name: "Boeing 737 Cargo Door Bracket Tooling",
    customer: "PT Dirgantara Indonesia (PTDI)",
    currentMilestone: "CNC 5-Axis Rough Machining",
    progressPercent: 64,
    targetCompletion: "28 Oct 2026",
    delayVarianceDays: 3.5,
    status: "Critical Risk"
  },
  {
    id: "prj-02",
    projectCode: "PRJ-AUTO-409",
    name: "EV Battery Enclosure Extrusion Stamping Die",
    customer: "Hyundai Motor Manufacturing",
    currentMilestone: "Wire EDM Profile Slicing",
    progressPercent: 78,
    targetCompletion: "22 Oct 2026",
    delayVarianceDays: 1.0,
    status: "Delayed"
  },
  {
    id: "prj-03",
    projectCode: "PRJ-MED-102",
    name: "Surgical Titanium Implant Molding Core",
    customer: "Kalbe Farma Precision",
    currentMilestone: "CMM Metrology Final FAT",
    progressPercent: 92,
    targetCompletion: "19 Oct 2026",
    delayVarianceDays: 0,
    status: "On Schedule"
  }
];

export const IROOM_DRAWINGS: DrawingApprovalItem[] = [
  {
    id: "dwg-01",
    dwgNumber: "DWG-2026-04-REV-C",
    title: "Upper Stamping Punch Geometry & Clearance",
    revision: "Rev C.2",
    engineer: "Hendra Wijaya, ST",
    department: "Tooling R&D",
    submittedDate: "13 Oct 2026 14:15",
    status: "Pending Review",
    criticalDwg: true
  },
  {
    id: "dwg-02",
    dwgNumber: "DWG-2026-02-REV-B",
    title: "Base Die Fixture Cooling Channel Routing",
    revision: "Rev B.0",
    engineer: "Siti Rahma, MT",
    department: "CAD/CAM Engineering",
    submittedDate: "12 Oct 2026 09:30",
    status: "Approved",
    criticalDwg: false
  },
  {
    id: "dwg-03",
    dwgNumber: "DWG-2026-07-REV-A",
    title: "EDM Electrode Holder Electrode Pattern",
    revision: "Rev A.1",
    engineer: "Agus Pratama",
    department: "Machining Prep",
    submittedDate: "14 Oct 2026 08:00",
    status: "Revision Needed",
    criticalDwg: false
  }
];

export const IROOM_QUOTATIONS: QuotationPoItem[] = [
  {
    id: "po-01",
    poNumber: "PO-2026-IMJ-0891",
    quotationRef: "QTN-MET-2026-442",
    vendorName: "PT Metalindo Perkasa Steel",
    totalValueIdr: "Rp 148.500.000",
    status: "PO Issued",
    paymentTerm: "Net 30 Days",
    expedited: true
  },
  {
    id: "po-02",
    poNumber: "PO-2026-IMJ-0894",
    quotationRef: "QTN-FST-2026-108",
    vendorName: "Fastener Global Solution Pte",
    totalValueIdr: "Rp 64.200.000",
    status: "Pending Approval",
    paymentTerm: "CBD (Advance 50%)",
    expedited: true
  },
  {
    id: "po-03",
    poNumber: "PO-2026-IMJ-0888",
    quotationRef: "QTN-NP-2026-902",
    vendorName: "Nippon Steel Indonesia Dist.",
    totalValueIdr: "Rp 312.000.000",
    status: "PO Issued",
    paymentTerm: "Net 45 Days",
    expedited: false
  }
];

export const IROOM_OPERATIONS: OperationTrackerItem[] = [
  {
    id: "op-01",
    workCenter: "CNC Milling Cell 01",
    machineId: "DMG-MORI-NLX2500",
    operator: "Budi Santoso (Cert L2)",
    shift: "Shift 1 (Morning)",
    oeePercent: 88.5,
    spindleUtilization: 94.2,
    vibrationSensor: "NORMAL",
    activeJob: "PRJ-AERO-2026 / WBS-1.2"
  },
  {
    id: "op-02",
    workCenter: "Hydraulic Press Stamping",
    machineId: "KOMATSU-PRESS-P07",
    operator: "Fajar Nugraha",
    shift: "Shift 1 (Morning)",
    oeePercent: 68.2,
    spindleUtilization: 62.0,
    vibrationSensor: "ELEVATED",
    activeJob: "PRJ-AUTO-409 / Stamping Die Prep"
  },
  {
    id: "op-03",
    workCenter: "Wire EDM Cell 03",
    machineId: "SODICK-ALC600G",
    operator: "Rudi Hermawan (Cert L3)",
    shift: "Shift 1 (Morning)",
    oeePercent: 95.8,
    spindleUtilization: 98.0,
    vibrationSensor: "NORMAL",
    activeJob: "PRJ-AUTO-409 / WBS-1.3"
  }
];
