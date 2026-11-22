import {
  ManufacturingRole,
  RolePreset,
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
