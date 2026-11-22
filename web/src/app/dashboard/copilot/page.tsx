"use client";

import React from "react";
import { useDashboard } from "@/features/workspace/dashboard-context";
import { PageHeader } from "@/components/ui/PageHeader";
import { CopilotThread } from "@/features/copilot/CopilotThread";
import { useT } from "@/lib/i18n";

export default function CopilotPage() {
  const t = useT();
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
        description={t(
          "Answers only from the indexed SOP documents and plant streams, with a citation for every clause it relies on",
          "Menjawab hanya dari dokumen SOP terindeks dan aliran pabrik, dengan kutipan untuk setiap klausul yang menjadi dasarnya"
        )}
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
