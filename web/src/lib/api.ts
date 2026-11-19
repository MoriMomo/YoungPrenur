import {
  ROLE_PRESETS,
  INITIAL_ACTIONS,
  WBS_TASKS,
  RISKS_AND_OPPORTUNITIES,
  RISK_DRIVERS,
  KNOWLEDGE_DOCS,
  PERFORMANCE_CHART_DATA,
  IROOM_MATERIALS,
  IROOM_PROJECTS,
  IROOM_DRAWINGS,
  IROOM_QUOTATIONS,
  IROOM_OPERATIONS
} from "@/lib/mock-data";
import {
  ManufacturingRole,
  DecisionAction,
  AuditLogEntry,
  WbsTask,
  DelayRiskPrediction,
  PerformanceMetricKey,
  MaterialDeliveryItem,
  ProjectProgressItem,
  DrawingApprovalItem,
  QuotationPoItem,
  OperationTrackerItem
} from "@/types";

interface BackendWbsTask {
  code: string;
  task: string;
  start_day?: number;
  planned_days: number;
  actual_days: number;
  float_days?: number;
  critical: boolean;
  delay_risk: number;
  status: string;
  variance_days?: number;
  work_center?: string;
  owner?: string;
}

interface BackendDecisionAction {
  id: string;
  title: string;
  urgency: string;
  urgency_badge: string;
  department: string;
  confidence: number;
  description: string;
  impact: string;
  owner: string;
  due: string;
  source_doc: string;
  flagged: boolean;
  status?: "pending" | "authorized" | "overridden";
  checklist?: string[];
}

const API_ORIGIN = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const API_BASE = `${API_ORIGIN}/api/v1`;

function mapBackendWbs(tasks: BackendWbsTask[]): WbsTask[] {
  let cursor = 0;
  return tasks.map((t) => {
    const startDay = typeof t.start_day === "number" ? t.start_day : cursor;
    cursor += Math.max(1, Math.floor(t.planned_days * 0.7));
    return {
      code: t.code,
      task: t.task,
      startDay,
      plannedDays: t.planned_days,
      actualDays: t.actual_days,
      floatDays: typeof t.float_days === "number" ? t.float_days : t.critical ? 0 : 2,
      critical: t.critical,
      delayRisk: t.delay_risk,
      status: t.status,
      varianceDays: t.variance_days ?? Math.max(0, t.actual_days - t.planned_days),
      workCenter: t.work_center,
      owner: t.owner,
    };
  });
}

function normalizeUrgency(urgency: string): DecisionAction["urgency"] {
  const low = urgency.toLowerCase();
  if (low.includes("urgent") || low.includes("kritis")) return "Urgent";
  if (low.includes("high") || low.includes("tinggi")) return "High";
  return "Medium";
}

function normalizeUrgencyBadge(badge: string): DecisionAction["urgencyBadge"] {
  const low = badge.toLowerCase();
  return low === "red" || low === "critical" ? "red" : "warn";
}

/**
 * Checks if the FastAPI backend service is reachable.
 */
