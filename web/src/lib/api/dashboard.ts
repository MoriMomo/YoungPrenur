/** Downloadable operational brief. */

import { ROLE_PRESETS } from "@/lib/mock-data";
import { ManufacturingRole, DecisionAction, AuditLogEntry } from "@/types";

/**
 * Generates and downloads an operational summary .txt brief client-side (per MDIP_DRD Sec. 5.3).
 */
export function downloadOperationalExport(
  role: ManufacturingRole,
  actions: DecisionAction[] = [],
  auditLog: AuditLogEntry[] = []
) {
  const preset = ROLE_PRESETS[role] || ROLE_PRESETS["Operations Manager"];
  const timestamp = new Date().toISOString();
  const lines = [
    "MDIP: AI MANUFACTURING DECISION INTELLIGENCE PLATFORM",
    "OPERATIONAL BRIEF",
    "================================================================",
    `Generated At : ${timestamp}`,
    `Active Role  : ${role} (${preset.buyingCenterRole})`,
    "",
    "1. PRIORITIZED DECISION BRIEF",
    ...(actions.length > 0
      ? actions.map((a, idx) =>
          `   ${idx + 1}. [${a.urgency.toUpperCase()}] ${a.title} | Status: ${(a.status || "pending").toUpperCase()} | Ref: ${a.sourceDoc}\n      Impact: ${a.impact} | Owner: ${a.owner} | Due: ${a.due}`
        )
      : ["   - No risk actions generated for the active schedule."]),
    "",
    "2. HUMAN-IN-THE-LOOP AUDIT LOG (ISO 9001 Cl. 7.5)",
    ...(auditLog.length > 0
      ? auditLog.map(e => `   - [${e.timestamp}] ${e.decision}: ${e.actionTitle} by ${e.reviewerRole} (${e.sopRef}) | Notes: ${e.notes || "Verified"}`)
      : ["   - No actions authorized or overridden in this session yet."]),
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
