"use client";

import React from "react";
import { useDashboard } from "../layout";
import { IRoomWorkspace } from "@/features/iroom/IRoomWorkspace";

export default function IRoomPage() {
  const { openCopilot, showToast } = useDashboard();

  return (
    <IRoomWorkspace
      onAskCopilot={() => {
        openCopilot();
      }}
      onToast={showToast}
    />
  );
}
