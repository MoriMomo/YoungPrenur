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
        return "bg-[#dc2626]";
      case "warn":
        return "bg-[#d97706]";
      case "lower":
      default:
        return "bg-[#16a34a]";
    }
  };

  const getBadgeText = (badgeClass: RiskItem["badgeClass"]) => {
    switch (badgeClass) {
      case "red":
        return "text-[#dc2626]";
      case "warn":
        return "text-[#b45309]";
      case "lower":
      default:
        return "text-[#16a34a]";
    }
  };

  return (
    <div className="bg-white rounded-xl border border-[#e5e7eb] p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)] hover:border-[#d1d5db] transition-[border-color,background-color] duration-150">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-[15px] font-medium text-[#111827]">
            Early Warning Risks &amp; Opportunity Register
          </h2>
          <p className="text-xs text-[#64748b]">
            Proactive signals detected across supplier lead times, machine telemetry, and milestone variance.
          </p>
        </div>
        <button
          onClick={onSeeAllToast}
          className="text-xs font-medium text-[#2563eb] hover:underline cursor-pointer shrink-0"
        >
          See all →
        </button>
      </div>

      {/* Rows */}
      <div className="space-y-3">
        {risks.map((item) => (
          <div
            key={item.id}
            className="flex items-start gap-3 p-3 rounded-xl border border-[#e5e7eb] hover:border-[#d1d5db] bg-[#fafafa] hover:bg-white transition-[border-color,background-color] duration-150"
          >
            <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${getDotColor(item.badgeClass)}`} />

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-xs font-medium text-[#111827] truncate">
                  {item.title}
                </h3>
                <span
                  className={`text-[11px] font-mono-numbers font-medium shrink-0 ${getBadgeText(
                    item.badgeClass
                  )}`}
                >
                  {item.badge}
                </span>
              </div>

              <p className="text-xs text-[#4b5565] mt-0.5 mb-1.5 leading-snug">
                {item.desc}
              </p>

              <div className="text-[11px] text-[#64748b]">
                Department: {item.dept}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
