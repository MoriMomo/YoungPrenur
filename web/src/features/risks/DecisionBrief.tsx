"use client";

import React from "react";
import { DecisionAction } from "@/types";
import { ArrowRight } from "lucide-react";

interface DecisionBriefProps {
  actions: DecisionAction[];
  priorityDepartment?: string;
  onReviewAction: (action: DecisionAction) => void;
}

export const DecisionBrief: React.FC<DecisionBriefProps> = ({
  actions,
  priorityDepartment,
  onReviewAction,
}) => {
  const getUrgencyDot = (urgency: string) => {
    switch (urgency) {
      case "Urgent":
        return "bg-[#dc2626]";
      case "High":
        return "bg-[#d97706]";
      case "Medium":
      default:
        return "bg-[#2563eb]";
    }
  };

  const getUrgencyText = (urgency: string) => {
    switch (urgency) {
      case "Urgent":
        return "text-[#dc2626]";
      case "High":
        return "text-[#b45309]";
      case "Medium":
      default:
        return "text-[#4b5565]";
    }
  };

  return (
    <div className="bg-white rounded-xl border border-[#e5e7eb] p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)] flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-[15px] font-medium text-[#111827]">
            AI Decision Brief &amp; Priorities
          </h2>
          <p className="text-xs text-[#64748b]">
            Prioritized interventions requiring human-in-the-loop sign-off
          </p>
        </div>
        <span className="text-xs font-mono-numbers text-[#64748b] shrink-0">
          {actions.length} items
        </span>
      </div>

      <div className="space-y-3 flex-1 flex flex-col justify-between">
        {actions.map((act) => {
          const isRoleMatch = priorityDepartment && act.department === priorityDepartment;
          return (
            <div
              key={act.id}
              className={`p-3.5 rounded-xl border transition-colors ${
                isRoleMatch
                  ? "border-[#cbd5e1] bg-white"
                  : "border-[#e5e7eb] bg-[#fafafa]"
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <div className="min-w-0">
                  {isRoleMatch && (
                    <div className="text-[11px] font-mono-numbers text-[#2563eb] font-medium mb-0.5">
                      Role Focus
                    </div>
                  )}
                  <h3 className="text-sm font-medium text-[#111827]">
                    {act.title}
                  </h3>
                </div>
                <span
                  className={`inline-flex items-center gap-1.5 text-[11px] font-mono-numbers font-medium shrink-0 ${getUrgencyText(
                    act.urgency
                  )}`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${getUrgencyDot(act.urgency)}`} />
                  <span>{act.urgency}</span>
                </span>
              </div>

              <p className="text-xs text-[#4b5565] leading-relaxed mb-3">{act.description}</p>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-[#f1f5f9] text-xs">
                <div className="flex items-center gap-2 text-[#64748b]">
                  <span className="font-medium text-[#374151]">{act.department}</span>
                  <span>·</span>
                  <span className="text-[#16a34a] font-medium font-mono-numbers">
                    Confidence {act.confidence}%
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => onReviewAction(act)}
                  className="inline-flex items-center gap-1 text-xs font-medium text-[#2563eb] hover:text-[#1d4ed8] hover:underline cursor-pointer"
                >
                  <span>
                    {act.flagged
                      ? act.status === "overridden"
                        ? "Overridden (Logged)"
                        : "Authorized (Logged)"
                      : "Review & Decide"}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5" strokeWidth={1.5} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
