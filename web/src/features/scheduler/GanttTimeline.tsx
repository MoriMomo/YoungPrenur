"use client";

import React from "react";
import { WbsTask } from "@/types";
import { Clock, AlertTriangle } from "lucide-react";

interface GanttTimelineProps {
  tasks: WbsTask[];
}

export const GanttTimeline: React.FC<GanttTimelineProps> = ({ tasks }) => {
  const maxDays = Math.max(...tasks.map((t) => Math.max(t.plannedDays, t.actualDays)), 15);

  return (
    <div className="bg-white rounded-xl border border-[#e2eaf3] p-5 shadow-[0_2px_8px_rgba(12,26,45,0.04)]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
        <div>
          <h2 className="text-base font-bold text-[#101e30] tracking-tight">
            Critical Path & Milestone Gantt Timeline
          </h2>
          <p className="text-xs text-[#536780]">
            Visualizes planned vs forecasted durations and critical path variances along the project schedule.
          </p>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-[11px] text-[#64748b]">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-2 rounded-sm bg-[#94a3b8]" />
            <span>Planned</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-2 rounded-sm bg-[#2563eb]" />
            <span>On Track</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-2 rounded-sm bg-[#dc2626]" />
            <span>Critical Slippage</span>
          </div>
        </div>
      </div>

      {/* Timeline Bars */}
      <div className="space-y-4 pt-2">
        {tasks.map((task) => {
          const plannedPct = Math.min(100, (task.plannedDays / maxDays) * 100);
          const actualPct = Math.min(100, (task.actualDays / maxDays) * 100);
          const isDelayed = task.actualDays > task.plannedDays;

          return (
            <div key={task.code} className="space-y-1 text-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-mono-numbers px-1.5 py-0.5 rounded bg-[#f1f5f9] text-[#1e293b] font-bold text-[10px] shrink-0">
                    {task.code}
                  </span>
                  <span className="font-semibold text-[#101e30] truncate">
                    {task.task}
                  </span>
                  {task.critical && (
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold bg-[#fee2e2] text-[#dc2626] shrink-0">
                      CRITICAL
                    </span>
                  )}
                </div>
                <div className="font-mono-numbers text-[11px] text-[#64748b] shrink-0">
                  {task.plannedDays}d plan / <strong>{task.actualDays}d forecast</strong>
                  {isDelayed && (
                    <span className="text-[#dc2626] font-bold ml-1">
                      (+{task.actualDays - task.plannedDays}d)
                    </span>
                  )}
                </div>
              </div>

              {/* Stacked bar visualization */}
              <div className="h-5 w-full bg-[#f8fafc] rounded-lg p-0.5 relative border border-[#e2eaf3] overflow-hidden flex flex-col justify-center gap-0.5">
                {/* Planned bar */}
                <div
                  className="h-1.5 bg-[#cbd5e1] rounded-sm transition-all duration-500"
                  style={{ width: `${plannedPct}%` }}
                  title={`Planned: ${task.plannedDays} days`}
                />
                {/* Actual / Forecast bar */}
                <div
                  className={`h-1.5 rounded-sm transition-all duration-500 ${
                    task.critical && isDelayed
                      ? "bg-[#dc2626]"
                      : isDelayed
                      ? "bg-[#f59e0b]"
                      : "bg-[#2563eb]"
                  }`}
                  style={{ width: `${actualPct}%` }}
                  title={`Actual/Forecast: ${task.actualDays} days`}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
