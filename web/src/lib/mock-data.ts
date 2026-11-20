import {
  ManufacturingRole,
  RolePreset,
  DecisionAction,
  AuditLogEntry,
  PilotCheckItem,
  RiskItem,
  KnowledgeDoc,
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
    title: "Operations delivery cockpit",
    sub: "Track WBS progress, the delay risk on the critical path and the decisions that cross departments.",
    buyingCenterRole: "Operational Buyer",
    priorityDepartment: "Production Planning",
    kpis: [
      { title: "Project schedule attainment", value: "91.5%", trend: "↓ 2.5%", subtle: "vs. planned baseline", icon: "▥", status: "warn" },
      { title: "Overall delay risk", value: "65.2%", trend: "+3.5d Slippage", subtle: "critical path exposed", icon: "⚑", status: "alert" },
      { title: "First-time quality yield", value: "97.1%", trend: "↓ 0.6%", subtle: "CMM inspection pass", icon: "✓", status: "warn" },
      { title: "Active milestone actions", value: "4", trend: "2 urgent today", subtle: "human review queue", icon: "◉", status: "alert" }
    ]
  },
  "Plant Manager": {
    title: "Plant executive cockpit",
    sub: "Monitor plant-wide project delivery performance, contract slippage, and penalty exposure.",
    buyingCenterRole: "Economic Buyer",
    priorityDepartment: "Engineering & R&D",
    kpis: [
      { title: "Overall milestone compliance", value: "94.8%", trend: "↑ 1.8%", subtle: "target: 95.0%", icon: "▥", status: "normal" },
      { title: "Critical path slippage", value: "3.5 Days", trend: "Cell 02 & M-204", subtle: "forecasted variance", icon: "⏱", status: "alert" },
      { title: "Contract penalty exposure", value: "Rp 480M", trend: "PO-089 & PO-092", subtle: "late delivery clauses", icon: "⚑", status: "alert" },
      { title: "On-time in-full (OTIF)", value: "96.2%", trend: "↑ 0.4%", subtle: "30-day rolling index", icon: "✓", status: "normal" }
    ]
  },
  "Production Supervisor": {
    title: "Shop-floor cell supervision",
    sub: "Manage cell throughput, technician shift assignments, and WBS fabrication schedules.",
    buyingCenterRole: "Operational Buyer",
    priorityDepartment: "Production Planning",
    kpis: [
      { title: "Cell 02 shift throughput", value: "890 / 1,000", trend: "↓ 11% below pace", subtle: "Assembly Cell 02", icon: "⚙", status: "alert" },
      { title: "Cells 01 and 04 attainment", value: "95.4%", trend: "↑ On schedule", subtle: "Normal progression", icon: "▥", status: "normal" },
      { title: "Shift technician allocation", value: "92%", trend: "1 technician shortage", subtle: "Cell 02 evening shift", icon: "♙", status: "warn" },
      { title: "Setup and tooling delay", value: "1.4 hrs", trend: "↓ 0.3h vs yesterday", subtle: "Die changeover", icon: "⌁", status: "normal" }
    ]
  },
  "Maintenance Lead": {
    title: "Condition and maintenance control",
    sub: "Prioritize machine health signals, vibration drift on Press P-07, and tooling maintenance.",
    buyingCenterRole: "Technical Evaluator",
    priorityDepartment: "Maintenance",
    kpis: [
      { title: "Press P-07 vibration index", value: "+18%", trend: "Above normal baseline", subtle: "Hydraulic stamping station", icon: "⌁", status: "alert" },
      { title: "Machine fleet MTBF", value: "142 hrs", trend: "↑ 8.5% improvement", subtle: "Plant rolling metric", icon: "◉", status: "normal" },
      { title: "Open PM work orders", value: "8 / 10", trend: "2 scheduled today", subtle: "Tooling preventive checks", icon: "▥", status: "normal" },
      { title: "Estimated downtime risk", value: "2.1 hrs", trend: "P-07 risk window", subtle: "Mitigate before batch", icon: "⚑", status: "warn" }
    ]
  },
  "Quality Manager": {
    title: "Metrology and quality assurance",
    sub: "Track CMM metrology inspection pass rate, drawing tolerance NCRs, and tooling wear.",
    buyingCenterRole: "Technical Evaluator",
    priorityDepartment: "Engineering & R&D",
    kpis: [
      { title: "First-pass quality yield", value: "97.1%", trend: "↓ 0.6% vs baseline", subtle: "Target: 98.0%", icon: "✓", status: "warn" },
      { title: "Dimension variance scrap", value: "2.9%", trend: "Code DF-04 stamping", subtle: "Cell 02 tooling wear", icon: "◈", status: "warn" },
      { title: "Incoming material QC", value: "98.4%", trend: "↑ 0.2% Alloy EN24", subtle: "Batch #882 certified", icon: "▥", status: "normal" },
      { title: "Open non-conformance reports", value: "3", trend: "1 awaiting vendor RCA", subtle: "M-204 coating spec", icon: "⚑", status: "alert" }
    ]
  },
  "Supply Chain Lead": {
    title: "Material and supplier control",
    sub: "Monitor vendor lead times, raw material stock cover, and project delivery commitments.",
    buyingCenterRole: "Operational Buyer",
    priorityDepartment: "Supply Chain",
    kpis: [
      { title: "Alloy M-204 stock cover", value: "36 hrs", trend: "Critical shortage risk", subtle: "Vendor lead time: 3 days", icon: "⇄", status: "alert" },
      { title: "Supplier on-time delivery", value: "88.6%", trend: "↓ 3.4% Vendor A", subtle: "Last 14 shipments", icon: "▥", status: "warn" },
      { title: "Expedited air freight cost", value: "Rp 15M", trend: "Air cargo 500 units", subtle: "Protects 2 PO deliveries", icon: "◉", status: "warn" },
      { title: "At-risk customer orders", value: "2 Orders", trend: "PO-089 & PO-092", subtle: "Delay penalty window", icon: "⚑", status: "alert" }
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
    flagged: false,
    status: "pending",
    checklist: [
      "Verify Level-2 aerospace certification of transferred technician (SOP-LINE2-OPT Cl. 2.2)",
      "Confirm Cell 04 output buffer remains >= 100% of shift quota",
      "Log shift transfer in Operation Tracker before 15:00 WIB"
    ]
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
    flagged: false,
    status: "pending",
    checklist: [
      "Verify on-hand warehouse count for INGOT-AL7075-T6 / M-204 (<48h cover)",
      "Confirm expedited freight quote <= Rp 25.000.000 ceiling (SOP-SCM-12 Cl. 5.3)",
      "Lock supplier airway bill against PO-2026-MD-0891"
    ]
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
    flagged: false,
    status: "pending",
    checklist: [
      "Verify vibration transducer calibration against +15% baseline threshold (SOP-PRS-04 Cl. 3.2)",
      "Inspect hydraulic seal integrity and +/-0.02mm die clearance",
      "Record inspection ticket under ISO 9001 cl. 7.5"
    ]
  },
  {
    id: "act-drawing",
    title: "Fast-Track DWG-2026-04 Technical Review",
    urgency: "Urgent",
    urgencyBadge: "red",
    department: "Engineering & R&D",
    confidence: 89,
    description: "Drawing revisions for customer order PO-089 are pending sign-off for 48 hours. Activate expedited engineering review protocol under SOP-ENG-02 to release CAM toolpaths.",
    impact: "Recovers 1.5 days critical path variance on WBS-1.1",
    owner: "Engineering Lead",
    due: "Today, 12:00 WIB",
    sourceDoc: "SOP-ENG-02",
    flagged: false,
    status: "pending",
    checklist: [
      "Verify GD&T bore compensation (+0.040mm offset) on Rev 3.1 (SOP-ENG-02 Cl. 3.1)",
      "Confirm 4-working-hour critical path SLA sign-off (Cl. 2.3)",
      "Release verified CAM toolpath to CNC Milling Cell A"
    ]
  }
];

