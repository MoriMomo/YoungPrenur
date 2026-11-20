"use client";

import React, { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useDashboard } from "@/features/workspace/dashboard-context";
import { IRoomWorkspace, IRoomTab } from "@/features/iroom/IRoomWorkspace";

const VALID_TABS: IRoomTab[] = ["material", "progress", "drawing", "quotation", "operations"];

function IRoomPageInner() {
  const searchParams = useSearchParams();
  const { askCopilotWithPrompt, showToast, isApiLive } = useDashboard();
  const rawTab = searchParams.get("tab") as IRoomTab | null;
  const initialTab: IRoomTab = rawTab && VALID_TABS.includes(rawTab) ? rawTab : "material";

  return (
    <IRoomWorkspace
      key={initialTab}
      initialTab={initialTab}
      isApiLive={isApiLive}
      onAskCopilot={(query) => {
        void askCopilotWithPrompt(query);
      }}
      onToast={showToast}
    />
  );
}

export default function IRoomPage() {
  return (
    <Suspense fallback={null}>
      <IRoomPageInner />
    </Suspense>
  );
}
