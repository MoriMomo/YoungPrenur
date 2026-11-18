"use client";

import React, { useState } from "react";
import { WbsTask } from "@/types";
import { AlertTriangle, Zap } from "lucide-react";

interface GanttTimelineProps {
  tasks: WbsTask[];
  /** Project-level delay probability (%) from the active analysis. */
  baseRisk?: number;
  /** Project-level P50 slippage (days) from the active analysis. */
  baseSlipDays?: number;
}

export const GanttTimeline: React.FC<GanttTimelineProps> = ({ tasks, baseRisk = 65.2, baseSlipDays = 3.5 }) => {
  const [simulatedSlipDays, setSimulatedSlipDays] = useState<number>(0);
  const [hoveredCode, setHoveredCode] = useState<string | null>(null);

  const effectiveTasks = tasks.map((task) => {
    const slipAddition = task.critical ? simulatedSlipDays : 0;
    const effectiveActual = task.actualDays + slipAddition;
    return {
      ...task,
      effectiveActual,
      additionalSlip: slipAddition,
    };
  });

  const horizonDays = Math.max(
    28,
    ...effectiveTasks.map((t) => (t.startDay || 0) + t.effectiveActual + (t.floatDays || 0))
  );

  // IDR contractual SLA exposure: Rp 15.000.000 / day for critical path slippage
  const todayDay = 9;
  const todayPct = Math.min(100, (todayDay / horizonDays) * 100);
  // What-if: injected critical-path slip adds directly to the model's P50 slippage;
  // risk is a linear what-if approximation on top of the model's Monte Carlo baseline.
  const totalSlippageDays = +(baseSlipDays + simulatedSlipDays).toFixed(1);
  const slaPenaltyIdrMillions = +(totalSlippageDays * 15).toFixed(1);
  const delayRiskProbability = Math.min(99.4, +(baseRisk + simulatedSlipDays * 4.8).toFixed(1));

  return (
    <div className="bg-white rounded-xl border border-[#e2eaf3] p-5 sm:p-6 space-y-5">
      {/* Header & Legend */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-[#f1f5f9]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-[#eff6ff] text-[#2563eb] border border-[#dbeafe]">
              Time-Phased WBS Critical Path
            </span>
            <span className="text-[11px] text-[#64748b] font-medium">
              CPM + XGBoost Delay-Risk
            </span>
          </div>
          <h2 className="text-base sm:text-lg font-semibold text-[#101e30] tracking-tight">
            Time-Phased Gantt Schedule &amp; What-If Slippage Simulator
          </h2>
          <p className="text-xs text-[#536780]">
            Tasks are staggered by start day across Weeks 1 to 4 with float buffers and critical-path cascades.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-[11px] text-[#64748b] shrink-0">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-2 rounded-xs bg-[#cbd5e1]" />
            <span>Planned</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-2 rounded-xs bg-[#2563eb]" />
            <span>On Track</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-2 rounded-xs bg-[#dc2626]" />
            <span>Critical Slip</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span
              className="w-3 h-2 rounded-xs border border-[#94a3b8]"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(45deg, #cbd5e1, #cbd5e1 2px, transparent 2px, transparent 4px)",
              }}
            />
            <span>Float / Sim Buffer</span>
          </div>
        </div>
      </div>

      {/* What-If Simulator Controls */}
      <div className="p-4 rounded-xl bg-[#0c1a2d] text-white border border-[#234268]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex-1 space-y-2">
            <div className="flex items-center justify-between">
              <label
                htmlFor="slippage-slider"
                className="text-xs font-medium text-[#93c5fd] flex items-center gap-2"
              >
                <Zap className="w-3.5 h-3.5 text-[#38bdf8]" strokeWidth={1.5} />
                <span>Simulate Upstream Bottleneck: Raw Material (AL7075-T6) Delay</span>
              </label>
              <span className="font-mono-numbers text-xs font-medium px-2.5 py-0.5 rounded bg-[#2563eb] text-white">
                +{simulatedSlipDays} Days Slip
              </span>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-[11px] text-[#94a3b8] font-mono-numbers font-medium">
                0d (Baseline)
              </span>
              <input
                id="slippage-slider"
                type="range"
                min="0"
                max="7"
                step="1"
                value={simulatedSlipDays}
                onChange={(e) => setSimulatedSlipDays(parseInt(e.target.value, 10))}
                className="flex-1 h-2 bg-[#1e3450] rounded-lg appearance-none cursor-pointer accent-[#38bdf8]"
              />
              <span className="text-[11px] text-[#f87171] font-mono-numbers font-medium">
                +7d (Severe)
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px]">
              <span className="text-[#94a3b8]">Scenarios:</span>
              {[
                { label: "0d Baseline", val: 0 },
                { label: "+2d Mill Plate", val: 2 },
                { label: "+4d CAD Revision", val: 4 },
                { label: "+7d Vendor Failure", val: 7 },
              ].map((preset) => (
                <button
                  key={preset.val}
                  type="button"
                  onClick={() => setSimulatedSlipDays(preset.val)}
                  className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                    simulatedSlipDays === preset.val
                      ? "bg-[#2563eb] text-white font-medium"
                      : "bg-[#1e3450] text-[#cad8e8] hover:text-white"
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5 sm:w-72 shrink-0 border-t md:border-t-0 md:border-l border-[#244365] pt-3 md:pt-0 md:pl-4">
            <div className="p-2.5 rounded-lg bg-[#081220] border border-[#1f3a58]">
              <div className="text-[11px] text-[#94a3b8] font-medium">
                Cumulative Slippage
              </div>
              <div className="text-base sm:text-lg font-mono-numbers font-semibold text-[#f87171]">
                +{totalSlippageDays}d
              </div>
              <div className="text-[10px] text-[#94a3b8] font-mono-numbers">
                What-if Risk: {delayRiskProbability}%
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-[#081220] border border-[#1f3a58]">
              <div className="text-[11px] text-[#94a3b8] font-medium">
                SLA Penalty Risk
              </div>
              <div className="text-base sm:text-lg font-mono-numbers font-semibold text-[#fbbf24]">
                Rp {slaPenaltyIdrMillions}M
              </div>
              <div className="text-[10px] text-[#94a3b8] font-mono-numbers">
                Rate: Rp 15M/day
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Time-Phased Gantt Grid */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between text-[11px] font-semibold text-[#64748b] px-1 pt-1 border-b border-[#e2eaf3] pb-1.5">
          <span className="w-44 sm:w-64 shrink-0 text-left">WBS Work Package</span>
          <div className="flex-1 grid grid-cols-4 text-center font-mono-numbers">
            <span className="border-l border-[#e2e8f0]">Week 1 (D1-D7)</span>
            <span className="border-l border-[#e2e8f0]">Week 2 (D8-D14)</span>
            <span className="border-l border-[#e2e8f0]">Week 3 (D15-D21)</span>
            <span className="border-l border-[#e2e8f0]">Week 4 (D22-D{horizonDays})</span>
          </div>
          <span className="w-28 sm:w-36 shrink-0 text-right">Duration / Slip</span>
        </div>

        <div className="relative space-y-2">
          {/* Today Cursor Overlay across timeline area */}
          <div className="hidden sm:block absolute top-0 bottom-0 left-64 right-36 pointer-events-none z-20">
            <div
              className="absolute top-0 bottom-0 w-px bg-[#dc2626]/70"
              style={{ left: `${todayPct}%` }}
            >
              <span className="absolute -top-5 -translate-x-1/2 px-1.5 py-0.5 rounded bg-[#dc2626] text-white text-[10px] font-mono-numbers font-medium whitespace-nowrap">
                Today (D{todayDay})
              </span>
            </div>
          </div>

          {effectiveTasks.map((task) => {
            const startDay = task.startDay || 0;
            const leftPct = (startDay / horizonDays) * 100;
            const plannedPct = (task.plannedDays / horizonDays) * 100;
            const actualPct = (task.effectiveActual / horizonDays) * 100;
            const floatPct = ((task.floatDays || 0) / horizonDays) * 100;
            const isDelayed = task.effectiveActual > task.plannedDays;
            const varianceDays = task.effectiveActual - task.plannedDays;

            return (
              <div
                key={task.code}
                onMouseEnter={() => setHoveredCode(task.code)}
                onMouseLeave={() => setHoveredCode(null)}
                className={`p-2.5 rounded-xl border transition-colors relative ${
                  task.critical
                    ? "bg-[#fffbfa] border-[#fed7aa]"
                    : "bg-[#fafafa] border-[#e5e7eb]"
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  {/* Left: WBS Label */}
                  <div className="sm:w-64 shrink-0 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono-numbers px-1.5 py-0.5 rounded bg-[#111827] text-white font-medium text-[10px] shrink-0">
                        {task.code}
                      </span>
                      {task.critical && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-[#fef2f2] text-[#dc2626] border border-[#fecaca] inline-flex items-center gap-0.5 shrink-0">
                          <AlertTriangle className="w-2.5 h-2.5" strokeWidth={1.5} />
                          <span>CPM</span>
                        </span>
                      )}
                      {task.workCenter && (
                        <span className="text-[10px] text-[#64748b] truncate">
                          {task.workCenter}
                        </span>
                      )}
                    </div>
                    <div className="font-semibold text-xs text-[#101e30] truncate mt-0.5">
                      {task.task}
                    </div>
                  </div>

                  {/* Center: Staggered Time-Phased Track */}
                  <div className="flex-1 h-9 bg-white rounded-lg border border-[#e2e8f0] relative overflow-hidden">
                    <div className="absolute inset-0 grid grid-cols-4 pointer-events-none opacity-45">
                      <div className="border-r border-[#cbd5e1] border-dashed" />
                      <div className="border-r border-[#cbd5e1] border-dashed" />
                      <div className="border-r border-[#cbd5e1] border-dashed" />
                      <div />
                    </div>

                    {/* Planned baseline strip */}
                    <div
                      className="absolute top-1.5 h-2 bg-[#cbd5e1] rounded-xs"
                      style={{
                        left: `${leftPct}%`,
                        width: `${plannedPct}%`,
                      }}
                    />

                    {/* Actual / Forecast strip */}
                    <div
                      className={`absolute bottom-1.5 h-2.5 rounded-xs transition-[width] duration-200 ${
                        task.critical && task.additionalSlip > 0
                          ? "bg-[#9333ea]"
                          : task.critical && isDelayed
                          ? "bg-[#dc2626]"
                          : isDelayed
                          ? "bg-[#d97706]"
                          : "bg-[#2563eb]"
                      }`}
                      style={{
                        left: `${leftPct}%`,
                        width: `${actualPct}%`,
                      }}
                    />

                    {/* Float Buffer Hatch (for non-critical tasks) */}
                    {floatPct > 0 && (
                      <div
                        className="absolute bottom-1.5 h-2.5 rounded-r-xs border border-l-0 border-[#94a3b8]/70"
                        style={{
                          left: `${leftPct + actualPct}%`,
                          width: `${floatPct}%`,
                          backgroundImage:
                            "repeating-linear-gradient(45deg, #cbd5e1, #cbd5e1 3px, transparent 3px, transparent 6px)",
                        }}
                      />
                    )}

                    {/* Hover Inspection Chip */}
                    {hoveredCode === task.code && (
                      <div className="hidden md:flex items-center gap-2 absolute right-2 top-1/2 -translate-y-1/2 px-2 py-0.5 rounded bg-[#0c1a2d] text-white text-[10px] font-mono-numbers z-30 shadow-sm">
                        <span>
                          D{startDay + 1}-D{startDay + task.effectiveActual}
                        </span>
                        <span>·</span>
                        <span>Risk {(task.delayRisk * 100).toFixed(0)}%</span>
                      </div>
                    )}
                  </div>

                  {/* Right: Variance Summary */}
                  <div className="sm:w-36 shrink-0 font-mono-numbers text-[11px] text-[#475569] sm:text-right">
                    <span className="text-[#64748b]">{task.plannedDays}d</span>
                    <span className="mx-1">/</span>
                    <strong className="text-[#0f172a]">{task.effectiveActual}d</strong>
                    {isDelayed && (
                      <span
                        className={`ml-1 font-medium ${
                          task.critical ? "text-[#dc2626]" : "text-[#d97706]"
                        }`}
                      >
                        (+{varianceDays}d)
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
