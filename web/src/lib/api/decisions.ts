/** Decision briefs, sign-offs and the audit log. */

import { INITIAL_ACTIONS } from "@/lib/mock-data";
import { DecisionAction, AuditLogEntry } from "@/types";
import {
  fetchFirestoreAuditLogs,
  fetchFirestoreDecisionStatuses,
  saveFirestoreDecisionFlag,
} from "@/lib/firestore";
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
      }));
    }
  } catch {
    // Fallback
  }
  const firestoreStatuses = await fetchFirestoreDecisionStatuses();
  return base.map((item) => {
    const saved = firestoreStatuses[item.id];
    return saved
      ? {
          ...item,
          status: saved.status,
          flagged: saved.flagged,
          overrideReason: saved.overrideReason ?? item.overrideReason,
        }
      : item;
  });
}

/**
 * Records a human-in-the-loop review decision (Authorized or Overridden).
 */
export async function flagDecisionAction(
  actionId: string,
  reviewerRole: string = "Operations Manager",
  decision: "AUTHORIZED" | "OVERRIDDEN" = "AUTHORIZED",
  notes: string = "",
  actionTitle: string = actionId,
  sopRef: string = "SOP-MDIP"
) {
  await saveFirestoreDecisionFlag({
    actionId,
    actionTitle,
    decision,
    reviewerRole,
    notes,
    sopRef,
  });

  try {
    const res = await apiFetch(`${API_BASE}/risks/decisions/flag`, {
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
    status: "FLAGGED_IN_FIRESTORE",
    reviewer: reviewerRole,
    message: decision === "OVERRIDDEN"
      ? "Action override recorded in Firestore audit log."
      : "Action authorized and recorded in Firestore audit log."
  };
}

export async function fetchAuditLog(): Promise<AuditLogEntry[] | null> {
  const firestoreLogs = await fetchFirestoreAuditLogs();
  try {
    const res = await apiFetch(`${API_BASE}/risks/audit-log`, {
      signal: AbortSignal.timeout(2500),
    });
    if (res.ok) {
      const rows: Array<{
        id: string;
        action_id: string;
        action_title: string;
        decision: string;
        reviewer_role: string;
        notes: string;
        sop_ref: string;
        timestamp: string;
      }> = await res.json();
      const backendLogs: AuditLogEntry[] = rows.map((r) => ({
        id: r.id,
        actionId: r.action_id,
        actionTitle: r.action_title,
        decision: r.decision === "OVERRIDDEN" ? "OVERRIDDEN" : "AUTHORIZED",
        reviewerRole: r.reviewer_role,
        notes: r.notes,
        sopRef: r.sop_ref,
        timestamp: r.timestamp,
      }));
      const seen = new Set(firestoreLogs.map((l) => l.id));
      return [...firestoreLogs, ...backendLogs.filter((l) => !seen.has(l.id))];
    }
  } catch {
    // Fallback to Firestore / client memory
  }
  return firestoreLogs.length > 0 ? firestoreLogs : null;
}
