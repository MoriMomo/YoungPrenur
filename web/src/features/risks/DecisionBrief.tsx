"use client";

import React from "react";
import { DecisionAction } from "@/types";
import { ArrowRight, Sparkles } from "lucide-react";

interface DecisionBriefProps {
  actions: DecisionAction[];
  onReviewAction: (action: DecisionAction) => void;
}

export const DecisionBrief: React.FC<DecisionBriefProps> = ({ actions, onReviewAction }) => {
  const getUrgencyBadge = (urgency: string) => {
    switch (urgency) {
      case "Urgent":
        return "bg-[#fee2e2] text-[#dc2626] border border-[#fecaca]";
      case "High":
        return "bg-[#fef3c7] text-[#d97706] border border-[#fde68a]";
      case "Medium":
      default:
        return "bg-[#eff6ff] text-[#2563eb] border border-[#bfdbfe]";
    }
  };

  return (
    <div className="bg-white rounded-xl border border-[#e2eaf3] p-5 shadow-[0_2px_8px_rgba(12,26,45,0.04)] hover:shadow-[0_4px_16px_rgba(12,26,45,0.06)] transition-all flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-bold text-[#101e30] tracking-tight flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#2563eb]" />
            <span>AI Decision Brief & Action Priorities</span>
          </h2>
          <p className="text-xs text-[#536780]">
            Cross-functional recommendations to eliminate schedule slippage and protect delivery dates.
          </p>
        </div>
        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#eff6ff] text-[#2563eb] border border-[#bfdbfe]">
          {actions.length} actions
        </span>
      </div>

      {/* Action Cards List */}
      <div className="space-y-3 flex-1 flex flex-col justify-between">
        {actions.map((act) => (
          <div
            key={act.id}
            className="p-3.5 rounded-xl border border-[#e2eaf3] hover:border-[#cbd5e1] bg-[#fbfcfe] hover:bg-white transition-all shadow-[0_1px_3px_rgba(12,26,45,0.02)]"
          >
            <div className="flex items-start justify-between gap-2 mb-1.5">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-md bg-[#eff6ff] text-[#2563eb] flex items-center justify-center text-xs shrink-0 font-bold">
                  ✧
                </span>
                <h3 className="text-sm font-bold text-[#101e30] tracking-tight">
                  {act.title}
                </h3>
              </div>
              <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md uppercase tracking-wider ${getUrgencyBadge(act.urgency)}`}>
                {act.urgency}
              </span>
            </div>

            <p className="text-xs text-[#475569] leading-relaxed mb-3">
              {act.description}
            </p>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-[#f1f5f9] text-xs">
              <div className="flex items-center gap-3 text-[#64748b]">
                <span className="font-medium text-[#334155]">{act.department}</span>
                <span>·</span>
                <span className="text-[#0d9263] font-semibold font-mono-numbers">
                  Confidence {act.confidence}%
                </span>
              </div>

              <button
                onClick={() => onReviewAction(act)}
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#2563eb] hover:text-[#1d4ed8] hover:underline cursor-pointer"
              >
                <span>{act.flagged ? "✓ Authorized (In Audit Log)" : "Review & Authorize"}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
