"use client";

import React from "react";
import { DecisionAction } from "@/types";
import { ArrowRight } from "lucide-react";
import { useT } from "@/lib/i18n";

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
  const t = useT();
  const getUrgencyDot = (urgency: string) => {
    switch (urgency) {
      case "Urgent":
        return "bg-hold";
      case "High":
        return "bg-warn";
      case "Medium":
      default:
        return "bg-stamp";
    }
  };

  const getUrgencyText = (urgency: string) => {
    switch (urgency) {
      case "Urgent":
        return "text-hold";
      case "High":
        return "text-warn";
      case "Medium":
      default:
        return "text-ink-2";
    }
  };

  return (
    <div className="bg-sheet border border-rule-strong p-5 flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-display text-[20px] font-bold leading-tight text-ink">
            {t("Decision Brief & Priorities", "Ringkasan Keputusan & Prioritas")}
          </h2>
          <p className="text-xs text-ink-3">
            {t("Prioritized interventions requiring human-in-the-loop sign-off", "Intervensi prioritas yang perlu pengesahan manusia")}
          </p>
        </div>
        <span className="text-xs font-mono-numbers text-ink-3 shrink-0">
          {t(`${actions.length} items`, `${actions.length} item`)}
        </span>
      </div>

      <div className="space-y-2.5 max-h-[390px] overflow-y-auto pr-1">
        {actions.length === 0 ? (
          <p className="py-4 text-xs text-ink-3">
            {t("No risk mitigation interventions required on the active schedule.", "Tidak ada intervensi mitigasi risiko yang diperlukan pada jadwal aktif.")}
          </p>
        ) : actions.map((act) => {
          const isRoleMatch = priorityDepartment && act.department === priorityDepartment;
          return (
            <div
              key={act.id}
              className={`p-3 border transition-colors ${
                isRoleMatch
                  ? "border-rule-strong bg-paper"
                  : "border-rule bg-sheet"
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-1">
                <div className="min-w-0">
                  {isRoleMatch && (
                    <div className="text-[11px] font-mono-numbers text-stamp font-medium mb-0.5">
                      {t("Role Focus", "Fokus Peran")}
                    </div>
                  )}
                  <h3 className="text-sm font-medium text-ink leading-snug">
                    {act.title}
                  </h3>
                </div>
                <span
                  className={`inline-flex items-center gap-1.5 text-xs font-mono-numbers font-medium shrink-0 ${getUrgencyText(
                    act.urgency
                  )}`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${getUrgencyDot(act.urgency)}`} />
                  <span>{t(act.urgency)}</span>
                </span>
              </div>

              <p className="text-xs text-ink-2 leading-relaxed line-clamp-2 mb-2.5">{act.description}</p>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-rule-soft text-xs">
                <div className="flex items-center gap-2 text-ink-3">
                  <span className="font-medium text-ink-2">{t(act.department)}</span>
                  <span>·</span>
                  <span className="text-pass font-medium font-mono-numbers">
                    {t("Confidence", "Keyakinan")} {act.confidence}%
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => onReviewAction(act)}
                  className="inline-flex items-center gap-1 py-2 text-xs font-medium text-stamp hover:text-stamp-deep hover:underline cursor-pointer"
                >
                  <span>
                    {act.flagged
                      ? act.status === "overridden"
                        ? t("Overridden (Logged)", "Dibatalkan (Tercatat)")
                        : t("Authorized (Logged)", "Disetujui (Tercatat)")
                      : t("Review & Decide", "Tinjau & Putuskan")}
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
