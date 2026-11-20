/** Schedule upload, the public landing inspection and the delay-risk prediction. */

import { WbsTask, DelayRiskPrediction } from "@/types";
import { API_BASE, apiFetch } from "./client";

interface BackendWbsTask {
  code: string;
  task: string;
  start_day?: number;
  planned_days: number;
  actual_days: number;
  float_days?: number;
  critical: boolean;
  delay_risk: number;
  risk_level?: "HIGH" | "MEDIUM" | "LOW";
  status: string;
  variance_days?: number;
  work_center?: string;
  owner?: string;
  drivers?: { label: string }[];
}

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
      riskLevel: t.risk_level,
      status: t.status,
      varianceDays: t.variance_days ?? Math.max(0, t.actual_days - t.planned_days),
      workCenter: t.work_center,
      owner: t.owner,
      drivers: t.drivers?.map((d) => d.label),
    };
  });
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
  extraction_method?: string;
  document_summary?: string | null;
  ai_parsed?: boolean;
  message?: string;
  tasks: WbsTask[];
  source: "backend";
}

/**
 * Public, anonymous inspection used by the landing page: scores a CSV/Excel schedule with the
 * real model without storing it or changing anyone's active schedule.
 * Returns null when the backend is unreachable; throws ScheduleUploadError when it rejects the file.
 */
export async function inspectScheduleFile(file: Blob, filename: string): Promise<ScheduleUploadResponse | null> {
  let res: Response;
  try {
    const form = new FormData();
    form.append("file", file, filename);
    res = await fetch(`${API_BASE}/scheduler/inspect`, {
      method: "POST",
      body: form,
      signal: AbortSignal.timeout(30000),
    });
  } catch {
    return null;
  }
  if (!res.ok) {
    let detail = `Inspection failed (${res.status})`;
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

/**
 * Sends a schedule file (CSV/XLSX/Word/PDF) to the backend, which parses it (using Gemini AI when
 * needed for PDF/Word documents), runs CPM and scores delay risk with the XGBoost model.
 * Returns null when the backend is unreachable so callers can parse CSVs locally.
 * Throws ScheduleUploadError when the backend rejects the file (e.g. missing columns).
 */
export async function uploadScheduleFile(file?: File | Blob, filename?: string): Promise<ScheduleUploadResponse | null> {
  let res: Response;
  try {
    const form = new FormData();
    if (file) form.append("file", file, filename || (file instanceof File ? file.name : "schedule.csv"));
    res = await apiFetch(`${API_BASE}/scheduler/upload`, {
      method: "POST",
      body: form,
      signal: AbortSignal.timeout(45000),
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

/**
 * Fetches delay risk prediction and root-cause drivers for a user-uploaded schedule.
 * Returns null when no user schedule has been uploaded or when the backend is unreachable.
 */
export async function fetchDelayRiskPrediction(): Promise<DelayRiskPrediction | null> {
  try {
    const res = await apiFetch(`${API_BASE}/risks/prediction`, {
      signal: AbortSignal.timeout(2000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const isBundledSample =
      data.source === "file" ||
      (!data.source &&
        (data.filename === "master_project_schedule_rev3.csv" ||
          data.project_name === "Project Alpha - Precision Stamping & Aerospace Tooling"));
    if (isBundledSample || !Array.isArray(data.tasks) || data.tasks.length === 0) {
      return null;
    }
    return {
      source: data.source,
      filename: data.filename,
      extraction_method: data.extraction_method,
      document_summary: data.document_summary ?? null,
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
      tasks: mapBackendWbs(data.tasks),
      methodology: data.methodology || "CPM + XGBoost delay-risk model",
    };
  } catch {
    return null;
  }
}
