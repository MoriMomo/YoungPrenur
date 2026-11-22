"use client";

import React, { useEffect } from "react";
import { ChatMessage, CopilotStatus, ManufacturingRole } from "@/types";
import { CopilotThread } from "./CopilotThread";
import { useT } from "@/lib/i18n";

interface ChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeRole: ManufacturingRole;
  messages: ChatMessage[];
  isLoading: boolean;
  isApiLive: boolean;
  copilotStatus: CopilotStatus;
  onSendQuery: (query: string) => Promise<void>;
  onClearChat: () => void;
  onReviewPendingAction?: () => void;
}

export const ChatDrawer: React.FC<ChatDrawerProps> = ({
  isOpen,
  onClose,
  activeRole,
  messages,
  isLoading,
  isApiLive,
  copilotStatus,
  onSendQuery,
  onClearChat,
  onReviewPendingAction,
}) => {
  const t = useT();
  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEsc);
    return () => {
      window.removeEventListener("keydown", handleEsc);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-ink/35 z-50 flex justify-end"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label={t("MDIP Copilot Drawer", "Panel Copilot MDIP")}
    >
      <div className="bg-sheet w-full max-w-lg h-full shadow-2xl border-l border-rule-strong flex flex-col overflow-hidden">
        <CopilotThread
          compact
          headerTitle="MDIP Copilot"
          onClose={onClose}
          activeRole={activeRole}
          messages={messages}
          isLoading={isLoading}
          isApiLive={isApiLive}
          copilotStatus={copilotStatus}
          onSendQuery={onSendQuery}
          onClearChat={onClearChat}
          onReviewPendingAction={onReviewPendingAction}
        />
      </div>
    </div>
  );
};
