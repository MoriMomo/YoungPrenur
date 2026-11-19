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
  DeploymentMode,
  AuditLogEntry,
} from "@/types";
import { INITIAL_ACTIONS, INITIAL_AUDIT_LOG, ROLES } from "@/lib/mock-data";
import {
  AuthUser,
  checkApiHealth,
  clearStoredSession,
  fetchAuditLog,
  flagDecisionAction,
  askManufacturingCopilot,
  fetchDecisionActions,
  getStoredSession,
} from "@/lib/api";

interface DashboardContextType {
  selectedRole: ManufacturingRole;
  setSelectedRole: (role: ManufacturingRole) => void;
  deploymentMode: DeploymentMode;
  setDeploymentMode: (mode: DeploymentMode) => void;
  isApiLive: boolean;
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
  chatMessages: ChatMessage[];
  isChatLoading: boolean;
  sendChatQuery: (query: string) => Promise<void>;
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

const INITIAL_CHAT_MESSAGES: ChatMessage[] = [
  {
    id: "initial-msg",
    sender: "copilot",
    text: "Hello. I am the MDIP Manufacturing Copilot. Ask about WBS critical path slippage, IRoom material/sensor alerts, or SOP compliance clauses.",
    citations: [
      {
        doc_code: "SOP-SCM-12",
        clause: "Clause 2.1: Buffer Inventory Warning",
        title: "Critical Component Shortage & Express Procurement",
        excerpt: "When buffer stock falls below 48 hours and supplier lead time exceeds 48 hours, trigger express air freight.",
      },
    ],
    timestamp: "08:30 WIB",
  },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [selectedRole, setSelectedRole] = useState<ManufacturingRole>("Operations Manager");
  const [deploymentMode, setDeploymentMode] = useState<DeploymentMode>("saas");
  const [isApiLive, setIsApiLive] = useState<boolean>(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [actions, setActions] = useState<DecisionAction[]>(INITIAL_ACTIONS);
  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>(INITIAL_AUDIT_LOG);
  const [reviewingAction, setReviewingAction] = useState<DecisionAction | null>(null);

  const [isChatOpen, setIsChatOpen] = useState<boolean>(false);
  const [isChatLoading, setIsChatLoading] = useState<boolean>(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(INITIAL_CHAT_MESSAGES);

  const syncTelemetry = async (announce = false) => {
    const live = await checkApiHealth();
    setIsApiLive(live);
    if (live) {
      const [remoteActions, remoteAudit] = await Promise.all([
        fetchDecisionActions(),
        fetchAuditLog(),
      ]);
      if (remoteActions && remoteActions.length > 0) {
        setActions(remoteActions);
      }
      if (remoteAudit && remoteAudit.length > 0) {
        setAuditLog(remoteAudit);
      }
    }
    if (announce) {
      showToast(
        live
          ? "Telemetry refreshed from live FastAPI backend."
          : "Telemetry refreshed from TRL 4 simulation sandbox."
      );
    }
  };

  useEffect(() => {
    let active = true;
    checkApiHealth().then(async (live) => {
      if (!active) return;
      const session = getStoredSession();
      if (session?.user) {
        setCurrentUser(session.user);
        if (
          typeof window !== "undefined" &&
          !window.location.search.includes("role=") &&
          ROLES.includes(session.user.role)
        ) {
          setSelectedRole(session.user.role);
        }
      }
      setIsApiLive(live);
      if (live) {
        const [remoteActions, remoteAudit] = await Promise.all([
          fetchDecisionActions(),
          fetchAuditLog(),
        ]);
        if (!active) return;
        if (remoteActions && remoteActions.length > 0) setActions(remoteActions);
        if (remoteAudit && remoteAudit.length > 0) setAuditLog(remoteAudit);
      }
    });
    return () => {
      active = false;
    };
  }, []);

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
      const response = await askManufacturingCopilot(query, selectedRole);
      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: "copilot",
        text: response.reply,
        citations: response.citations,
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

  const askCopilotWithPrompt = async (query: string) => {
    setIsChatOpen(true);
    await sendChatQuery(query);
  };

  const pendingActionsCount = actions.filter((a) => !a.flagged).length;

  return (
    <DashboardContext.Provider
      value={{
        selectedRole,
        setSelectedRole: handleRoleChange,
        deploymentMode,
        setDeploymentMode: handleDeploymentModeChange,
        isApiLive,
        showToast,
        openCopilot: () => setIsChatOpen(true),
        askCopilotWithPrompt,
        actions,
        setActions,
        auditLog,
        reviewingAction,
        setReviewingAction,
        handleDecisionReview,
        chatMessages,
        isChatLoading,
        sendChatQuery,
      }}
    >
      <Suspense fallback={null}>
        <SearchParamsSync
          onRoleInit={setSelectedRole}
          onOpenChat={() => setIsChatOpen(true)}
        />
      </Suspense>

      <div className="flex min-h-screen bg-[#f4f7fb]">
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
          onSendQuery={sendChatQuery}
          onReviewFirstPending={() => {
            const nextPending = actions.find((a) => !a.flagged) || actions[0];
            if (nextPending) {
              setIsChatOpen(false);
              setReviewingAction(nextPending);
            }
          }}
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
