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
import { KNOWLEDGE_DOCS, ROLES } from "@/lib/mock-data";
import {
  AuthUser,
  checkApiHealth,
  clearKnowledgeDocsApi,
  SESSION_EXPIRED_EVENT,
  setOnPremisesMode,
  fetchAuditLog,
  fetchCopilotStatus,
  fetchDelayRiskPrediction,
  fetchKnowledgeDocs,
  flagDecisionAction,
  askManufacturingCopilot,
  fetchDecisionActions,
  ingestKnowledgeDoc,
  ingestSopClauses,
  loadSampleKnowledgeDocs,
  logoutUser,
  subscribeAuth,
} from "@/lib/api";
import {
  DashboardContext,
  DEFAULT_COPILOT_STATUS,
  mergeKnowledgeDocs,
  readStoredCustomSops,
  readStoredUserSchedule,
  SopPayload,
  writeStoredCustomSops,
} from "@/features/workspace/dashboard-context";
import { useT } from "@/lib/i18n";

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
  const t = useT();
  const [selectedRole, setSelectedRole] = useState<ManufacturingRole>("Operations Manager");
  const [deploymentMode, setDeploymentMode] = useState<DeploymentMode>("saas");
  const [isApiLive, setIsApiLive] = useState<boolean>(false);
  const [copilotStatus, setCopilotStatus] = useState<CopilotStatus>(DEFAULT_COPILOT_STATUS);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const [toast, setToast] = useState<{ message: string; tone: "success" | "error" } | null>(null);

  const [actions, setActions] = useState<DecisionAction[]>([]);
  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>([]);
  const [knowledgeDocs, setKnowledgeDocs] = useState<KnowledgeDoc[]>([]);
  const [reviewingAction, setReviewingAction] = useState<DecisionAction | null>(null);

  const [isChatOpen, setIsChatOpen] = useState<boolean>(false);
  const [isChatLoading, setIsChatLoading] = useState<boolean>(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

  const applyWorkspaceSnapshot = (
    uid: string | null,
    live: boolean,
    loadedDocs?: KnowledgeDoc[],
    status?: CopilotStatus,
    remoteActions?: DecisionAction[] | null,
    remoteAudit?: AuditLogEntry[] | null,
    hasUploadedSchedule = false
  ) => {
    const stored = readStoredCustomSops(uid);
    const mergedDocs = loadedDocs ? mergeKnowledgeDocs(loadedDocs, stored) : stored;
    setKnowledgeDocs(mergedDocs);
    if (live && status) {
      setCopilotStatus({
        ...status,
        indexed_sops: Math.max(status.indexed_sops, mergedDocs.length),
      });
    } else {
      setCopilotStatus({ ...DEFAULT_COPILOT_STATUS, indexed_sops: mergedDocs.length });
    }
    setActions(hasUploadedSchedule ? remoteActions ?? [] : []);
    setAuditLog(remoteAudit ?? []);
  };

  const syncTelemetry = async (announce = false) => {
    const uid = currentUser?.id || null;
    const live = await checkApiHealth();
    setIsApiLive(live);
    if (live) {
      const [remotePred, remoteActions, remoteAudit, status, loadedDocs] = await Promise.all([
        fetchDelayRiskPrediction(),
        fetchDecisionActions(),
        fetchAuditLog(),
        fetchCopilotStatus(),
        fetchKnowledgeDocs(),
      ]);
      const hasUploaded = remotePred !== null || readStoredUserSchedule(uid) !== null;
      applyWorkspaceSnapshot(uid, true, loadedDocs, status, remoteActions, remoteAudit, hasUploaded);
    } else {
      applyWorkspaceSnapshot(uid, false, undefined, undefined, [], [], readStoredUserSchedule(uid) !== null);
    }
    if (announce) {
      showToast(
        live
          ? t("Telemetry refreshed from live FastAPI backend.", "Telemetri dimuat ulang dari backend FastAPI langsung.")
          : t("Service offline: loaded cached session data.", "Layanan offline: memuat data sesi tersimpan.")
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
    const unsubscribe = subscribeAuth(
      async (authenticatedUser) => {
        if (!active) return;
        const uid = authenticatedUser.id;
        setCurrentUser((prev) => {
          if (prev && prev.id !== uid) {
            setActions([]);
            setAuditLog([]);
            setChatMessages([]);
            setReviewingAction(null);
          }
          return authenticatedUser;
        });
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
        const [remotePred, remoteActions, remoteAudit, status, loadedDocs] = await Promise.all([
          fetchDelayRiskPrediction(),
          fetchDecisionActions(),
          fetchAuditLog(),
          live ? fetchCopilotStatus() : Promise.resolve(undefined),
          fetchKnowledgeDocs(),
        ]);
        if (!active) return;
        const hasUploaded = remotePred !== null || readStoredUserSchedule(uid) !== null;
        applyWorkspaceSnapshot(uid, live, loadedDocs, status, remoteActions, remoteAudit, hasUploaded);
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
    setActions([]);
    setAuditLog([]);
    setChatMessages([]);
    setReviewingAction(null);
    router.push("/login");
  };

  const showToast = (msg: string, tone: "success" | "error" = "success") => {
    setToast({ message: msg, tone });
  };

  const handleRoleChange = (newRole: ManufacturingRole) => {
    setSelectedRole(newRole);
    if (typeof window !== "undefined" && window.location.search.includes("role=")) {
      const url = new URL(window.location.href);
      url.searchParams.set("role", newRole);
      window.history.replaceState(null, "", url.pathname + url.search);
    }
    showToast(t(`Context updated for ${newRole}`, `Konteks diperbarui untuk ${t(newRole)}`));
  };

  const handleDeploymentModeChange = (mode: DeploymentMode) => {
    setDeploymentMode(mode);
    setOnPremisesMode(mode === "internal");
    showToast(
      mode === "internal"
        ? t(
            "On-premises mode: documents and Copilot questions stay on the MDIP server",
            "Mode on-premises: dokumen dan pertanyaan Copilot tetap di server MDIP"
          )
        : t("Cloud mode allows AI document parsing and Copilot answers", "Mode cloud mengizinkan AI membaca dokumen dan menjawab Copilot")
    );
  };

  const handleDecisionReview = async (
    actionId: string,
    decision: "AUTHORIZED" | "OVERRIDDEN",
    notes: string
  ) => {
    const entry = await flagDecisionAction(actionId, decision, notes);
    const nextStatus = decision === "OVERRIDDEN" ? "overridden" : "authorized";
    const markReviewed = (action: DecisionAction): DecisionAction =>
      action.id === actionId
        ? {
            ...action,
            flagged: true,
            status: nextStatus,
            overrideReason: decision === "OVERRIDDEN" ? entry.notes : undefined,
          }
        : action;

    setActions((prev) => prev.map(markReviewed));
    setReviewingAction((prev) => prev ? markReviewed(prev) : prev);
    setAuditLog((prev) => [entry, ...prev.filter((item) => item.id !== entry.id)]);
    showToast(
      decision === "OVERRIDDEN"
        ? t("Override recorded in your audit log.", "Pembatalan dicatat di log audit Anda.")
        : t("Authorization recorded in your audit log.", "Persetujuan dicatat di log audit Anda.")
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
        offline: response.offline === true,
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
        offline: true,
        text: t("Copilot is unavailable. Please send your question again.", "Copilot tidak tersedia. Silakan kirim pertanyaan Anda lagi."),
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) + " WIB",
      };
      setChatMessages((prev) => [...prev, fallbackMsg]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const saveSopClauses = async (rows: SopPayload[]): Promise<boolean> => {
    if (!(await ingestSopClauses(rows))) return false;
    const uid = currentUser?.id || null;
    const [refreshedDocs, freshStatus, freshActions] = await Promise.all([
      fetchKnowledgeDocs(),
      fetchCopilotStatus(),
      fetchDecisionActions(),
    ]);
    setKnowledgeDocs(mergeKnowledgeDocs(refreshedDocs, readStoredCustomSops(uid)));
    setCopilotStatus(freshStatus);
    if (readStoredUserSchedule(uid) !== null || freshActions) {
      setActions(freshActions ?? []);
    }
    return true;
  };

  const addKnowledgeDoc = async (payload: SopPayload): Promise<{ syncedToBackend: boolean }> => {
    const uid = currentUser?.id || null;
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
      const remainingStored = readStoredCustomSops(uid).filter((d) => d.code.toUpperCase() !== code);
      writeStoredCustomSops(remainingStored, uid);
      const [refreshedDocs, freshStatus, freshActions] = await Promise.all([
        fetchKnowledgeDocs(),
        fetchCopilotStatus(),
        fetchDecisionActions(),
      ]);
      const mergedDocs = mergeKnowledgeDocs(refreshedDocs, remainingStored);
      setKnowledgeDocs(mergedDocs);
      setCopilotStatus({
        ...freshStatus,
        indexed_sops: Math.max(freshStatus.indexed_sops, res.total_documents ?? mergedDocs.length),
      });
      if (freshActions) setActions(freshActions);
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

    const nextStored = mergeKnowledgeDocs([localDoc], readStoredCustomSops(uid));
    writeStoredCustomSops(nextStored, uid);
    const mergedDocs = mergeKnowledgeDocs([localDoc], knowledgeDocs);
    setKnowledgeDocs(mergedDocs);
    setCopilotStatus((prev) => ({ ...prev, indexed_sops: mergedDocs.length }));
    return { syncedToBackend: false };
  };

  const loadSampleSops = async () => {
    const uid = currentUser?.id || null;
    const remote = await loadSampleKnowledgeDocs();
    if (remote) {
      const merged = mergeKnowledgeDocs(remote, readStoredCustomSops(uid));
      setKnowledgeDocs(merged);
      const [freshStatus, freshActions] = await Promise.all([fetchCopilotStatus(), fetchDecisionActions()]);
      setCopilotStatus({ ...freshStatus, indexed_sops: Math.max(freshStatus.indexed_sops, merged.length) });
      if (freshActions) setActions(freshActions);
      showToast(t("Loaded sample plant SOPs into your workspace.", "SOP contoh pabrik dimuat ke ruang kerja Anda."));
      return;
    }
    const mergedOffline = mergeKnowledgeDocs(KNOWLEDGE_DOCS, readStoredCustomSops(uid));
    writeStoredCustomSops(mergedOffline, uid);
    setKnowledgeDocs(mergedOffline);
    setCopilotStatus((prev) => ({ ...prev, indexed_sops: mergedOffline.length }));
    showToast(t("Loaded sample SOPs in offline workspace.", "SOP contoh dimuat ke ruang kerja offline."));
  };

  const clearKnowledgeDocs = async () => {
    const uid = currentUser?.id || null;
    await clearKnowledgeDocsApi();
    writeStoredCustomSops([], uid);
    setKnowledgeDocs([]);
    setCopilotStatus((prev) => ({ ...prev, indexed_sops: 0 }));
    const freshActions = await fetchDecisionActions();
    if (freshActions) setActions(freshActions);
    showToast(t("Cleared SOP knowledge base back to blank.", "Basis pengetahuan SOP dikosongkan kembali."));
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
        {t("Checking your session…", "Memeriksa sesi Anda…")}
      </div>
    );
  }

  return (
    <DashboardContext.Provider
      value={{
        userId: currentUser?.id || null,
        userName: currentUser?.name || null,
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
        saveSopClauses,
        loadSampleSops,
        clearKnowledgeDocs,
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

        <Toast
          message={toast?.message ?? null}
          tone={toast?.tone}
          onClear={() => setToast(null)}
        />
      </div>
    </DashboardContext.Provider>
  );
}
