"use client";

/**
 * Shared state of the signed-in dashboard: what the layout provides and every dashboard page reads
 * with useDashboard(). The layout (app/dashboard/layout.tsx) owns the state and behaviour.
 */

import React, { createContext, useContext } from "react";
import {
  AuditLogEntry,
  ChatMessage,
  CopilotStatus,
  DecisionAction,
  DelayRiskPrediction,
  DeploymentMode,
  KnowledgeDoc,
  ManufacturingRole,
} from "@/types";

export interface SopPayload {
  doc_code: string;
  title: string;
  clause: string;
  keywords: string[];
  excerpt: string;
}

export interface DashboardContextType {
  userId: string | null;
  userName: string | null;
  selectedRole: ManufacturingRole;
  setSelectedRole: (role: ManufacturingRole) => void;
  deploymentMode: DeploymentMode;
  setDeploymentMode: (mode: DeploymentMode) => void;
  isApiLive: boolean;
  copilotStatus: CopilotStatus;
  showToast: (msg: string) => void;
  openCopilot: () => void;
  askCopilotWithPrompt: (query: string) => Promise<void>;
  actions: DecisionAction[];
  setActions: React.Dispatch<React.SetStateAction<DecisionAction[]>>;
  auditLog: AuditLogEntry[];
  reviewingAction: DecisionAction | null;
  setReviewingAction: (act: DecisionAction | null) => void;
  handleDecisionReview: (
    actionId: string,
    decision: "AUTHORIZED" | "OVERRIDDEN",
    notes: string
  ) => Promise<void>;
  knowledgeDocs: KnowledgeDoc[];
  addKnowledgeDoc: (payload: SopPayload) => Promise<{ syncedToBackend: boolean }>;
  saveSopClauses: (rows: SopPayload[]) => Promise<boolean>;
  chatMessages: ChatMessage[];
  isChatLoading: boolean;
  sendChatQuery: (query: string) => Promise<void>;
  clearChat: () => void;
}

const CUSTOM_SOPS_STORAGE_KEY = "mdip_custom_sops_v1";
const USER_SCHEDULE_STORAGE_KEY = "mdip_user_schedule_v1";

function userScopedKey(base: string, userId?: string | null): string | null {
  return userId ? `${base}:${userId}` : null;
}

export function readStoredCustomSops(userId?: string | null): KnowledgeDoc[] {
  const key = userScopedKey(CUSTOM_SOPS_STORAGE_KEY, userId);
  if (typeof window === "undefined" || !key) return [];
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as KnowledgeDoc[]) : [];
  } catch {
    return [];
  }
}

export function writeStoredCustomSops(docs: KnowledgeDoc[], userId?: string | null): void {
  const key = userScopedKey(CUSTOM_SOPS_STORAGE_KEY, userId);
  if (typeof window === "undefined" || !key) return;
  try {
    window.localStorage.setItem(key, JSON.stringify(docs));
  } catch {
    // Storage quota/privacy mode ignored
  }
}

export function readStoredUserSchedule(userId?: string | null): DelayRiskPrediction | null {
  const key = userScopedKey(USER_SCHEDULE_STORAGE_KEY, userId);
  if (typeof window === "undefined" || !key) return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DelayRiskPrediction;
    return parsed && Array.isArray(parsed.tasks) && parsed.tasks.length > 0 ? parsed : null;
  } catch {
    return null;
  }
}

export function writeStoredUserSchedule(pred: DelayRiskPrediction | null, userId?: string | null): void {
  const key = userScopedKey(USER_SCHEDULE_STORAGE_KEY, userId);
  if (typeof window === "undefined" || !key) return;
  try {
    if (pred) window.localStorage.setItem(key, JSON.stringify(pred));
    else window.localStorage.removeItem(key);
  } catch {
    // Storage quota/privacy mode ignored
  }
}

export function mergeKnowledgeDocs(primary: KnowledgeDoc[], secondary: KnowledgeDoc[]): KnowledgeDoc[] {
  const seen = new Set<string>();
  const out: KnowledgeDoc[] = [];
  for (const doc of [...primary, ...secondary]) {
    const key = doc.code.toUpperCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(doc);
  }
  return out;
}

export const DashboardContext = createContext<DashboardContextType | null>(null);

export function useDashboard() {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error("useDashboard must be used inside the dashboard layout");
  }
  return context;
}

export const DEFAULT_COPILOT_STATUS: CopilotStatus = {
  llm_configured: false,
  provider: "retrieval",
  model: null,
  indexed_sops: 4,
};
