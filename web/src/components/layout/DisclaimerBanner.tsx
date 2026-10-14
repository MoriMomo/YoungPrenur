"use client";

import React from "react";
import { AlertCircle } from "lucide-react";

export const DisclaimerBanner: React.FC = () => {
  return (
    <div className="p-4 rounded-xl bg-white border border-[#e2eaf3] text-xs text-[#536780] flex items-start gap-3 shadow-sm">
      <AlertCircle className="w-4 h-4 text-[#2563eb] shrink-0 mt-0.5" />
      <div>
        <strong className="text-[#101e30] font-semibold">Integrity & Governance Disclaimer:</strong>{" "}
        This dashboard presents validated decision intelligence and critical path delay predictions based on research by Dr. Ir. Indrajani (BINUS RTT) and IMAJIN Enterprise.
        Consequential physical shop-floor actions require verified human-in-the-loop sign-off before dispatch.
      </div>
    </div>
  );
};
