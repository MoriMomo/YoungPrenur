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
import { ROLE_PRESETS, RISKS_AND_OPPORTUNITIES, PILOT_CHECKS } from "@/lib/mock-data";
import { downloadOperationalExport } from "@/lib/api";
import { Download, CalendarClock, CheckCircle2, Clock } from "lucide-react";
import gsap from "gsap";

export default function DashboardOverviewPage() {
  const {
    selectedRole,
    deploymentMode,
    actions,
    auditLog,
    setReviewingAction,
    showToast,
  } = useDashboard();

  const contentRef = useRef<HTMLDivElement>(null);
  const currentRolePreset = ROLE_PRESETS[selectedRole] || ROLE_PRESETS["Operations Manager"];

  useEffect(() => {
    if (contentRef.current) {
      gsap.fromTo(
        contentRef.current,
        { opacity: 0.4, y: 6 },
        { opacity: 1, y: 0, duration: 0.25, ease: "power2.out" }
      );
    }
  }, [selectedRole]);

  // Prioritize actions matching the active role's department first
  const sortedActions = [...actions].sort((a, b) => {
    const aMatch = a.department === currentRolePreset.priorityDepartment ? 0 : 1;
    const bMatch = b.department === currentRolePreset.priorityDepartment ? 0 : 1;
    return aMatch - bMatch;
  });

  const handleExportSummary = () => {
    downloadOperationalExport(selectedRole, actions, auditLog);
    showToast(`Exported operational brief (.txt) for ${selectedRole}.`);
  };

  return (
    <div ref={contentRef} className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-mono-numbers text-[#64748b] mb-1">
            MDIP Operations Cockpit · {currentRolePreset.buyingCenterRole} ·{" "}
            {deploymentMode === "internal" ? "On-Prem VPC (CAD Isolated)" : "Managed SaaS"}
          </div>
          <h1 className="text-2xl font-medium text-[#111827] tracking-tight">
            {currentRolePreset.title}
          </h1>
          <p className="text-xs sm:text-sm text-[#4b5565] mt-0.5">{currentRolePreset.sub}</p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={handleExportSummary}
            className="h-9 flex items-center gap-1.5 px-3.5 bg-white hover:bg-[#f9fafb] text-[#374151] border border-[#e5e7eb] rounded-lg text-xs sm:text-sm font-medium transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4 text-[#64748b]" strokeWidth={1.5} />
            <span>Export Brief (.txt)</span>
          </button>

          <Link
            href="/dashboard/scheduler"
            className="h-9 flex items-center gap-1.5 px-4 bg-[#111827] hover:bg-[#1f2937] text-white rounded-lg text-xs sm:text-sm font-medium transition-colors"
          >
            <CalendarClock className="w-4 h-4 text-[#9ca3af]" strokeWidth={1.5} />
            <span>Open WBS Schedule</span>
          </Link>
        </div>
      </div>

      {/* 4 Role KPI Cards */}
      <KpiCards kpis={currentRolePreset.kpis} />

      {/* Primary Analytics Grid: Operational Chart + Role-Sorted Decision Brief */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-7">
          <PerformanceChart />
        </div>
        <div className="lg:col-span-5">
          <DecisionBrief
            actions={sortedActions}
            priorityDepartment={currentRolePreset.priorityDepartment}
            onReviewAction={(act) => setReviewingAction(act)}
          />
        </div>
      </div>

      {/* Shop-Floor Work Centers & Risk Monitor */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-7">
          <ProductionLineStatus
            onSelectLine={(line) => {
              showToast(`Opening IRoom Operation Tracker for ${line.name}`);
            }}
          />
        </div>
        <div className="lg:col-span-5">
          <RisksMonitor
            risks={RISKS_AND_OPPORTUNITIES}
            onSeeAllToast={() => showToast("Viewing active cross-module risk register")}
          />
        </div>
      </div>

      {/* HITL Audit Trail & Pilot Validation Checks (ISO 9001 Cl. 7.5 + BMC Table VI) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Audit Log */}
        <div className="lg:col-span-6 bg-white rounded-xl border border-[#e5e7eb] p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)] space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-[15px] font-medium text-[#111827]">
                Human-in-the-Loop Decision Audit Log
              </h2>
              <p className="text-xs text-[#64748b]">
                ISO 9001 Cl. 7.5 / AS9100D record control for accepted and overridden changes
              </p>
            </div>
            <span className="font-mono-numbers text-xs text-[#64748b]">
              {auditLog.length} logged
            </span>
          </div>

          <div className="divide-y divide-[#f1f5f9] text-xs max-h-60 overflow-y-auto">
            {auditLog.map((entry) => (
              <div key={entry.id} className="py-2.5 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[11px] font-medium font-mono-numbers ${
                        entry.decision === "AUTHORIZED"
                          ? "bg-[#f0fdf4] text-[#16a34a]"
                          : "bg-[#fffbeb] text-[#b45309]"
                      }`}
                    >
                      {entry.decision}
                    </span>
                    <span className="font-medium text-[#111827] truncate">
                      {entry.actionTitle}
                    </span>
                  </div>
                  <p className="text-[#4b5565] mt-1">{entry.notes}</p>
                  <div className="text-[11px] text-[#64748b] mt-0.5 font-mono-numbers">
                    {entry.reviewerRole} · Ref:{" "}
                    <Link
                      href={`/dashboard/knowledge?doc=${encodeURIComponent(entry.sopRef)}`}
                      className="text-[#2563eb] hover:underline"
                    >
                      {entry.sopRef}
                    </Link>
                  </div>
                </div>
                <span className="text-[11px] font-mono-numbers text-[#64748b] shrink-0">
                  {entry.timestamp}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Pilot Validation Checks (BMC Table VI) */}
        <div className="lg:col-span-6 bg-white rounded-xl border border-[#e5e7eb] p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)] space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-[15px] font-medium text-[#111827]">
                TRL 4 → TRL 6 Pilot Validation Checklist (BMC Table VI)
              </h2>
              <p className="text-xs text-[#64748b]">
                Benchmarking criteria for the planned 8-week IMAJIN pilot &amp; n=15 user evaluation
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
            {PILOT_CHECKS.map((chk) => (
              <div
                key={chk.id}
                className="p-2.5 rounded-lg bg-[#fafafa] border border-[#e5e7eb] space-y-1"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-[#111827] truncate">{chk.check}</span>
                  {chk.status === "pass" ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#16a34a] shrink-0" strokeWidth={1.5} />
                  ) : (
                    <Clock className="w-3.5 h-3.5 text-[#d97706] shrink-0" strokeWidth={1.5} />
                  )}
                </div>
                <div className="text-[11px] text-[#4b5565]">Target: {chk.target}</div>
                <div className="text-[11px] font-mono-numbers text-[#2563eb]">
                  Status: {chk.currentSim}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <DisclaimerBanner />
    </div>
  );
}
