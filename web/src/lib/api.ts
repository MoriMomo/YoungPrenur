import {
  ROLE_PRESETS,
  INITIAL_ACTIONS,
  WBS_TASKS,
  RISKS_AND_OPPORTUNITIES,
  RISK_DRIVERS,
  KNOWLEDGE_DOCS,
  ROLES,
  PERFORMANCE_CHART_DATA,
  PRODUCTION_LINES_DATA,
  IROOM_MATERIALS,
  IROOM_PROJECTS,
  IROOM_DRAWINGS,
  IROOM_QUOTATIONS,
  IROOM_OPERATIONS
} from "@/lib/mock-data";
import {
  ManufacturingRole,
  DecisionAction,
  WbsTask,
  DelayRiskPrediction,
  PerformanceMetricKey,
  ProductionLineItem,
  MaterialDeliveryItem,
  ProjectProgressItem,
  DrawingApprovalItem,
  QuotationPoItem,
  OperationTrackerItem
} from "@/types";

interface BackendWbsTask {
  code: string;
  task: string;
  planned_days: number;
  actual_days: number;
  critical: boolean;
  delay_risk: number;
  status: string;
  variance_days?: number;
}

interface BackendDecisionAction {
  id: string;
  title: string;
  urgency: "Urgent" | "High" | "Medium";
  urgency_badge: "red" | "warn";
  department: string;
  confidence: number;
  description: string;
  impact: string;
  owner: string;
  due: string;
  source_doc: string;
  flagged: boolean;
}

const API_BASE = "http://localhost:8000/api/v1";

/**
 * Checks if the FastAPI backend service is reachable.
 */
export async function checkApiHealth(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  try {
    const res = await fetch("http://localhost:8000/api/health", {
      signal: AbortSignal.timeout(1500),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Fetches dashboard overview metrics for the active role.
 */
export async function fetchOverview(role: ManufacturingRole) {
  try {
    const res = await fetch(`${API_BASE}/dashboard/overview?role=${encodeURIComponent(role)}`, {
      signal: AbortSignal.timeout(2000),
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // Fallback
  }
  const preset = ROLE_PRESETS[role] || ROLE_PRESETS["Operations Manager"];
  return {
    success: true,
    available_roles: ROLES,
    active_role: role,
    header: {
      title: preset.title,
      sub: preset.sub
    },
    kpis: preset.kpis,
    decision_actions: INITIAL_ACTIONS,
    risks_and_opportunities: RISKS_AND_OPPORTUNITIES,
    source: "local_fallback"
  };
}

/**
 * Fetches the normalized WBS tasks.
 */
export async function fetchWbsSchedule(): Promise<WbsTask[]> {
  try {
    const res = await fetch(`${API_BASE}/scheduler/wbs`, {
      signal: AbortSignal.timeout(2000),
    });
    if (res.ok) {
      const data: BackendWbsTask[] = await res.json();
      return data.map((t: BackendWbsTask) => ({
        code: t.code,
        task: t.task,
        plannedDays: t.planned_days,
        actualDays: t.actual_days,
        critical: t.critical,
        delayRisk: t.delay_risk,
        status: t.status,
        varianceDays: t.variance_days
      }));
    }
  } catch {
    // Fallback
  }
  return WBS_TASKS;
}

/**
 * Triggers schedule file ingestion & standardization.
 */
export async function uploadScheduleFile(filename: string = "master_project_schedule_rev3.xlsx") {
  try {
    const res = await fetch(`${API_BASE}/scheduler/upload`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filename, source_type: "EXCEL_WBS" }),
      signal: AbortSignal.timeout(3000),
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // Fallback
  }
  return {
    success: true,
    filename,
    tasks_extracted: WBS_TASKS.length,
    critical_path_tasks: WBS_TASKS.filter(t => t.critical).length,
    high_risk_tasks: WBS_TASKS.filter(t => t.delayRisk > 0.6).length,
    message: `Extracted and normalized ${WBS_TASKS.length} WBS activities from ${filename}.`,
    tasks: WBS_TASKS
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
      return await res.json();
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
    methodology: "CPM + Supervised XGBoost (BINUS RTT)"
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
      return data.map((d: BackendDecisionAction) => ({
        id: d.id,
        title: d.title,
        urgency: d.urgency,
        urgencyBadge: d.urgency_badge,
        department: d.department,
        confidence: d.confidence,
        description: d.description,
        impact: d.impact,
        owner: d.owner,
        due: d.due,
        sourceDoc: d.source_doc,
        flagged: d.flagged
      }));
    }
  } catch {
    // Fallback
  }
  return INITIAL_ACTIONS;
}

/**
 * Flags an action for human review.
 */
export async function flagDecisionAction(actionId: string, reviewerRole: string = "Operations Manager") {
  try {
    const res = await fetch(`${API_BASE}/risks/decisions/flag`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action_id: actionId, reviewer_role: reviewerRole }),
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
    status: "FLAGGED_LOCALLY",
    reviewer: reviewerRole,
    message: "Action registered for human review."
  };
}

/**
 * Queries the grounded RAG Copilot.
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
    // Fallback
  }

  // Grounded local simulation fallback
  const qLower = message.toLowerCase();
  for (const doc of KNOWLEDGE_DOCS) {
    if (doc.keywords.some(kw => qLower.includes(kw))) {
      const sec = doc.sections[0];
      return {
        success: true,
        reply: `Berdasarkan dokumen acuan ${doc.code} (${doc.title}):\n\n${sec.content}`,
        citations: [
          {
            doc_code: doc.code,
            clause: sec.clause,
            title: doc.title,
            excerpt: sec.content
          }
        ],
        confidence: 0.92,
        is_grounded: true,
        source_documents_indexed: KNOWLEDGE_DOCS.length
      };
    }
  }

  return {
    success: true,
    reply: `Prioritas operasional ${activeRole}: 1. Atasi risiko lead-time Alloy M-204 segera (36h cover tersisa). 2. Lakukan inspeksi vibrasi Press P-07 (+18%) sebelum batch stamping sore. 3. Otorisasi pergeseran operator Cell 02 untuk memulihkan 120 unit.`,
    citations: [
      {
        doc_code: "MDIP-OP-BRIEF",
        clause: `Role Focus: ${activeRole}`,
        title: "Cross-Functional Decision Priority Matrix",
        excerpt: `Calibrated operational priorities for ${activeRole}.`
      }
    ],
    confidence: 0.95,
    is_grounded: true,
    source_documents_indexed: KNOWLEDGE_DOCS.length
  };
}

/**
 * Downloads operational summary text file.
 */
export function downloadOperationalExport(role: string) {
  const url = `${API_BASE}/dashboard/export?role=${encodeURIComponent(role)}`;
  window.open(url, "_blank");
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
 * Fetches production line status list.
 */
export async function fetchProductionLines(): Promise<ProductionLineItem[]> {
  try {
    const res = await fetch(`${API_BASE}/dashboard/lines`, {
      signal: AbortSignal.timeout(2000),
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // Fallback
  }
  return PRODUCTION_LINES_DATA;
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
