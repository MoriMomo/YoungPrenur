"use client";

import React from "react";
import { RiskItem } from "@/types";
import { AlertCircle, Activity, TrendingUp, AlertTriangle } from "lucide-react";

interface RisksMonitorProps {
  risks: RiskItem[];
  onSeeAllToast?: () => void;
}

export const RisksMonitor: React.FC<RisksMonitorProps> = ({ risks, onSeeAllToast }) => {
  const getBadgeClass = (badgeClass: RiskItem["badgeClass"]) => {
    switch (badgeClass) {
      case "red":
        return "bg-[#fee2e2] text-[#dc2626] border border-[#fecaca]";
      case "warn":
        return "bg-[#fef3c7] text-[#d97706] border border-[#fde68a]";
      case "lower":
      default:
        return "bg-[#e6f7f0] text-[#0d9263] border border-[#a7f3d0]";
    }
  };

  const getSymbolIcon = (type: "risk" | "opportunity", symbol: string) => {
    if (type === "opportunity") {
      return (
        <div className="w-8 h-8 rounded-lg bg-[#e6f7f0] text-[#0d9263] flex items-center justify-center shrink-0">
          <TrendingUp className="w-4 h-4" />
        </div>
      );
    }
    if (symbol === "⌁") {
      return (
        <div className="w-8 h-8 rounded-lg bg-[#fef3c7] text-[#d97706] flex items-center justify-center shrink-0">
          <Activity className="w-4 h-4" />
        </div>
      );
    }
    return (
      <div className="w-8 h-8 rounded-lg bg-[#fee2e2] text-[#dc2626] flex items-center justify-center shrink-0">
        <AlertTriangle className="w-4 h-4" />
      </div>
    );
  };

  return (
    <div className="bg-white rounded-xl border border-[#e2eaf3] p-5 shadow-[0_2px_8px_rgba(12,26,45,0.04)] hover:shadow-[0_4px_16px_rgba(12,26,45,0.06)] transition-all">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-bold text-[#101e30] tracking-tight">
            Early Warning Risks & Opportunity Register
          </h2>
          <p className="text-xs text-[#536780]">
            Proactive signals detected across supplier lead times, machine telemetry, and milestone variance.
          </p>
        </div>
        <button
          onClick={onSeeAllToast}
          className="text-xs font-semibold text-[#2563eb] hover:underline cursor-pointer"
        >
          See all →
        </button>
      </div>

      {/* Rows */}
      <div className="space-y-3">
        {risks.map((item) => (
          <div
            key={item.id}
            className="flex items-start gap-3 p-3 rounded-xl border border-[#e2eaf3] hover:border-[#cbd5e1] bg-[#fbfcfe] hover:bg-white transition-all shadow-[0_1px_3px_rgba(12,26,45,0.02)]"
          >
            {getSymbolIcon(item.type, item.symbol)}

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-xs font-bold text-[#101e30] tracking-tight truncate">
                  {item.title}
                </h3>
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0 ${getBadgeClass(
                    item.badgeClass
                  )}`}
                >
                  {item.badge}
                </span>
              </div>

              <p className="text-xs text-[#475569] mt-0.5 mb-1.5 leading-snug">
                {item.desc}
              </p>

              <div className="text-[11px] text-[#64748b] font-medium">
                Department: {item.dept}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
