/** Cockpit KPIs, performance series and the downloadable operational brief. */

import { ROLE_PRESETS, INITIAL_ACTIONS, PERFORMANCE_CHART_DATA } from "@/lib/mock-data";
import { ManufacturingRole, KpiItem, DecisionAction, AuditLogEntry, PerformanceMetricKey } from "@/types";
import { API_BASE, apiFetch } from "./client";

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
    "OPERATIONAL BRIEF (SAMPLE DATA)",
    "================================================================",
    `Generated At : ${timestamp}`,
    `Active Role  : ${role} (${preset.buyingCenterRole})`,
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
    "are sample data. Validate against physical ERP/MES/IRoom records and",
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
    const res = await apiFetch(`${API_BASE}/analytics/performance?metric=${metric}`, {
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

export async function fetchLiveOverviewKpis(role: ManufacturingRole): Promise<KpiItem[] | null> {
  try {
    const res = await apiFetch(`${API_BASE}/dashboard/overview?role=${encodeURIComponent(role)}`, {
      signal: AbortSignal.timeout(2500),
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.kpis)) {
        return data.kpis.map(
          (k: { label: string; value: string; change: string; status: string }): KpiItem => ({
            title: k.label,
            value: k.value,
            trend: k.change,
            subtle: "sample data",
            icon: "activity",
            status: k.status === "OK" ? "normal" : "warn",
          })
        );
      }
    }
  } catch {
    // Fallback to role preset KPIs
  }
  return null;
}
