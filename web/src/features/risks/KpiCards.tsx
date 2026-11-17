"use client";

import React, { useEffect, useRef } from "react";
import { KpiItem } from "@/types";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";
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
          dotColor: "bg-[#dc2626]",
          trendText: "text-[#dc2626]",
        };
      case "warn":
        return {
          dotColor: "bg-[#d97706]",
          trendText: "text-[#d97706]",
        };
      case "normal":
      default:
        return {
          dotColor: "bg-[#16a34a]",
          trendText: "text-[#16a34a]",
        };
    }
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
            className="kpi-card-item bg-white p-5 rounded-xl border border-[#e5e7eb] shadow-[0_1px_2px_rgba(0,0,0,0.04)] hover:border-[#d1d5db] transition-[border-color,background-color] duration-150"
          >
            {/* Header: Title and 6px Status Dot */}
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-normal text-[#4b5565] truncate">
                {kpi.title}
              </span>
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${styling.dotColor}`} />
            </div>

            {/* Metric Value */}
            <div className="text-[28px] leading-none font-medium text-[#111827] font-mono-numbers tracking-tight my-2.5">
              {kpi.value}
            </div>

            {/* Trend & Context */}
            <div className="flex items-center gap-1.5 text-xs">
              <span className={`font-medium flex items-center gap-0.5 ${styling.trendText}`}>
                {isUp && <ArrowUpRight className="w-3.5 h-3.5 inline" strokeWidth={1.5} />}
                {isDown && <ArrowDownRight className="w-3.5 h-3.5 inline" strokeWidth={1.5} />}
                {kpi.trend.replace(/^[↑↓]\s*/, "")}
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
