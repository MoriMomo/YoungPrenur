"use client";

import React, { useCallback, useState, useEffect, useRef, Suspense } from "react";
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
  SESSION_EXPIRED_EVENT,
  setOnPremisesMode,
  fetchAuditLog,
  fetchCopilotStatus,
  fetchKnowledgeDocs,
  flagDecisionAction,
  askManufacturingCopilot,
  fetchDecisionActions,
  ingestKnowledgeDoc,
  logoutUser,
  subscribeFirebaseAuth,
} from "@/lib/api";
import {
  DashboardContext,
  DEFAULT_COPILOT_STATUS,
  mergeKnowledgeDocs,
  readStoredCustomSops,
  SopPayload,
  writeStoredCustomSops,
} from "@/features/workspace/dashboard-context";

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
    const mergedDocs = loadedDocs
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

  // Several checks can notice a missing or rejected session at once; the first redirect wins.
  const leavingRef = useRef(false);
  const leaveTo = useCallback(
    (url: string) => {
      if (leavingRef.current) return;
      leavingRef.current = true;
      router.replace(url);
    },
    [router]
  );

  // Any protected API call that comes back 401 ends the session here.
  useEffect(() => {
    const onExpired = () => leaveTo("/login?expired=1");
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired);
  }, [leaveTo]);

  useEffect(() => {
    let active = true;
    const unsubscribe = subscribeFirebaseAuth(
      async (authenticatedUser) => {
        if (!active) return;
        setCurrentUser(authenticatedUser);
        if (
          typeof window !== "undefined" &&
          !window.location.search.includes("role=") &&
          ROLES.includes(authenticatedUser.role)
        ) {
          setSelectedRole(authenticatedUser.role);
        }
        setIsAuthReady(true);

        const live = await checkApiHealth();
        if (!active) return;
        setIsApiLive(live);
        const [remoteActions, remoteAudit, status, loadedDocs] = await Promise.all([
          fetchDecisionActions(),
          fetchAuditLog(),
          live ? fetchCopilotStatus() : Promise.resolve(undefined),
          fetchKnowledgeDocs(),
        ]);
        if (!active) return;
        applyWorkspaceSnapshot(live, loadedDocs, status, remoteActions, remoteAudit);
      },
      () => {
        if (!active) return;
        leaveTo("/login");
      }
    );
    return () => {
      active = false;
      unsubscribe();
    };
  }, [leaveTo]);

  const handleSignOut = async () => {
    await logoutUser();
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
    setOnPremisesMode(mode === "internal");
    showToast(
      mode === "internal"
        ? "On-premises mode: documents and Copilot questions stay on the MDIP server"
        : "Cloud mode allows AI document parsing and Copilot answers"
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
    await flagDecisionAction(
      actionId,
      reviewerLabel,
      decision,
      notes,
      target?.title || actionId,
      target?.sourceDoc || "SOP-MDIP"
    );
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
