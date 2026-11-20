/** Decision briefs, sign-offs and the audit log. */

import { INITIAL_ACTIONS } from "@/lib/mock-data";
import { DecisionAction, AuditLogEntry } from "@/types";
import { API_BASE, apiFetch } from "./client";

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
  override_reason?: string | null;
  checklist?: string[];
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
 * Fetches prioritized decision briefs.
 */
export async function fetchDecisionActions(): Promise<DecisionAction[]> {
  let base: DecisionAction[] = INITIAL_ACTIONS;
  try {
    const res = await apiFetch(`${API_BASE}/risks/decisions`, {
      signal: AbortSignal.timeout(2000),
    });
    if (res.ok) {
      const data: BackendDecisionAction[] = await res.json();
      base = data.map((d) => ({
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
        overrideReason: d.override_reason ?? undefined,
      }));
    }
  } catch {
    // Fallback
  }
  return base;
}

interface BackendAuditEntry {
  id: string;
  action_id: string;
  action_title: string;
  decision: "AUTHORIZED" | "OVERRIDDEN";
  reviewer_id: string;
  reviewer_role: string;
  notes: string;
  sop_ref: string;
  timestamp: string;
}

function mapAuditEntry(row: BackendAuditEntry): AuditLogEntry {
  return {
    id: row.id,
    actionId: row.action_id,
    actionTitle: row.action_title,
    decision: row.decision,
    reviewerRole: row.reviewer_role,
    notes: row.notes,
    sopRef: row.sop_ref,
    timestamp: row.timestamp,
  };
}

export async function flagDecisionAction(
  actionId: string,
  decision: "AUTHORIZED" | "OVERRIDDEN",
  notes: string
): Promise<AuditLogEntry> {
  const res = await apiFetch(`${API_BASE}/risks/decisions/flag`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action_id: actionId, decision, notes }),
    signal: AbortSignal.timeout(15000),
  });
  const result = await res.json().catch(() => null);
  if (!res.ok || result?.success !== true || !result.entry) {
    throw new Error(typeof result?.detail === "string" ? result.detail : "Could not confirm that the review was saved.");
  }
  return mapAuditEntry(result.entry);
}

export async function fetchAuditLog(): Promise<AuditLogEntry[] | null> {
  try {
    const res = await apiFetch(`${API_BASE}/risks/audit-log`, {
      signal: AbortSignal.timeout(2500),
    });
    if (res.ok) {
      const rows: BackendAuditEntry[] = await res.json();
      return rows.map(mapAuditEntry);
    }
  } catch {
    // Keep the last confirmed log on transient failure.
  }
  return null;
}
