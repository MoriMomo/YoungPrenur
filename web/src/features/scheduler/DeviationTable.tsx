"use client";

import React from "react";
import { WbsTask } from "@/types";

interface DeviationTableProps {
  tasks: WbsTask[];
}

export const DeviationTable: React.FC<DeviationTableProps> = ({ tasks }) => {
  return (
    <div className="bg-white rounded-xl border border-[#e2eaf3] p-5 shadow-[0_2px_8px_rgba(12,26,45,0.04)]">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-[15px] font-medium text-[#111827]">
            Schedule Variance & WBS Deviation Register
          </h2>
          <p className="text-xs text-[#536780]">
            Activity-level critical path analysis and slippage probability.
          </p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-[#e2eaf3] text-[#64748b] text-[11px] font-semibold">
              <th className="pb-3 font-semibold">WBS Code</th>
              <th className="pb-3 font-semibold">Task Description</th>
              <th className="pb-3 font-semibold">Planned</th>
              <th className="pb-3 font-semibold">Actual / Forecast</th>
              <th className="pb-3 font-semibold">Variance</th>
              <th className="pb-3 font-semibold">Critical Path</th>
              <th className="pb-3 font-semibold">Delay Risk</th>
              <th className="pb-3 font-semibold text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#f1f5f9]">
            {tasks.map((task) => {
              const variance = task.actualDays - task.plannedDays;
              return (
                <tr key={task.code} className="hover:bg-[#f8fafc] transition-colors">
                  <td className="py-3.5 pr-3">
                    <span className="font-mono-numbers px-2 py-0.5 rounded bg-[#f1f5f9] text-[#1e293b] font-semibold text-[11px]">
                      {task.code}
                    </span>
                  </td>
                  <td className="py-3.5 pr-3 font-medium text-[#101e30]">
                    {task.task}
                  </td>
                  <td className="py-3.5 pr-3 font-mono-numbers text-[#64748b]">
                    {task.plannedDays} days
                  </td>
                  <td className="py-3.5 pr-3 font-mono-numbers font-semibold text-[#1e293b]">
                    {task.actualDays} days
                  </td>
                  <td className="py-3.5 pr-3 font-mono-numbers font-medium">
                    {variance > 0 ? (
                      <span className="text-[#dc2626]">+{variance}d</span>
                    ) : (
                      <span className="text-[#16a34a]">0d</span>
                    )}
                  </td>
                  <td className="py-3.5 pr-3">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-[11px] font-medium ${
                        task.critical
                          ? "bg-[#fef2f2] text-[#dc2626]"
                          : "bg-[#f0fdf4] text-[#16a34a]"
                      }`}
                    >
                      {task.critical ? "Critical (CPM)" : "Float Buffer"}
                    </span>
                  </td>
                  <td className="py-3.5 pr-3 font-mono-numbers font-medium text-[#111827]">
                    {(task.delayRisk * 100).toFixed(0)}%
                  </td>
                  <td className="py-3.5 text-right">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-md text-[11px] font-medium ${
                        task.status.includes("Delayed") || task.status.includes("At Risk")
                          ? "bg-[#fee2e2] text-[#dc2626] border border-[#fecaca]"
                          : task.status.includes("Bottleneck") || task.status.includes("Lagging")
                          ? "bg-[#fef3c7] text-[#d97706] border border-[#fde68a]"
                          : "bg-[#e6f7f0] text-[#0d9263] border border-[#a7f3d0]"
                      }`}
                    >
                      {task.status}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
