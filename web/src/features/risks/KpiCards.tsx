"use client";

import React, { useEffect, useRef } from "react";
import { KpiItem } from "@/types";
import { ArrowUpRight, ArrowDownRight, Activity, Layers, CheckCircle2, Flag } from "lucide-react";
import gsap from "gsap";

interface KpiCardsProps {
  kpis: KpiItem[];
}

export const KpiCards: React.FC<KpiCardsProps> = ({ kpis }) => {
  const cardsContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!cardsContainerRef.current) return;
    const cards = cardsContainerRef.current.querySelectorAll(".kpi-card-item");

    gsap.fromTo(
      cards,
      { opacity: 0, y: 14 },
      {
        opacity: 1,
        y: 0,
        duration: 0.45,
        stagger: 0.08,
        ease: "power2.out",
      }
    );
  }, [kpis]);

  const getStatusClasses = (status: "normal" | "warn" | "alert") => {
    switch (status) {
      case "alert":
        return {
          iconBg: "bg-[#fee2e2] text-[#dc2626]",
          trendText: "text-[#dc2626]",
          border: "border-l-4 border-l-[#dc2626]",
        };
      case "warn":
        return {
          iconBg: "bg-[#fef3c7] text-[#d97706]",
          trendText: "text-[#d97706]",
          border: "border-l-4 border-l-[#d97706]",
        };
      case "normal":
      default:
        return {
          iconBg: "bg-[#eff6ff] text-[#2563eb]",
          trendText: "text-[#16a34a]",
          border: "border-l-4 border-l-[#2563eb]",
        };
    }
  };

  const renderIcon = (iconStr: string, status: "normal" | "warn" | "alert") => {
    if (status === "alert") return <Flag className="w-4 h-4" />;
    if (status === "warn") return <Activity className="w-4 h-4" />;
    if (iconStr === "✓") return <CheckCircle2 className="w-4 h-4" />;
    return <Layers className="w-4 h-4" />;
  };

  return (
    <div
      ref={cardsContainerRef}
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
    >
      {kpis.map((kpi, idx) => {
        const styling = getStatusClasses(kpi.status);
        const isUp = kpi.trend.includes("↑");
        const isDown = kpi.trend.includes("↓");

        return (
          <div
            key={`${kpi.title}-${idx}`}
            className={`kpi-card-item bg-white p-4 sm:p-5 rounded-xl border border-[#e2eaf3] ${styling.border} shadow-[0_2px_8px_rgba(12,26,45,0.04)] hover:shadow-[0_6px_20px_rgba(12,26,45,0.08)] transition-all`}
          >
            {/* Header: Title and Icon */}
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-[#536780] tracking-tight uppercase">
                {kpi.title}
              </span>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${styling.iconBg}`}>
                {renderIcon(kpi.icon, kpi.status)}
              </div>
            </div>

            {/* Metric Value */}
            <div className="text-2xl sm:text-3xl font-extrabold text-[#101e30] font-mono-numbers tracking-tight mb-2">
              {kpi.value}
            </div>

            {/* Trend & Context */}
            <div className="flex items-center gap-1.5 text-xs">
              <span className={`font-semibold flex items-center gap-0.5 ${styling.trendText}`}>
                {isUp && <ArrowUpRight className="w-3.5 h-3.5 inline" />}
                {isDown && <ArrowDownRight className="w-3.5 h-3.5 inline" />}
                {kpi.trend}
              </span>
              {kpi.subtle && (
                <span className="text-[#64748b] truncate">{kpi.subtle}</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
