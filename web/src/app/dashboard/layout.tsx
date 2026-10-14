"use client";

import React, { createContext, useContext, useState, useEffect, Suspense, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { Toast } from "@/components/ui/Toast";
import { ReviewModal } from "@/components/ui/ReviewModal";
import { ChatDrawer } from "@/features/copilot/ChatDrawer";
import { ManufacturingRole, DecisionAction, ChatMessage } from "@/types";
import { INITIAL_ACTIONS, ROLES } from "@/lib/mock-data";
import { checkApiHealth, flagDecisionAction } from "@/lib/api";
import { Sparkles } from "lucide-react";

interface DashboardContextType {
  selectedRole: ManufacturingRole;
  setSelectedRole: (role: ManufacturingRole) => void;
  isApiLive: boolean;
  showToast: (msg: string) => void;
  openCopilot: () => void;
  actions: DecisionAction[];
  setActions: React.Dispatch<React.SetStateAction<DecisionAction[]>>;
  reviewingAction: DecisionAction | null;
  setReviewingAction: (act: DecisionAction | null) => void;
  handleFlagAction: (actionId: string) => Promise<void>;
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
  onRoleChange,
  onOpenChat,
}: {
  onRoleChange: (role: ManufacturingRole) => void;
  onOpenChat: () => void;
}) {
  const searchParams = useSearchParams();

  useEffect(() => {
    const roleParam = searchParams.get("role") as ManufacturingRole;
    if (roleParam && ROLES.includes(roleParam)) {
      onRoleChange(roleParam);
    }
    if (searchParams.get("chat") === "open") {
      onOpenChat();
    }
  }, [searchParams, onRoleChange, onOpenChat]);

  return null;
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [selectedRole, setSelectedRole] = useState<ManufacturingRole>("Operations Manager");
  const [isApiLive, setIsApiLive] = useState<boolean>(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Decision actions state
  const [actions, setActions] = useState<DecisionAction[]>(INITIAL_ACTIONS);
  const [reviewingAction, setReviewingAction] = useState<DecisionAction | null>(null);

  // Chat copilot state
  const [isChatOpen, setIsChatOpen] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return window.location.search.includes("chat=open");
    }
    return false;
  });
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(() => {
    if (typeof window !== "undefined" && window.location.search.includes("chat=open")) {
      return [
        {
          id: "msg-user-1",
          sender: "you",
          text: "Bagaimana mitigasi deviasi keterlambatan pada WBS-1.2 CNC Rough Machining?",
          timestamp: "09:12 AM"
        },
        {
          id: "msg-ai-1",
          sender: "copilot",
          text: "Berdasarkan analisis telemetri IRoom aktif dan dokumen SOP manufaktur terverifikasi:\n\nAktivitas WBS-1.2 (CNC Rough Machining) memiliki probabilitas deviasi keterlambatan 72% akibat akumulasi variansi +2 hari pada Cell A dan ketergantungan material Alloy AL7075-T6. Disarankan melakukan otorisasi lembur operator 3.5 jam untuk memulihkan 80% jalur kritis.",
          citations: [
            {
              doc_code: "SCH-IMAJIN-04",
              clause: "WBS Section 1.2",
              title: "Master Manufacturing Schedule Rev 3",
              excerpt: "Upstream plate delivery variance logged at +2.0 days."
            },
            {
              doc_code: "SOP-PROD-02",
              clause: "Section 4.1 (Bottleneck Remediation)",
              title: "Standard Operating Procedure CNC Milling",
              excerpt: "When spindle utilization exceeds 90%, load balancing or overtime authorization is recommended."
            }
          ],
          timestamp: "09:12 AM"
        }
      ];
    }
    return [
      {
        id: "initial-msg",
        sender: "copilot",
        text: "Halo! Saya Copilot Manufaktur MDIP. Saya dapat membantu menganalisis anomali operasional, prioritas keputusan lintas departemen, dan prosedur teknis SOP terverifikasi.",
        timestamp: "08:30 AM",
      },
    ];
  });

  useEffect(() => {
    checkApiHealth().then((live) => setIsApiLive(live));
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
  };

  const handleRoleChange = (newRole: ManufacturingRole) => {
    setSelectedRole(newRole);
    showToast(`Context updated for ${newRole}`);
  };

  const handleFlagAction = async (actionId: string) => {
    const updated = actions.map((a) =>
      a.id === actionId ? { ...a, flagged: true } : a
    );
    setActions(updated);
    if (reviewingAction && reviewingAction.id === actionId) {
      setReviewingAction({ ...reviewingAction, flagged: true });
    }
    await flagDecisionAction(actionId, selectedRole);
    showToast("Action authorized and recorded in human audit log.");
  };

  return (
    <DashboardContext.Provider
      value={{
        selectedRole,
        setSelectedRole: handleRoleChange,
        isApiLive,
        showToast,
        openCopilot: () => setIsChatOpen(true),
        actions,
        setActions,
        reviewingAction,
        setReviewingAction,
        handleFlagAction,
      }}
    >
      <Suspense fallback={null}>
        <SearchParamsSync
          onRoleChange={handleRoleChange}
          onOpenChat={() => setIsChatOpen(true)}
        />
      </Suspense>

      <div className="flex min-h-screen bg-[#f4f7fb]">
        {/* 1. Global Navigation Sidebar */}
        <Sidebar
          isOpenMobile={isMobileMenuOpen}
          onCloseMobile={() => setIsMobileMenuOpen(false)}
          onOpenCopilot={() => setIsChatOpen(true)}
        />

        {/* 2. Main Workspace Viewport */}
        <div className="flex-1 flex flex-col min-w-0">
          <Topbar
            selectedRole={selectedRole}
            onSelectRole={handleRoleChange}
            onRefresh={() => {
              handleRoleChange(selectedRole);
              showToast("Dashboard refreshed with latest project telemetry");
            }}
            isApiLive={isApiLive}
            onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
            onOpenCopilot={() => setIsChatOpen(true)}
          />

          {/* Child Page View */}
          <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
            {children}
          </main>
        </div>

        {/* Floating Action Button (FAB) for AI Copilot */}
        <button
          onClick={() => setIsChatOpen(true)}
          className="fixed bottom-6 right-6 z-40 flex items-center gap-2 px-4 py-3 bg-[#102238] hover:bg-[#1a385c] text-white rounded-full shadow-[0_8px_30px_rgba(16,34,56,0.25)] border border-[#2b4865] hover:scale-105 active:scale-95 transition-all text-xs sm:text-sm font-semibold cursor-pointer"
          aria-label="Ask Manufacturing AI"
        >
          <Sparkles className="w-4 h-4 text-[#38bdf8]" />
          <span>Ask Manufacturing AI</span>
        </button>

        {/* Global Copilot Chat Drawer */}
        <ChatDrawer
          isOpen={isChatOpen}
          onClose={() => setIsChatOpen(false)}
          activeRole={selectedRole}
          messages={chatMessages}
          onSendMessage={(newMsg) => setChatMessages((prev) => [...prev, newMsg])}
        />

        {/* Global Human-in-the-Loop Review Modal */}
        <ReviewModal
          action={reviewingAction}
          onClose={() => setReviewingAction(null)}
          onFlagAction={handleFlagAction}
        />

        {/* Global Toast Notification */}
        <Toast message={toastMessage} onClear={() => setToastMessage(null)} />
      </div>
    </DashboardContext.Provider>
  );
}