export const INITIAL_AUDIT_LOG: AuditLogEntry[] = [
  {
    id: "AUD-2026-01",
    actionId: "WBS-1.1-PRECHECK",
    actionTitle: "Release Ingot Lot #882 Incoming QC Clearance",
    decision: "AUTHORIZED",
    reviewerRole: "Quality Manager",
    notes: "Material certificate EN24/AL7075 verified against incoming inspection log.",
    sopRef: "SOP-SCM-12",
    timestamp: "08:15 WIB"
  }
];

export const PILOT_CHECKS: PilotCheckItem[] = [
  {
    id: "chk-1",
    check: "Scheduling time saved",
    measure: "Planner hours/week consolidating schedules",
    target: ">= 30% below baseline",
    currentSim: "Pending n=15 pilot",
    blockTested: "Value proposition",
    status: "pending"
  },
  {
    id: "chk-2",
    check: "Risk alerts acted on",
    measure: "Share of alerts reviewed within 5 working days",
    target: ">= 50%",
    currentSim: "HITL queue live",
    blockTested: "Value proposition",
    status: "pass"
  },
  {
    id: "chk-3",
    check: "Alert precision",
    measure: "Share of flagged tasks that actually slipped",
    target: ">= 60%",
    currentSim: "Rule-based PoC baseline",
    blockTested: "Key resources",
    status: "pending"
  },
  {
    id: "chk-4",
    check: "Copilot traceability",
    measure: "Answers traced to verified source document",
    target: ">= 80%",
    currentSim: "100% cited (4 SOPs)",
    blockTested: "Value proposition",
    status: "pass"
  },
  {
    id: "chk-5",
    check: "Willingness to pay (WTP)",
    measure: "Pilot firms signing LOI or paid contract",
    target: ">= 1 of 3 firms",
    currentSim: "Rp 30-50M pilot tier",
    blockTested: "Revenue streams",
    status: "pending"
  },
  {
    id: "chk-6",
    check: "Delivery effort & Lean AI cost",
    measure: "Implementation days & LLM cost within fee",
    target: "Within Tier 2A/2B cap",
    currentSim: "SQL/CPM + cached RAG",
    blockTested: "Cost structure",
    status: "pass"
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

export const KNOWLEDGE_DOCS: KnowledgeDoc[] = [
  {
    id: "sop-prs-04",
    code: "SOP-PRS-04",
    title: "Hydraulic Stamping & Press P-07 Operating Protocol",
    category: "Maintenance & Tooling",
    keywords: ["press", "p-07", "vibration", "hydraulic", "stamping", "maintenance", "changeover"],
    summary: "Mandatory vibration thresholds, hydraulic pressure baselines, and safety inspection guidelines for mechanical stamping presses.",
    sections: [
      {
        clause: "Clause 3.2: Vibration Thresholds",
        content: "If the vibration index exceeds baseline by more than +15%, immediate condition inspection of hydraulic seals, bearings, and load cells is mandatory before commencing the next stamping cycle."
      },
      {
        clause: "Clause 4.1: Die Alignment & Changeover Tolerances",
        content: "Before die changeover, isolate main power and engage the mechanical lock pin. Die clearance tolerance must be maintained within +/-0.02mm to avoid tooling wear DF-04."
      }
    ]
  },
  {
    id: "sop-scm-12",
    code: "SOP-SCM-12",
    title: "Critical Component Shortage & Express Procurement",
    category: "Supply Chain",
    keywords: ["shortage", "m-204", "al7075", "ingot", "procurement", "supplier", "freight", "inventory"],
    summary: "Defines rapid-response workflows when component stock buffers drop below supplier lead times.",
    sections: [
      {
        clause: "Clause 2.1: Buffer Inventory Warning",
        content: "When buffer stock falls below 48 hours and supplier lead time exceeds 48 hours, the Supply Chain Lead is authorized to trigger express air freight to protect customer orders."
      },
      {
        clause: "Clause 5.3: Commercial Penalty Protection",
        content: "Expedited shipping costs up to Rp 25,000,000 are pre-approved when mitigating contract delivery penalties exceeding Rp 100,000,000."
      }
    ]
  },
  {
    id: "sop-line2-opt",
    code: "SOP-LINE2-OPT",
    title: "Assembly Cell Line Balancing & Operator Reallocation",
    category: "Operations",
    keywords: ["line 2", "cell 02", "rebalance", "operator", "throughput", "shift", "lagging"],
    summary: "Procedures for dynamic technician transfers across manufacturing cells during unexpected throughput variances.",
    sections: [
      {
        clause: "Clause 1.4: Throughput Variance Trigger",
        content: "If cell attainment falls below 90% of shift target for more than 2 consecutive hours, the supervisor may request one cross-trained operator transfer from adjacent balanced cells."
      },
      {
        clause: "Clause 2.2: Safety & Certification",
        content: "Only technicians with verified Level-2 assembly certification may be reassigned to high-precision aerospace stamping cells."
      }
    ]
  },
  {
    id: "sop-eng-02",
    code: "SOP-ENG-02",
    title: "Engineering Change Order (ECO) & Drawing Approval",
    category: "Engineering",
    keywords: ["drawing", "cad", "cam", "approval", "dwg-2026-04", "revision", "gdt"],
    summary: "Expedited sign-off protocol for engineering drawing revisions and CAM toolpath releases.",
    sections: [
      {
        clause: "Clause 2.3: Expedited Turnaround",
        content: "Critical path drawing revisions must be reviewed by the Lead Tooling Engineer within 4 working hours of submission."
      },
      {
        clause: "Clause 3.1: Tolerancing Verification",
        content: "All revisions involving GD&T adjustments must undergo coordinate metrology validation before full batch production."
      }
    ]
  }
];

export const PERFORMANCE_CHART_DATA = {
  output: {
    actual: [1020, 910, 1170, 740, 840, 630, 710],
    target: [1000, 1000, 1000, 1000, 1000, 1000, 1000],
    labels: ["1.2k", "900", "600", "300"],
    min: 300,
    max: 1200,
    unit: "Units Produced"
  },
  oee: {
    actual: [86, 78, 83, 63, 70, 55, 61],
    target: [85, 85, 85, 85, 85, 85, 85],
    labels: ["100%", "80%", "60%", "40%"],
    min: 40,
    max: 100,
    unit: "Overall Equipment Effectiveness (%)"
  },
  downtime: {
    actual: [2.4, 3.1, 2.2, 4.8, 3.9, 5.4, 4.3],
    target: [2.5, 2.5, 2.5, 2.5, 2.5, 2.5, 2.5],
    labels: ["6h", "4.5h", "3h", "1.5h"],
    min: 1.5,
    max: 6.0,
    unit: "Cumulative Downtime (hrs)"
  }
};

export const IROOM_MATERIALS: MaterialDeliveryItem[] = [
  {
    id: "mat-01",
    partNumber: "INGOT-AL7075-T6",
    description: "Aerospace Grade 7075 Aluminum Round Bar 120mm",
    supplier: "Alloy bar supplier A",
    eta: "Tomorrow, 14:00 WIB",
    stockCoverHours: 36,
    supplierLeadDays: 3,
    status: "Critical",
    riskScore: 0.88,
    openPo: "PO-2026-MD-0891"
  },
  {
    id: "mat-02",
    partNumber: "FASTENER-TI-M6",
    description: "Titanium Alloy Hex Socket Cap Screws M6x25",
    supplier: "Fastener distributor B",
    eta: "16 Oct 2026",
    stockCoverHours: 72,
    supplierLeadDays: 5,
    status: "At Risk",
    riskScore: 0.62,
    openPo: "PO-2026-MD-0894"
  },
  {
    id: "mat-03",
    partNumber: "STEEL-SKD11-PL",
    description: "Cold-Work Tool Steel Plate 35mm Pre-machined",
    supplier: "Tool steel distributor C",
    eta: "18 Oct 2026",
    stockCoverHours: 140,
    supplierLeadDays: 7,
    status: "Normal",
    riskScore: 0.15,
    openPo: "PO-2026-MD-0888"
  }
];

export const IROOM_PROJECTS: ProjectProgressItem[] = [
  {
    id: "prj-01",
    projectCode: "PRJ-AERO-2026",
    name: "Aircraft Cargo Door Bracket Tooling",
    customer: "Aerospace customer",
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
    customer: "Automotive OEM customer",
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
    customer: "Medical device customer",
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
    poNumber: "PO-2026-MD-0891",
    quotationRef: "QTN-MET-2026-442",
    vendorName: "Alloy bar supplier A",
    totalValueIdr: "Rp 148.500.000",
    status: "PO Issued",
    paymentTerm: "Net 30 Days",
    expedited: true
  },
  {
    id: "po-02",
    poNumber: "PO-2026-MD-0894",
    quotationRef: "QTN-FST-2026-108",
    vendorName: "Fastener distributor B",
    totalValueIdr: "Rp 64.200.000",
    status: "Pending Approval",
    paymentTerm: "CBD (Advance 50%)",
    expedited: true
  },
  {
    id: "po-03",
    poNumber: "PO-2026-MD-0888",
    quotationRef: "QTN-NP-2026-902",
    vendorName: "Tool steel distributor C",
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
    machineId: "MILL-CELL-01",
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
    machineId: "PRESS-P07",
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
    machineId: "EDM-CELL-03",
    operator: "Rudi Hermawan (Cert L3)",
    shift: "Shift 1 (Morning)",
    oeePercent: 95.8,
    spindleUtilization: 98.0,
    vibrationSensor: "NORMAL",
    activeJob: "PRJ-AUTO-409 / WBS-1.3"
  }
];
