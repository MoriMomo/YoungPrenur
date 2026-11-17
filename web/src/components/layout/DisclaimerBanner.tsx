"use client";

import React from "react";

export const DisclaimerBanner: React.FC = () => {
  return (
    <div className="p-3.5 rounded-lg bg-[#fafafa] border border-[#e5e7eb] text-xs text-[#64748b] leading-relaxed">
      <span className="text-[#111827] font-medium">
        TRL 4 Prototype &amp; Governance Disclosure:
      </span>{" "}
      Metrics, delay-risk probabilities (Rule-Based CPM + Heuristic PoC; XGBoost ML on roadmap pending historical partner data), and IRoom records shown here are simulated demonstration data from BINUS RTT (D1521) and PT IMAJIN research. Consequential shop-floor actions require human supervisor authorization before dispatch.
    </div>
  );
};
