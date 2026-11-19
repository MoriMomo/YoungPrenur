"use client";

import React, { createContext, useContext, useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { Toast } from "@/components/ui/Toast";
import { ReviewModal } from "@/components/ui/ReviewModal";
import { ChatDrawer } from "@/features/copilot/ChatDrawer";
import {
  ManufacturingRole,
  DecisionAction,
  ChatMessage,
  CopilotStatus,
  DeploymentMode,
  AuditLogEntry,
  KnowledgeDoc,
} from "@/types";
import { INITIAL_ACTIONS, INITIAL_AUDIT_LOG, KNOWLEDGE_DOCS, ROLES } from "@/lib/mock-data";
import {
  AuthUser,
  checkApiHealth,
  clearStoredSession,
  fetchAuditLog,
  fetchCopilotStatus,
  fetchKnowledgeDocs,
  flagDecisionAction,
  askManufacturingCopilot,
  fetchDecisionActions,
  getStoredSession,
  ingestKnowledgeDoc,
  verifySession,
} from "@/lib/api";

interface SopPayload {
  doc_code: string;
  title: string;
  clause: string;
  keywords: string[];
  excerpt: string;
}

interface DashboardContextType {
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

function readStoredCustomSops(): KnowledgeDoc[] {
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

function writeStoredCustomSops(docs: KnowledgeDoc[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CUSTOM_SOPS_STORAGE_KEY, JSON.stringify(docs));
  } catch {
    // Storage quota/privacy mode ignored
  }
}

function mergeKnowledgeDocs(primary: KnowledgeDoc[], secondary: KnowledgeDoc[]): KnowledgeDoc[] {
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

const DashboardContext = createContext<DashboardContextType | null>(null);

export function useDashboard() {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error("useDashboard must be used within a DashboardProvider");
  }
  return context;
}

function SearchParamsSync({
  onRoleInit,
  onOpenChat,
}: {
  onRoleInit: (role: ManufacturingRole) => void;
  onOpenChat: () => void;
}) {
  const searchParams = useSearchParams();
  const lastSearchRef = useRef<string | null>(null);

  useEffect(() => {
    const currentSearch = searchParams.toString();
    if (lastSearchRef.current === currentSearch) return;
    lastSearchRef.current = currentSearch;

    const roleParam = searchParams.get("role") as ManufacturingRole;
    if (roleParam && ROLES.includes(roleParam)) {
      onRoleInit(roleParam);
    }
    if (searchParams.get("chat") === "open") {
      onOpenChat();
    }
  }, [searchParams, onRoleInit, onOpenChat]);

  return null;
}

const DEFAULT_COPILOT_STATUS: CopilotStatus = {
  llm_configured: false,
  provider: "retrieval",
  model: null,
  indexed_sops: 4,
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [isAuthReady, setIsAuthReady] = useState<boolean>(false);
  const [selectedRole, setSelectedRole] = useState<ManufacturingRole>("Operations Manager");
  const [deploymentMode, setDeploymentMode] = useState<DeploymentMode>("saas");
  const [isApiLive, setIsApiLive] = useState<boolean>(false);
  const [copilotStatus, setCopilotStatus] = useState<CopilotStatus>(DEFAULT_COPILOT_STATUS);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [actions, setActions] = useState<DecisionAction[]>(INITIAL_ACTIONS);
  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>(INITIAL_AUDIT_LOG);
  const [knowledgeDocs, setKnowledgeDocs] = useState<KnowledgeDoc[]>(KNOWLEDGE_DOCS);
  const [reviewingAction, setReviewingAction] = useState<DecisionAction | null>(null);

  const [isChatOpen, setIsChatOpen] = useState<boolean>(false);
  const [isChatLoading, setIsChatLoading] = useState<boolean>(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

  const applyWorkspaceSnapshot = (
    live: boolean,
    loadedDocs?: KnowledgeDoc[],
    status?: CopilotStatus,
    remoteActions?: DecisionAction[] | null,
    remoteAudit?: AuditLogEntry[] | null
  ) => {
    const stored = readStoredCustomSops();
    const mergedDocs =
      live && loadedDocs
        ? mergeKnowledgeDocs(loadedDocs, stored)
        : mergeKnowledgeDocs(stored, KNOWLEDGE_DOCS);
    setKnowledgeDocs(mergedDocs);
    if (live && status) {
      setCopilotStatus({
        ...status,
        indexed_sops: Math.max(status.indexed_sops, mergedDocs.length),
      });
    } else {
      setCopilotStatus({ ...DEFAULT_COPILOT_STATUS, indexed_sops: mergedDocs.length });
    }
    if (remoteActions && remoteActions.length > 0) setActions(remoteActions);
    if (remoteAudit && remoteAudit.length > 0) setAuditLog(remoteAudit);
  };

  const syncTelemetry = async (announce = false) => {
    const live = await checkApiHealth();
    setIsApiLive(live);
    if (live) {
      const [remoteActions, remoteAudit, status, loadedDocs] = await Promise.all([
        fetchDecisionActions(),
        fetchAuditLog(),
        fetchCopilotStatus(),
        fetchKnowledgeDocs(),
      ]);
      applyWorkspaceSnapshot(true, loadedDocs, status, remoteActions, remoteAudit);
    } else {
      applyWorkspaceSnapshot(false);
    }
    if (announce) {
      showToast(
        live
          ? "Telemetry refreshed from live FastAPI backend."
          : "Service offline: refreshed sample data."
      );
    }
  };

  useEffect(() => {
    let active = true;
    const session = getStoredSession();
    if (!session || session.mode !== "backend" || !session.token) {
      router.replace("/login?mode=register");
      return;
    }

    checkApiHealth().then(async (live) => {
      if (!active) return;
      let authenticatedUser: AuthUser | null = session.user;
      if (live) {
        const verified = await verifySession(session.token);
        if (!active) return;
        if (!verified) {
          clearStoredSession();
          router.replace("/login");
          return;
        }
        authenticatedUser = verified;
      }

      setCurrentUser(authenticatedUser);
      if (
        authenticatedUser &&
        typeof window !== "undefined" &&
        !window.location.search.includes("role=") &&
        ROLES.includes(authenticatedUser.role)
      ) {
        setSelectedRole(authenticatedUser.role);
      }
      setIsApiLive(live);
      setIsAuthReady(true);
      if (live) {
        const [remoteActions, remoteAudit, status, loadedDocs] = await Promise.all([
          fetchDecisionActions(),
          fetchAuditLog(),
          fetchCopilotStatus(),
          fetchKnowledgeDocs(),
        ]);
        if (!active) return;
        applyWorkspaceSnapshot(true, loadedDocs, status, remoteActions, remoteAudit);
      } else {
        applyWorkspaceSnapshot(false);
      }
    });
    return () => {
      active = false;
    };
  }, [router]);

  const handleSignOut = () => {
    clearStoredSession();
    setCurrentUser(null);
    router.push("/login");
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
  };

  const handleRoleChange = (newRole: ManufacturingRole) => {
    setSelectedRole(newRole);
    if (typeof window !== "undefined" && window.location.search.includes("role=")) {
      const url = new URL(window.location.href);
      url.searchParams.set("role", newRole);
      window.history.replaceState(null, "", url.pathname + url.search);
    }
    showToast(`Context updated for ${newRole}`);
  };

  const handleDeploymentModeChange = (mode: DeploymentMode) => {
    setDeploymentMode(mode);
    showToast(
      mode === "internal"
        ? "Switched to On-Premise VPC mode (CAD IP isolated)"
        : "Switched to Managed B2B SaaS mode"
    );
  };

  const handleDecisionReview = async (
    actionId: string,
    decision: "AUTHORIZED" | "OVERRIDDEN",
    notes: string
  ) => {
    const target = actions.find((a) => a.id === actionId);
    const nextStatus = decision === "OVERRIDDEN" ? "overridden" : "authorized";

    setActions((prev) =>
      prev.map((a) =>
        a.id === actionId
          ? {
              ...a,
              flagged: true,
              status: nextStatus,
              overrideReason: decision === "OVERRIDDEN" ? notes : a.overrideReason,
            }
          : a
      )
    );

    if (reviewingAction && reviewingAction.id === actionId) {
      setReviewingAction({
        ...reviewingAction,
        flagged: true,
        status: nextStatus,
        overrideReason: decision === "OVERRIDDEN" ? notes : reviewingAction.overrideReason,
      });
    }

    const reviewerLabel = currentUser ? `${currentUser.name} (${selectedRole})` : selectedRole;
    const newEntry: AuditLogEntry = {
      id: `AUD-${Date.now().toString().slice(-4)}`,
      actionId,
      actionTitle: target?.title || actionId,
      decision,
      reviewerRole: reviewerLabel,
      notes: notes.trim() || (decision === "AUTHORIZED" ? "Checklist verified by supervisor." : "Schedule change overridden."),
      sopRef: target?.sourceDoc || "SOP-MDIP",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) + " WIB",
    };

    setAuditLog((prev) => [newEntry, ...prev]);
    await flagDecisionAction(actionId, reviewerLabel, decision, notes);
    const syncedAudit = await fetchAuditLog();
    if (syncedAudit && syncedAudit.length > 0) {
      setAuditLog(syncedAudit);
    }
    showToast(
      decision === "OVERRIDDEN"
        ? "Override reason recorded in ISO 9001 audit log."
        : "Action authorized and recorded in human audit log."
    );
  };

  const sendChatQuery = async (rawQuery: string) => {
    const query = rawQuery.trim();
    if (!query || isChatLoading) return;

    const history: Array<{ role: "user" | "model"; text: string }> = chatMessages
      .slice(-6)
      .map((m) => ({
        role: m.sender === "you" ? "user" : "model",
        text: m.text,
      }));

    const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) + " WIB";
    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      sender: "you",
      text: query,
      timestamp: now,
    };

    setChatMessages((prev) => [...prev, userMsg]);
    setIsChatLoading(true);

    try {
      const response = await askManufacturingCopilot(query, selectedRole, history, knowledgeDocs);
      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: "copilot",
        text: response.reply,
        citations: response.citations,
        llmEnhanced: Boolean(response.llm_enhanced),
        model: typeof response.model === "string" ? response.model : null,
        llmError: typeof response.llm_error === "string" ? response.llm_error : null,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) + " WIB",
      };
      setChatMessages((prev) => [...prev, aiMsg]);
    } catch {
      const fallbackMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: "copilot",
        text: "Backend connection unavailable. Showing grounded guidance from local SOP index.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) + " WIB",
      };
      setChatMessages((prev) => [...prev, fallbackMsg]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const addKnowledgeDoc = async (payload: SopPayload): Promise<{ syncedToBackend: boolean }> => {
    const code = payload.doc_code.trim().toUpperCase();
    const normalizedPayload: SopPayload = {
      ...payload,
      doc_code: code,
      title: payload.title.trim(),
      clause: payload.clause.trim() || "Clause 1.0: Standard Control",
      excerpt: payload.excerpt.trim(),
    };
    const res = await ingestKnowledgeDoc(normalizedPayload);
    if (res?.success) {
      const remainingStored = readStoredCustomSops().filter((d) => d.code.toUpperCase() !== code);
      writeStoredCustomSops(remainingStored);
      const [refreshedDocs, freshStatus] = await Promise.all([
        fetchKnowledgeDocs(),
        fetchCopilotStatus(),
      ]);
      const mergedDocs = mergeKnowledgeDocs(refreshedDocs, remainingStored);
      setKnowledgeDocs(mergedDocs);
      setCopilotStatus({
        ...freshStatus,
        indexed_sops: Math.max(freshStatus.indexed_sops, res.total_documents ?? mergedDocs.length),
      });
      return { syncedToBackend: true };
    }

    const existing = knowledgeDocs.find((d) => d.code.toUpperCase() === code);
    const localDoc: KnowledgeDoc = existing
      ? {
          ...existing,
          title: normalizedPayload.title || existing.title,
          keywords: normalizedPayload.keywords.length > 0 ? normalizedPayload.keywords : existing.keywords,
          summary: normalizedPayload.excerpt,
          sections: [
            { clause: normalizedPayload.clause, content: normalizedPayload.excerpt },
            ...existing.sections.filter(
              (s) => s.clause.toLowerCase() !== normalizedPayload.clause.toLowerCase()
            ),
          ],
        }
      : {
          id: `sop-${code.toLowerCase()}`,
          title: normalizedPayload.title,
          code,
          category: "Plant SOP",
          keywords: normalizedPayload.keywords,
          summary: normalizedPayload.excerpt,
          sections: [{ clause: normalizedPayload.clause, content: normalizedPayload.excerpt }],
        };

    const nextStored = mergeKnowledgeDocs([localDoc], readStoredCustomSops());
    writeStoredCustomSops(nextStored);
    const mergedDocs = mergeKnowledgeDocs([localDoc], knowledgeDocs);
    setKnowledgeDocs(mergedDocs);
    setCopilotStatus((prev) => ({ ...prev, indexed_sops: mergedDocs.length }));
    return { syncedToBackend: false };
  };

  const clearChat = () => {
    setChatMessages([]);
  };

  const askCopilotWithPrompt = async (query: string) => {
    setIsChatOpen(true);
    await sendChatQuery(query);
  };

  const pendingActionsCount = actions.filter((a) => !a.flagged).length;
  const nextPendingAction = actions.find((a) => !a.flagged);

  if (!isAuthReady) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center text-sm text-ink-2">
        Checking your session…
      </div>
    );
  }

  return (
    <DashboardContext.Provider
      value={{
        selectedRole,
        setSelectedRole: handleRoleChange,
        deploymentMode,
        setDeploymentMode: handleDeploymentModeChange,
        isApiLive,
        copilotStatus,
        showToast,
        openCopilot: () => setIsChatOpen(true),
        askCopilotWithPrompt,
        actions,
        setActions,
        auditLog,
        reviewingAction,
        setReviewingAction,
        handleDecisionReview,
        knowledgeDocs,
        addKnowledgeDoc,
        chatMessages,
        isChatLoading,
        sendChatQuery,
        clearChat,
      }}
    >
      <Suspense fallback={null}>
        <SearchParamsSync
          onRoleInit={setSelectedRole}
          onOpenChat={() => setIsChatOpen(true)}
        />
      </Suspense>

      <div className="flex min-h-screen bg-paper">
        <Sidebar
          isOpenMobile={isMobileMenuOpen}
          onCloseMobile={() => setIsMobileMenuOpen(false)}
          pendingActionsCount={pendingActionsCount}
          isApiLive={isApiLive}
        />

        <div className="flex-1 flex flex-col min-w-0">
          <Topbar
            selectedRole={selectedRole}
            onSelectRole={handleRoleChange}
            deploymentMode={deploymentMode}
            onChangeDeploymentMode={handleDeploymentModeChange}
            onRefresh={() => {
              void syncTelemetry(true);
            }}
            isApiLive={isApiLive}
            onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
            onOpenCopilot={() => setIsChatOpen(true)}
            userName={currentUser?.name || null}
            onSignOut={handleSignOut}
          />

          <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
            {children}
          </main>
        </div>

        <ChatDrawer
          isOpen={isChatOpen}
          onClose={() => setIsChatOpen(false)}
          activeRole={selectedRole}
          messages={chatMessages}
          isLoading={isChatLoading}
          isApiLive={isApiLive}
          copilotStatus={copilotStatus}
          onSendQuery={sendChatQuery}
          onClearChat={clearChat}
          onReviewPendingAction={
            nextPendingAction
              ? () => {
                  setIsChatOpen(false);
                  setReviewingAction(nextPendingAction);
                }
              : undefined
          }
        />

        <ReviewModal
          action={reviewingAction}
          onClose={() => setReviewingAction(null)}
          onSubmitDecision={handleDecisionReview}
        />

        <Toast message={toastMessage} onClear={() => setToastMessage(null)} />
      </div>
    </DashboardContext.Provider>
  );
}
