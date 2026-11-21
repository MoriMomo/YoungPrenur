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
  chatMessages: ChatMessage[];
  isChatLoading: boolean;
  sendChatQuery: (query: string) => Promise<void>;
  clearChat: () => void;
}

const CUSTOM_SOPS_STORAGE_KEY = "mdip_custom_sops_v1";

export function readStoredCustomSops(): KnowledgeDoc[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(CUSTOM_SOPS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as KnowledgeDoc[]) : [];
  } catch {
    return [];
  }
}

export function writeStoredCustomSops(docs: KnowledgeDoc[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CUSTOM_SOPS_STORAGE_KEY, JSON.stringify(docs));
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
