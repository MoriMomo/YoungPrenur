"use client";

import React, { useRef, useEffect } from "react";
import Link from "next/link";
import { useDashboard } from "./layout";
import { KpiCards } from "@/features/risks/KpiCards";
import { DecisionBrief } from "@/features/risks/DecisionBrief";
import { RisksMonitor } from "@/features/risks/RisksMonitor";
import { PerformanceChart } from "@/features/dashboard/PerformanceChart";
import { ProductionLineStatus } from "@/features/dashboard/ProductionLineStatus";
import { DisclaimerBanner } from "@/components/layout/DisclaimerBanner";
import { ROLE_PRESETS, RISKS_AND_OPPORTUNITIES } from "@/lib/mock-data";
import { downloadOperationalExport } from "@/lib/api";
import { Sparkles, Download, CalendarClock, ArrowRight, Layers } from "lucide-react";
import gsap from "gsap";

export default function DashboardOverviewPage() {
  const {
    selectedRole,
    actions,
    setReviewingAction,
    openCopilot,
    showToast
  } = useDashboard();

  const contentRef = useRef<HTMLDivElement>(null);
  const currentRolePreset = ROLE_PRESETS[selectedRole] || ROLE_PRESETS["Operations Manager"];

  useEffect(() => {
    if (contentRef.current) {
      gsap.fromTo(
        contentRef.current,
        { opacity: 0, y: 10 },
        { opacity: 1, y: 0, duration: 0.35, ease: "power2.out" }
      );
    }
  }, [selectedRole]);

  const handleExportSummary = () => {
    downloadOperationalExport(selectedRole);
    showToast(`Operational brief exported for ${selectedRole}.`);
  };

  return (
    <div ref={contentRef} className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-[11px] font-bold text-[#2563eb] uppercase tracking-widest mb-1">
            Manufacturing Decision Intelligence · Live Cockpit
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#101e30] tracking-tight">
            {currentRolePreset.title}
          </h1>
          <p className="text-xs sm:text-sm text-[#536780]">
            {currentRolePreset.sub}
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            onClick={handleExportSummary}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-[#f8fafc] text-[#334155] border border-[#cbd5e1] rounded-xl text-xs sm:text-sm font-semibold shadow-sm transition cursor-pointer"
          >
            <Download className="w-4 h-4 text-[#64748b]" />
            <span>Export Summary</span>
          </button>

          <button
            onClick={openCopilot}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded-xl text-xs sm:text-sm font-semibold shadow-sm hover:shadow-md transition cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            <span>Ask Manufacturing AI</span>
          </button>
        </div>
      </div>

      {/* 4 Dynamic Role KPI Cards */}
      <KpiCards kpis={currentRolePreset.kpis} />

      {/* Primary Analytics Grid: Operational Performance + AI Decision Brief */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-7">
          <PerformanceChart />
        </div>
        <div className="lg:col-span-5">
          <DecisionBrief
            actions={actions}
            onReviewAction={(act) => setReviewingAction(act)}
          />
        </div>
      </div>

      {/* Quick Access Dual Hub: WBS Scheduler & IRoom Telemetry */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Hub Card 1: WBS Scheduler */}
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-[#0c1a2d] to-[#142842] border border-[#1e3450] text-white flex items-center justify-between gap-4 shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#06b6d4] to-[#2563eb] flex items-center justify-center font-bold text-white shrink-0">
              <CalendarClock className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="text-sm font-bold tracking-tight">
                AI Project Scheduler & WBS
              </div>
              <div className="text-xs text-[#9cb5ce]">
                CPM deviation tracking · <strong>3.5d delay risk</strong> detected
              </div>
            </div>
          </div>
          <Link
            href="/dashboard/scheduler"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-xs font-semibold shadow-sm transition whitespace-nowrap"
          >
            <span>Open WBS</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Hub Card 2: IRoom System Hub */}
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-[#102238] to-[#1b354f] border border-[#2b4865] text-white flex items-center justify-between gap-4 shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#38bdf8] to-[#0284c7] flex items-center justify-center font-bold text-white shrink-0">
              <Layers className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="text-sm font-bold tracking-tight">
                IRoom System Telemetry (5 Streams)
              </div>
              <div className="text-xs text-[#9cb5ce]">
                Materials, Progress, Drawings, POs & Operations
              </div>
            </div>
          </div>
          <Link
            href="/dashboard/iroom"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0284c7] hover:bg-[#0369a1] text-white text-xs font-semibold shadow-sm transition whitespace-nowrap"
          >
            <span>Open IRoom</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Secondary Operations Grid: Production Line Status + Risks & Opportunities */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-7">
          <ProductionLineStatus
            onSelectLine={(line) => {
              showToast(`Selected line ${line.name} for deep telemetry review.`);
            }}
          />
        </div>
        <div className="lg:col-span-5">
          <RisksMonitor
            risks={RISKS_AND_OPPORTUNITIES}
            onSeeAllToast={() => showToast("Opening full cross-module risk register")}
          />
        </div>
      </div>

      {/* Disclaimer Banner */}
      <DisclaimerBanner />
    </div>
  );
}