export async function checkApiHealth(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  try {
    const res = await fetch(`${API_ORIGIN}/api/health`, {
      signal: AbortSignal.timeout(1500),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export class ScheduleUploadError extends Error {}

export interface ScheduleUploadResponse {
  success: boolean;
  filename: string;
  tasks_extracted: number;
  critical_path_tasks?: number;
  high_risk_tasks?: number;
  overall_delay_probability?: number;
  estimated_project_slippage_days?: number;
  message?: string;
  tasks: WbsTask[];
  source: "backend" | "mock";
}

/**
 * Sends a schedule file (CSV/XLSX) to the backend, which parses it, runs CPM and scores
 * delay risk with the XGBoost model. Passing no file reloads the bundled sample project.
 * Returns null when the backend is unreachable so callers can fall back to local parsing.
 * Throws ScheduleUploadError when the backend rejects the file (e.g. missing columns).
 */
export async function uploadScheduleFile(file?: File | Blob, filename?: string): Promise<ScheduleUploadResponse | null> {
  let res: Response;
  try {
    const form = new FormData();
    if (file) form.append("file", file, filename || (file instanceof File ? file.name : "schedule.csv"));
    res = await fetch(`${API_BASE}/scheduler/upload`, {
      method: "POST",
      body: form,
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    return null;
  }
  if (!res.ok) {
    let detail = `Upload failed (${res.status})`;
    try {
      const err = await res.json();
      if (typeof err.detail === "string") detail = err.detail;
    } catch {
      // keep default message
    }
    throw new ScheduleUploadError(detail);
  }
  const json = await res.json();
  return {
    ...json,
    tasks: Array.isArray(json.tasks) ? mapBackendWbs(json.tasks) : [],
    source: "backend",
  };
}

/** Local mock result used when no backend is available (e.g. GitHub Pages without an API). */
export function mockScheduleUpload(filename: string): ScheduleUploadResponse {
  return {
    success: true,
    filename,
    tasks_extracted: WBS_TASKS.length,
    critical_path_tasks: WBS_TASKS.filter(t => t.critical).length,
    high_risk_tasks: WBS_TASKS.filter(t => t.delayRisk > 0.6).length,
    message: `Extracted and normalized ${WBS_TASKS.length} WBS activities from ${filename}.`,
    tasks: WBS_TASKS,
    source: "mock",
  };
}

/**
 * Fetches delay risk prediction and root-cause drivers.
 */
export async function fetchDelayRiskPrediction(): Promise<DelayRiskPrediction> {
  try {
    const res = await fetch(`${API_BASE}/risks/prediction`, {
      signal: AbortSignal.timeout(2000),
    });
    if (res.ok) {
      const data = await res.json();
      return {
        project_name: data.project_name,
        overall_delay_probability: data.overall_delay_probability,
        critical_path_tasks_count: data.critical_path_tasks_count,
        high_risk_tasks_count: data.high_risk_tasks_count,
        estimated_project_slippage_days: data.estimated_project_slippage_days,
        risk_drivers: (data.risk_drivers || []).map((d: { factor: string; weight?: string; impact: string; severity?: string }) => ({
          factor: d.factor,
          weight: d.weight || d.severity || "HIGH",
          impact: d.impact,
        })),
        tasks: Array.isArray(data.tasks) ? mapBackendWbs(data.tasks) : WBS_TASKS,
        methodology: data.methodology || "CPM + XGBoost delay-risk model",
      };
    }
  } catch {
    // Fallback
  }
  return {
    project_name: "Project Alpha - Precision Stamping & Aerospace Tooling",
    overall_delay_probability: 65.2,
    critical_path_tasks_count: WBS_TASKS.filter(t => t.critical).length,
    high_risk_tasks_count: WBS_TASKS.filter(t => t.delayRisk > 0.6).length,
    estimated_project_slippage_days: 3.5,
    risk_drivers: RISK_DRIVERS,
    tasks: WBS_TASKS,
    methodology: "Offline demo data (backend not connected)"
  };
}

/**
 * Fetches prioritized decision briefs.
 */
export async function fetchDecisionActions(): Promise<DecisionAction[]> {
  try {
    const res = await fetch(`${API_BASE}/risks/decisions`, {
      signal: AbortSignal.timeout(2000),
    });
    if (res.ok) {
      const data: BackendDecisionAction[] = await res.json();
      return data.map((d) => ({
        id: d.id,
        title: d.title,
        urgency: normalizeUrgency(d.urgency),
        urgencyBadge: normalizeUrgencyBadge(d.urgency_badge),
        department: d.department,
        confidence: d.confidence,
        description: d.description,
        impact: d.impact,
        owner: d.owner,
        due: d.due,
        sourceDoc: d.source_doc,
        flagged: d.flagged,
        status: d.status || (d.flagged ? "authorized" : "pending"),
        checklist: d.checklist,
      }));
    }
  } catch {
    // Fallback
  }
  return INITIAL_ACTIONS;
}

/**
 * Records a human-in-the-loop review decision (Authorized or Overridden).
 */
export async function flagDecisionAction(
  actionId: string,
  reviewerRole: string = "Operations Manager",
  decision: "AUTHORIZED" | "OVERRIDDEN" = "AUTHORIZED",
  notes: string = ""
) {
  try {
    const res = await fetch(`${API_BASE}/risks/decisions/flag`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action_id: actionId,
        reviewer_role: reviewerRole,
        decision,
        notes,
      }),
      signal: AbortSignal.timeout(2000),
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // Fallback
  }
  return {
    success: true,
    action_id: actionId,
    decision,
    notes,
    status: "FLAGGED_LOCALLY",
    reviewer: reviewerRole,
    message: decision === "OVERRIDDEN"
      ? "Action override recorded locally in human audit log."
      : "Action authorized locally in human audit log."
  };
}

/**
 * Queries the grounded RAG Copilot with local deterministic retrieval fallback.
 */
export async function askManufacturingCopilot(message: string, activeRole: ManufacturingRole) {
  try {
    const res = await fetch(`${API_BASE}/copilot/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, active_role: activeRole }),
      signal: AbortSignal.timeout(3500),
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // Fallback to grounded local SOP lookup
  }

  const qLower = message.toLowerCase();
  const scoredDocs = KNOWLEDGE_DOCS.map((doc) => {
    let score = 0;
    if (qLower.includes(doc.code.toLowerCase())) score += 3;
    if (doc.code === "SOP-ENG-02" && (qLower.includes("dwg-") || qLower.includes("drawing") || qLower.includes("blueprint"))) {
      score += 2;
    }
    for (const kw of doc.keywords) {
      if (qLower.includes(kw)) score += 1;
    }
    return { doc, score };
  })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);

  if (scoredDocs.length > 0) {
    const { doc } = scoredDocs[0];
    const sec = doc.sections[0];
    const sec2 = doc.sections[1];
    return {
      success: true,
      reply: `Grounded guidance from ${doc.code} (${doc.title}) for ${activeRole}:\n\n1. ${sec.clause}: ${sec.content}${sec2 ? `\n2. ${sec2.clause}: ${sec2.content}` : ""}`,
      citations: scoredDocs.slice(0, 2).map(({ doc: d }) => ({
        doc_code: d.code,
        clause: d.sections[0].clause,
        title: d.title,
        excerpt: d.sections[0].content,
      })),
      confidence: 0.92,
      is_grounded: true,
      source_documents_indexed: KNOWLEDGE_DOCS.length
    };
  }

  if (qLower.includes("wbs") || qLower.includes("delay") || qLower.includes("cnc") || qLower.includes("slip")) {
    return {
      success: true,
      reply: `CPM & Heuristic Schedule Analysis (${activeRole} view): WBS-1.2 (Raw Material Procurement) carries 85% risk score (+2d variance) and WBS-3.1 (Cell 02 Sub-Assembly) carries 79% risk score (+2d variance), driving +3.5d overall project slippage. Verify INGOT-AL7075-T6 air-freight authorization (SOP-SCM-12) and Cell 02 operator shift transfer (SOP-LINE2-OPT).`,
      citations: [
        {
          doc_code: "SOP-SCM-12",
          clause: "Clause 2.1: Buffer Inventory Warning",
          title: "Critical Component Shortage & Express Procurement",
          excerpt: "When buffer stock falls below 48 hours and supplier lead time exceeds 48 hours, trigger express air freight."
        },
        {
          doc_code: "SOP-LINE2-OPT",
          clause: "Clause 1.4: Throughput Variance Trigger",
          title: "Assembly Cell Line Balancing & Operator Reallocation",
          excerpt: "If cell attainment falls below 90% of shift target for >2h, transfer one cross-trained operator."
        }
      ],
      confidence: 0.91,
      is_grounded: true,
      source_documents_indexed: KNOWLEDGE_DOCS.length
    };
  }

  return {
    success: true,
    reply: `Top operational priorities for ${activeRole}:\n1. Mitigate Alloy M-204 / INGOT-AL7075-T6 stock cover (36h left vs 3-day vendor lead time; protects Rp 480M PO-089 & PO-092).\n2. Inspect Press P-07 hydraulic seal before next stamping cycle (+18% vibration vs baseline, exceeding +15% threshold in SOP-PRS-04).\n3. Rebalance Cell 02 shift staffing to recover ~120 units/shift under SOP-LINE2-OPT.`,
    citations: [
      {
        doc_code: "SOP-SCM-12",
        clause: "Clause 5.3: Commercial Penalty Protection",
        title: "Critical Component Shortage & Express Procurement",
        excerpt: "Expedited shipping up to Rp 25,000,000 is pre-approved when mitigating penalties exceeding Rp 100,000,000."
      },
      {
        doc_code: "SOP-PRS-04",
        clause: "Clause 3.2: Vibration Thresholds",
        title: "Hydraulic Stamping & Press P-07 Operating Protocol",
        excerpt: "If vibration index exceeds baseline by >15%, condition inspection of seals and bearings is mandatory."
      }
    ],
    confidence: 0.94,
    is_grounded: true,
    source_documents_indexed: KNOWLEDGE_DOCS.length
  };
}

/**
 * Generates and downloads an operational summary .txt brief client-side (per MDIP_DRD Sec. 5.3).
 */
export function downloadOperationalExport(
  role: ManufacturingRole,
  actions: DecisionAction[] = INITIAL_ACTIONS,
  auditLog: AuditLogEntry[] = []
) {
  const preset = ROLE_PRESETS[role] || ROLE_PRESETS["Operations Manager"];
  const timestamp = new Date().toISOString();
  const lines = [
    "MDIP: AI MANUFACTURING DECISION INTELLIGENCE PLATFORM",
    "TRL 4 PROTOTYPE OPERATIONAL BRIEF (SIMULATED SAMPLE DATA)",
    "================================================================",
    `Generated At : ${timestamp}`,
    `Active Role  : ${role} (${preset.buyingCenterRole})`,
    `Research Ref : BINUS RTT D1521 & PT IMAJIN (IRoom System)`,
    "",
    "1. ROLE KPI SNAPSHOT",
    ...preset.kpis.map(k => `   - ${k.title}: ${k.value} (${k.trend}, ${k.subtle})`),
    "",
    "2. PRIORITIZED AI DECISION BRIEF",
    ...actions.map((a, idx) =>
      `   ${idx + 1}. [${a.urgency.toUpperCase()}] ${a.title} | Status: ${(a.status || "pending").toUpperCase()} | Ref: ${a.sourceDoc}\n      Impact: ${a.impact} | Owner: ${a.owner} | Due: ${a.due}`
    ),
    "",
    "3. HUMAN-IN-THE-LOOP AUDIT LOG (ISO 9001 Cl. 7.5)",
    ...(auditLog.length > 0
      ? auditLog.map(e => `   - [${e.timestamp}] ${e.decision}: ${e.actionTitle} by ${e.reviewerRole} (${e.sopRef}) | Notes: ${e.notes || "Verified"}`)
      : ["   - No actions authorized or overridden in this session yet."]),
    "",
    "INTEGRITY NOTICE:",
    "All telemetry figures, delay-risk heuristics, and recommendations in this export",
    "are TRL 4 simulated data. Validate against physical ERP/MES/IRoom records and",
    "obtain supervisor sign-off before shop-floor execution.",
  ];

  const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `mdip-brief-${role.toLowerCase().replace(/\s+/g, "-")}.txt`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Fetches dynamic chart telemetry (Output, OEE, Downtime).
 */
export async function fetchPerformanceData(metric: PerformanceMetricKey = "output") {
  try {
    const res = await fetch(`${API_BASE}/analytics/performance?metric=${metric}`, {
      signal: AbortSignal.timeout(2000),
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // Fallback
  }
  return PERFORMANCE_CHART_DATA[metric] || PERFORMANCE_CHART_DATA.output;
}

/**
 * Fetches IRoom Material Delivery Management streams.
 */
export async function fetchIRoomMaterials(): Promise<MaterialDeliveryItem[]> {
  try {
    const res = await fetch(`${API_BASE}/iroom/materials`, {
      signal: AbortSignal.timeout(2000),
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // Fallback
  }
  return IROOM_MATERIALS;
}

/**
 * Fetches IRoom Project Progress Tracking streams.
 */
export async function fetchIRoomProjects(): Promise<ProjectProgressItem[]> {
  try {
    const res = await fetch(`${API_BASE}/iroom/progress`, {
      signal: AbortSignal.timeout(2000),
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // Fallback
  }
  return IROOM_PROJECTS;
}

/**
 * Fetches IRoom Drawing Approval streams.
 */
export async function fetchIRoomDrawings(): Promise<DrawingApprovalItem[]> {
  try {
    const res = await fetch(`${API_BASE}/iroom/drawings`, {
      signal: AbortSignal.timeout(2000),
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // Fallback
  }
  return IROOM_DRAWINGS;
}

/**
 * Fetches IRoom Quotation & PO management streams.
 */
export async function fetchIRoomQuotations(): Promise<QuotationPoItem[]> {
  try {
    const res = await fetch(`${API_BASE}/iroom/quotations`, {
      signal: AbortSignal.timeout(2000),
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // Fallback
  }
  return IROOM_QUOTATIONS;
}

/**
 * Fetches IRoom Shop-Floor Operation Tracker streams.
 */
export async function fetchIRoomOperations(): Promise<OperationTrackerItem[]> {
  try {
    const res = await fetch(`${API_BASE}/iroom/operations`, {
      signal: AbortSignal.timeout(2000),
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // Fallback
  }
  return IROOM_OPERATIONS;
}
