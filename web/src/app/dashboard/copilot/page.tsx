"use client";

import React from "react";
import { useDashboard } from "@/features/workspace/dashboard-context";
import { PageHeader } from "@/components/ui/PageHeader";
import { CopilotThread } from "@/features/copilot/CopilotThread";

export default function CopilotPage() {
  const {
    selectedRole,
    isApiLive,
    copilotStatus,
    chatMessages,
    isChatLoading,
    sendChatQuery,
    clearChat,
    actions,
    setReviewingAction,
  } = useDashboard();

  const nextPendingAction = actions.find((a) => !a.flagged);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <PageHeader
        title="Copilot"
        description="Answers only from the indexed SOP documents and plant streams, with a citation for every clause it relies on"
      />

      <div
        className="bg-sheet border border-rule-strong rounded-lg overflow-hidden flex flex-col h-[calc(100vh-14rem)] min-h-[520px] max-h-[780px]"
      >
        <CopilotThread
          activeRole={selectedRole}
          messages={chatMessages}
          isLoading={isChatLoading}
          isApiLive={isApiLive}
          copilotStatus={copilotStatus}
          onSendQuery={sendChatQuery}
          onClearChat={clearChat}
          onReviewPendingAction={
            nextPendingAction ? () => setReviewingAction(nextPendingAction) : undefined
          }
        />
      </div>
    </div>
  );
}
