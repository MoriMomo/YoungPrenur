"use client";

import React from "react";
import { RiskItem } from "@/types";

interface RisksMonitorProps {
  risks: RiskItem[];
  onSeeAllToast?: () => void;
}

export const RisksMonitor: React.FC<RisksMonitorProps> = ({ risks, onSeeAllToast }) => {
  const getDotColor = (badgeClass: RiskItem["badgeClass"]) => {
    switch (badgeClass) {
      case "red":
        return "bg-hold";
      case "warn":
        return "bg-warn";
      case "lower":
      default:
        return "bg-pass";
    }
  };

  const getBadgeText = (badgeClass: RiskItem["badgeClass"]) => {
    switch (badgeClass) {
      case "red":
        return "text-hold";
      case "warn":
        return "text-warn";
      case "lower":
      default:
        return "text-pass";
    }
  };

  return (
    <div className="bg-sheet border border-rule-strong p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-display text-[20px] font-bold leading-tight text-ink">
            Early Warning Risks &amp; Opportunity Register
          </h2>
          <p className="text-xs text-ink-3">
            Proactive signals detected across supplier lead times, machine telemetry, and milestone variance
          </p>
        </div>
        <button
          onClick={onSeeAllToast}
          className="py-2 text-xs font-medium text-stamp hover:underline cursor-pointer shrink-0 sm:py-0"
        >
          Inspect schedule →
        </button>
      </div>

      {/* Rows */}
      <div className="space-y-3">
        {risks.map((item) => (
          <div
            key={item.id}
            className="flex items-start gap-3 p-3 rounded-xl border border-rule hover:border-rule-strong bg-sheet hover:bg-white transition-[border-color,background-color] duration-150"
          >
            <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${getDotColor(item.badgeClass)}`} />

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-xs font-medium text-ink truncate">
                  {item.title}
                </h3>
                <span
                  className={`text-xs font-mono-numbers font-medium shrink-0 ${getBadgeText(
                    item.badgeClass
                  )}`}
                >
                  {item.badge}
                </span>
              </div>

              <p className="text-xs text-ink-2 mt-0.5 mb-1.5 leading-snug">
                {item.desc}
              </p>

              <div className="text-xs text-ink-3">
                Department: {item.dept}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
