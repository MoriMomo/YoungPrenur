"use client";

import React, { useState } from "react";
import { WbsTask } from "@/types";
import { Clock, AlertTriangle, Play, RefreshCw, Zap, DollarSign, ShieldAlert } from "lucide-react";

interface GanttTimelineProps {
  tasks: WbsTask[];
}

export const GanttTimeline: React.FC<GanttTimelineProps> = ({ tasks }) => {
  const [simulatedSlipDays, setSimulatedSlipDays] = useState<number>(0);

  // Compute effective max duration based on simulation
  const effectiveTasks = tasks.map((task) => {
    // Upstream slippage cascades to critical path tasks
    const slipAddition = task.critical ? simulatedSlipDays : 0;
    const effectiveActual = task.actualDays + slipAddition;
    return {
      ...task,
      effectiveActual,
      additionalSlip: slipAddition,
    };
  });

  const maxDays = Math.max(
    ...effectiveTasks.map((t) => Math.max(t.plannedDays, t.effectiveActual)),
    24
  );

  // SLA Financial Exposure: $4,500/day for critical path delay beyond contractual baseline
  const totalSlippageDays = +(3.5 + simulatedSlipDays).toFixed(1);
  const slaPenaltyExposure = Math.round(totalSlippageDays * 4500);
  const delayRiskProbability = Math.min(99.4, +(65.2 + simulatedSlipDays * 4.8).toFixed(1));

  const getRiskColor = (slip: number) => {
    if (slip === 0) return { bg: "bg-[#fff7ed]", text: "text-[#c2410c]", border: "border-[#ffedd5]", badge: "bg-[#f97316]" };
    if (slip <= 3) return { bg: "bg-[#fef2f2]", text: "text-[#dc2626]", border: "border-[#fee2e2]", badge: "bg-[#ef4444]" };
    return { bg: "bg-[#450a0a]", text: "text-[#fca5a5]", border: "border-[#7f1d1d]", badge: "bg-[#dc2626]" };
  };

  const riskStyle = getRiskColor(simulatedSlipDays);

  return (
    <div className="bg-white rounded-2xl border border-[#e2eaf3] p-5 sm:p-6 shadow-[0_4px_20px_rgba(12,26,45,0.06)] space-y-5">
      {/* 1. Header & Live What-If Simulator Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-[#f1f5f9]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#eff6ff] text-[#2563eb] border border-[#dbeafe] uppercase tracking-wider">
              WBS Critical Path Engine
            </span>
            <span className="text-[11px] text-[#64748b] font-medium">
              ISO/AS9100 Schedule Standard
            </span>
          </div>
          <h2 className="text-base sm:text-lg font-extrabold text-[#101e30] tracking-tight">
            Critical Path &amp; What-If Milestone Simulator
          </h2>
          <p className="text-xs text-[#536780]">
            Simulate upstream material or vendor bottlenecks and observe real-time schedule cascades across WBS work packages.
          </p>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-3 text-[11px] text-[#64748b] shrink-0">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-2 rounded-sm bg-[#cbd5e1]" />
            <span>Planned</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-2 rounded-sm bg-[#2563eb]" />
            <span>On Track</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-2 rounded-sm bg-[#dc2626]" />
            <span>Critical Path Slippage</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-2 rounded-sm bg-[#a855f7]" />
            <span>Simulated Cascade</span>
          </div>
        </div>
      </div>

      {/* 2. Interactive What-If Slippage Control Console */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-[#0c1a2d] to-[#162a42] text-white border border-[#234268] shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex-1 space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="slippage-slider" className="text-xs font-bold text-[#93c5fd] flex items-center gap-2">
                <Zap className="w-3.5 h-3.5 text-[#38bdf8]" />
                <span>Simulate Upstream Bottleneck: Raw Material (AL7075-T6) Delay</span>
              </label>
              <span className="font-mono-numbers text-xs font-extrabold px-2.5 py-0.5 rounded bg-[#2563eb] text-white shadow-sm">
                +{simulatedSlipDays} Days Slip
              </span>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-[10px] text-[#64748b] font-mono-numbers font-bold">0d (Baseline)</span>
              <input
                id="slippage-slider"
                type="range"
                min="0"
                max="7"
                step="1"
                value={simulatedSlipDays}
                onChange={(e) => setSimulatedSlipDays(parseInt(e.target.value, 10))}
                className="flex-1 h-2 bg-[#1e3450] rounded-lg appearance-none cursor-pointer accent-[#38bdf8] focus:outline-none"
              />
              <span className="text-[10px] text-[#f87171] font-mono-numbers font-bold">+7d (Severe)</span>
            </div>

            {/* Quick preset buttons */}
            <div className="flex items-center gap-2 pt-1 text-[10px]">
              <span className="text-[#64748b]">Presets:</span>
              <button
                type="button"
                onClick={() => setSimulatedSlipDays(0)}
                className={`px-2 py-0.5 rounded transition ${
                  simulatedSlipDays === 0
                    ? "bg-[#38bdf8] text-[#0c1a2d] font-bold"
                    : "bg-[#1e3450] text-[#94a3b8] hover:text-white"
                }`}
              >
                0d Baseline
              </button>
              <button
                type="button"
                onClick={() => setSimulatedSlipDays(2)}
                className={`px-2 py-0.5 rounded transition ${
                  simulatedSlipDays === 2
                    ? "bg-[#38bdf8] text-[#0c1a2d] font-bold"
                    : "bg-[#1e3450] text-[#94a3b8] hover:text-white"
                }`}
              >
                +2d Mill Plate
              </button>
              <button
                type="button"
                onClick={() => setSimulatedSlipDays(4)}
                className={`px-2 py-0.5 rounded transition ${
                  simulatedSlipDays === 4
                    ? "bg-[#f59e0b] text-[#0c1a2d] font-bold"
                    : "bg-[#1e3450] text-[#94a3b8] hover:text-white"
                }`}
              >
                +4d CAD Revision
              </button>
              <button
                type="button"
                onClick={() => setSimulatedSlipDays(7)}
                className={`px-2 py-0.5 rounded transition ${
                  simulatedSlipDays === 7
                    ? "bg-[#ef4444] text-white font-bold"
                    : "bg-[#1e3450] text-[#94a3b8] hover:text-white"
                }`}
              >
                +7d Vendor Failure
              </button>
            </div>
          </div>

          {/* Dynamic KPI Exposure HUD */}
          <div className="grid grid-cols-2 gap-2.5 sm:w-72 shrink-0 border-t md:border-t-0 md:border-l border-[#244365] pt-3 md:pt-0 md:pl-4">
            <div className="p-2.5 rounded-lg bg-[#0c1a2d]/70 border border-[#1f3a58]">
              <div className="text-[10px] text-[#94a3b8] font-medium uppercase">Cumulative Slippage</div>
              <div className="text-base sm:text-lg font-mono-numbers font-extrabold text-[#f87171] flex items-center gap-1">
                <span>+{totalSlippageDays}d</span>
                {simulatedSlipDays > 0 && (
                  <span className="text-[10px] font-bold text-[#c084fc] animate-pulse">
                    (+{simulatedSlipDays}d sim)
                  </span>
                )}
              </div>
              <div className="text-[10px] text-[#64748b]">Risk: {delayRiskProbability}%</div>
            </div>

            <div className="p-2.5 rounded-lg bg-[#0c1a2d]/70 border border-[#1f3a58]">
              <div className="text-[10px] text-[#94a3b8] font-medium uppercase">SLA Penalty Risk</div>
              <div className="text-base sm:text-lg font-mono-numbers font-extrabold text-[#fbbf24] flex items-center gap-1">
                <span>${slaPenaltyExposure.toLocaleString()}</span>
              </div>
              <div className="text-[10px] text-[#64748b]">Rate: $4,500/day</div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Gantt Timeline Viewport with Weeks Grid Header */}
      <div className="space-y-3">
        {/* Weekly Header Scale */}
        <div className="flex items-center justify-between text-[10px] font-bold text-[#64748b] uppercase tracking-wider px-1 pt-1 border-b border-[#e2eaf3] pb-1.5">
          <span className="w-48 sm:w-64 shrink-0 text-left">WBS Work Package</span>
          <div className="flex-1 grid grid-cols-4 text-center font-mono-numbers">
            <span className="border-l border-[#e2e8f0]">Week 1 (D1-D6)</span>
            <span className="border-l border-[#e2e8f0]">Week 2 (D7-D12)</span>
            <span className="border-l border-[#e2e8f0]">Week 3 (D13-D18)</span>
            <span className="border-l border-[#e2e8f0]">Week 4 (D19-D24+)</span>
          </div>
          <span className="w-36 sm:w-44 shrink-0 text-right">Variance Impact</span>
        </div>

        {/* Task Rows */}
        <div className="space-y-3">
          {effectiveTasks.map((task) => {
            const plannedPct = Math.min(100, (task.plannedDays / maxDays) * 100);
            const actualPct = Math.min(100, (task.effectiveActual / maxDays) * 100);
            const isDelayed = task.effectiveActual > task.plannedDays;
            const varianceDays = task.effectiveActual - task.plannedDays;

            return (
              <div
                key={task.code}
                className={`p-2.5 rounded-xl border transition-all ${
                  task.critical
                    ? "bg-[#fffbfa] border-[#fed7aa] hover:border-[#f97316]"
                    : "bg-[#f8fafc] border-[#e2eaf3] hover:border-[#cbd5e1]"
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-mono-numbers px-1.5 py-0.5 rounded bg-[#0c1a2d] text-white font-bold text-[10px] shrink-0">
                      {task.code}
                    </span>
                    <span className="font-bold text-xs text-[#101e30] truncate">
                      {task.task}
                    </span>
                    {task.critical && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-[#fee2e2] text-[#dc2626] border border-[#fecaca] shrink-0 flex items-center gap-1">
                        <AlertTriangle className="w-2.5 h-2.5" />
                        <span>CRITICAL PATH</span>
                      </span>
                    )}
                  </div>

                  <div className="font-mono-numbers text-[11px] text-[#475569] shrink-0">
                    <span className="text-[#64748b]">{task.plannedDays}d plan</span>
                    <span className="mx-1">/</span>
                    <strong className="text-[#0f172a]">{task.effectiveActual}d forecast</strong>
                    {isDelayed && (
                      <span
                        className={`ml-1.5 font-extrabold ${
                          task.critical ? "text-[#dc2626]" : "text-[#d97706]"
                        }`}
                      >
                        (+{varianceDays}d)
                      </span>
                    )}
                    {task.additionalSlip > 0 && (
                      <span className="ml-1 text-[10px] font-bold text-[#9333ea]">
                        [+{task.additionalSlip}d sim]
                      </span>
                    )}
                  </div>
                </div>

                {/* Dual Stacked Gantt Bar with Grid Lines */}
                <div className="h-6 w-full bg-white rounded-lg p-1 relative border border-[#e2e8f0] overflow-hidden flex flex-col justify-center gap-0.5">
                  {/* Subtle Background 4-Column Grid Guide */}
                  <div className="absolute inset-0 grid grid-cols-4 pointer-events-none opacity-40">
                    <div className="border-r border-[#cbd5e1] border-dashed" />
                    <div className="border-r border-[#cbd5e1] border-dashed" />
                    <div className="border-r border-[#cbd5e1] border-dashed" />
                    <div />
                  </div>

                  {/* Planned Baseline Bar */}
                  <div
                    className="h-1.5 bg-[#cbd5e1] rounded-sm transition-all duration-300 relative z-10"
                    style={{ width: `${plannedPct}%` }}
                    title={`Planned baseline: ${task.plannedDays} days`}
                  />

                  {/* Actual Forecast Bar (Dynamically Shifts upon Simulation) */}
                  <div
                    className={`h-2 rounded-sm transition-all duration-300 ease-out relative z-10 shadow-sm ${
                      task.critical && task.additionalSlip > 0
                        ? "bg-gradient-to-r from-[#dc2626] to-[#a855f7]"
                        : task.critical && isDelayed
                        ? "bg-[#dc2626]"
                        : isDelayed
                        ? "bg-[#f59e0b]"
                        : "bg-[#2563eb]"
                    }`}
                    style={{ width: `${actualPct}%` }}
                    title={`Actual / Forecast: ${task.effectiveActual} days`}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
