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

export const GanttTimeline: React.FC<GanttTimelineProps> = ({ tasks, baseRisk = 0, baseSlipDays = 0 }) => {
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

  const horizonDays = Math.ceil(
    Math.max(
      1,
      ...effectiveTasks.map((t) => (t.startDay || 0) + t.effectiveActual + (t.floatDays || 0))
    )
  );
  const criticalCount = tasks.filter((t) => t.critical).length;

  // What-if: injected critical-path slip adds directly to the model's P50 slippage;
  // risk is a linear what-if approximation on top of the model's Monte Carlo baseline.
  const totalSlippageDays = +(baseSlipDays + simulatedSlipDays).toFixed(1);
  const delayRiskProbability = Math.min(99.4, +(baseRisk + simulatedSlipDays * 4.8).toFixed(1));

  return (
    <div className="bg-white rounded-xl border border-rule p-5 sm:p-6 space-y-5">
      {/* Header & Legend */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-rule-soft">
        <div>
          <h2 className="font-display text-[20px] font-bold leading-tight text-ink">
            Time-Phased Gantt Schedule &amp; What-If Slippage Simulator
          </h2>
          <p className="text-xs text-ink-2">
            Tasks are staggered by start day across the active schedule horizon with float buffers and critical-path cascades
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs text-ink-3 shrink-0">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-2 rounded-xs bg-rule-strong" />
            <span>Planned</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-2 rounded-xs bg-stamp" />
            <span>On Track</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-2 rounded-xs bg-hold" />
            <span>Critical Slip</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span
              className="w-3 h-2 rounded-xs border border-ink-3"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(45deg, var(--color-rule-strong), var(--color-rule-strong) 2px, transparent 2px, transparent 4px)",
              }}
            />
            <span>Float / Sim Buffer</span>
          </div>
        </div>
      </div>

      {tasks.length === 0 ? (
        <div className="rounded-lg border border-dashed border-rule-strong bg-paper px-4 py-8 text-center text-xs text-ink-2">
          No WBS tasks loaded. Upload a CSV or Excel schedule above to inspect the critical path and simulate slippage.
        </div>
      ) : (
        <>
          {/* What-If Simulator Controls */}
          <div className="p-4 rounded-xl bg-paper text-ink border border-rule-strong">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex-1 space-y-2">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="slippage-slider"
                    className="text-xs font-medium text-stamp flex items-center gap-2"
                  >
                    <Zap className="w-3.5 h-3.5 text-stamp" strokeWidth={1.5} />
                    <span>Simulate Critical-Path Delay</span>
                  </label>
                  <span className="font-mono-numbers text-xs font-medium px-2.5 py-0.5 rounded bg-stamp text-white">
                    +{simulatedSlipDays} Days Slip
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs text-ink-3 font-mono-numbers font-medium">
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
                    className="flex-1 h-2 bg-sheet-sunk rounded-lg appearance-none cursor-pointer accent-stamp"
                  />
                  <span className="text-xs text-hold font-mono-numbers font-medium">
                    +7d (Severe)
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                  <span className="text-ink-3">Scenarios:</span>
                  {[
                    { label: "0d Baseline", val: 0 },
                    { label: "+2d", val: 2 },
                    { label: "+4d", val: 4 },
                    { label: "+7d", val: 7 },
                  ].map((preset) => (
                    <button
                      key={preset.val}
                      type="button"
                      onClick={() => setSimulatedSlipDays(preset.val)}
                      className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                        simulatedSlipDays === preset.val
                          ? "bg-stamp text-sheet font-medium"
                          : "bg-sheet-sunk text-ink-2 hover:text-ink"
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5 sm:w-72 shrink-0 border-t md:border-t-0 md:border-l border-rule-strong pt-3 md:pt-0 md:pl-4">
                <div className="p-2.5 rounded-lg bg-paper border border-rule-strong">
                  <div className="text-xs text-ink-3 font-medium">
                    Cumulative Slippage
                  </div>
                  <div className="text-base sm:text-lg font-mono-numbers font-semibold text-hold">
                    +{totalSlippageDays}d
                  </div>
                  <div className="text-xs text-ink-3 font-mono-numbers">
                    What-if Risk: {delayRiskProbability}%
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-paper border border-rule-strong">
                  <div className="text-xs text-ink-3 font-medium">
                    Critical Path Tasks
                  </div>
                  <div className="text-base sm:text-lg font-mono-numbers font-semibold text-ink">
                    {criticalCount} / {tasks.length}
                  </div>
                  <div className="text-xs text-ink-3 font-mono-numbers">
                    Horizon: {horizonDays}d
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Time-Phased Gantt Grid */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between gap-2 text-xs font-semibold text-ink-3 px-1 pt-1 border-b border-rule pb-1.5">
              <span className="md:w-64 shrink-0 text-left">WBS Work Package</span>
              <div className="hidden md:grid flex-1 grid-cols-4 text-center font-mono-numbers">
                {[0, 1, 2, 3].map((qIdx) => {
                  const start = Math.round((qIdx * horizonDays) / 4) + 1;
                  const end = Math.round(((qIdx + 1) * horizonDays) / 4);
                  const label =
                    end < start ? "—" : start === end ? `D${start}` : `D${start}-D${end}`;
                  return (
                    <span key={qIdx} className="border-l border-rule">
                      {label}
                    </span>
                  );
                })}
              </div>
              <span className="md:w-36 shrink-0 text-right">Duration / Slip</span>
            </div>

            <div className="relative space-y-2">

          {effectiveTasks.map((task) => {
            const startDay = task.startDay || 0;
            const leftPct = (startDay / horizonDays) * 100;
            const plannedPct = (task.plannedDays / horizonDays) * 100;
            const actualPct = (task.effectiveActual / horizonDays) * 100;
            const floatPct = ((task.floatDays || 0) / horizonDays) * 100;
            const isDelayed = task.effectiveActual > task.plannedDays;
            const varianceDays = Math.round((task.effectiveActual - task.plannedDays) * 10) / 10;

            return (
              <div
                key={task.code}
                onMouseEnter={() => setHoveredCode(task.code)}
                onMouseLeave={() => setHoveredCode(null)}
                className={`p-2.5 rounded-xl border transition-colors relative ${
                  task.critical
                    ? "bg-sheet border-warn-line"
                    : "bg-sheet border-rule"
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-center gap-2">
                  {/* Left: WBS Label */}
                  <div className="md:w-64 shrink-0 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono-numbers px-1.5 py-0.5 rounded bg-ink text-white font-medium text-xs shrink-0">
                        {task.code}
                      </span>
                      {task.critical && (
                        <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-hold-wash text-hold border border-hold-line inline-flex items-center gap-0.5 shrink-0">
                          <AlertTriangle className="w-2.5 h-2.5" strokeWidth={1.5} />
                          <span>CPM</span>
                        </span>
                      )}
                      {task.workCenter && (
                        <span className="text-xs text-ink-3 truncate">
                          {task.workCenter}
                        </span>
                      )}
                    </div>
                    <div className="font-semibold text-xs text-ink truncate mt-0.5">
                      {task.task}
                    </div>
                  </div>

                  {/* Center: Staggered Time-Phased Track */}
                  <div className="hidden md:block flex-1 h-9 bg-white rounded-lg border border-rule relative overflow-hidden">
                    <div className="absolute inset-0 grid grid-cols-4 pointer-events-none opacity-45">
                      <div className="border-r border-rule-strong border-dashed" />
                      <div className="border-r border-rule-strong border-dashed" />
                      <div className="border-r border-rule-strong border-dashed" />
                      <div />
                    </div>

                    {/* Planned baseline strip */}
                    <div
                      className="absolute top-1.5 h-2 bg-rule-strong rounded-xs"
                      style={{
                        left: `${leftPct}%`,
                        width: `${plannedPct}%`,
                      }}
                    />

                    {/* Actual / Forecast strip */}
                    <div
                      className={`absolute bottom-1.5 h-2.5 rounded-xs transition-colors duration-150 ${
                        task.critical && task.additionalSlip > 0
                          ? "bg-stamp"
                          : task.critical && isDelayed
                          ? "bg-hold"
                          : isDelayed
                          ? "bg-warn"
                          : "bg-stamp"
                      }`}
                      style={{
                        left: `${leftPct}%`,
                        width: `${actualPct}%`,
                      }}
                    />

                    {/* Float Buffer Hatch (for non-critical tasks) */}
                    {floatPct > 0 && (
                      <div
                        className="absolute bottom-1.5 h-2.5 rounded-r-xs border border-l-0 border-ink-3/70"
                        style={{
                          left: `${leftPct + actualPct}%`,
                          width: `${floatPct}%`,
                          backgroundImage:
                            "repeating-linear-gradient(45deg, var(--color-rule-strong), var(--color-rule-strong) 3px, transparent 3px, transparent 6px)",
                        }}
                      />
                    )}

                    {/* Hover Inspection Chip */}
                    {hoveredCode === task.code && (
                      <div className="hidden md:flex items-center gap-2 absolute right-2 top-1/2 -translate-y-1/2 px-2 py-0.5 rounded bg-paper text-ink text-xs font-mono-numbers z-30 shadow-sm">
                        <span>
                          D{startDay + 1}-D{startDay + task.effectiveActual}
                        </span>
                        <span>·</span>
                        <span>Risk {(task.delayRisk * 100).toFixed(0)}%</span>
                      </div>
                    )}
                  </div>

                  {/* Right: Variance Summary */}
                  <div className="md:w-36 shrink-0 font-mono-numbers text-xs text-ink-2 md:text-right">
                    <span className="text-ink-3">{task.plannedDays}d</span>
                    <span className="mx-1">/</span>
                    <strong className="text-ink">{task.effectiveActual}d</strong>
                    {isDelayed && (
                      <span
                        className={`ml-1 font-medium ${
                          task.critical ? "text-hold" : "text-warn"
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
        </>
      )}
    </div>
  );
};
