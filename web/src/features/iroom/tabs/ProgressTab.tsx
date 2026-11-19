"use client";

import React from "react";
import { MessageSquareText } from "lucide-react";
import { ProjectProgressItem } from "@/types";
import { IRoomTable } from "../IRoomTable";

export interface ProgressTabProps {
  searchQuery: string;
  handleInspectWithAI: (entityName: string, detail: string) => void;
  projects: ProjectProgressItem[];
}

export function ProgressTab({ searchQuery, handleInspectWithAI, projects }: ProgressTabProps) {
  return (
    <IRoomTable
      headers={[
        "Project & Customer",
        "Current WBS Stage",
        "Progress",
        "Slippage",
        "Status",
        "Copilot Action",
      ]}
    >
      {projects
            .filter(
              (p) =>
                p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                p.customer.toLowerCase().includes(searchQuery.toLowerCase())
            )
            .map((prj) => (
              <tr key={prj.id} className="hover:bg-[#f8fafc] transition-colors">
                <td className="py-3 px-3">
                  <div className="font-medium text-[#111827]">{prj.name}</div>
                  <div className="text-[11px] text-[#64748b]">
                    {prj.customer} · {prj.projectCode}
                  </div>
                </td>
                <td className="py-3 px-3 font-medium text-[#374151]">
                  {prj.currentMilestone}
                </td>
                <td className="py-3 px-3">
                  <div className="flex items-center gap-2">
                    <div className="w-20 h-2 bg-[#e5e7eb] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#2563eb] rounded-full"
                        style={{ width: `${prj.progressPercent}%` }}
                      />
                    </div>
                    <span className="font-medium font-mono-numbers text-[#111827]">
                      {prj.progressPercent}%
                    </span>
                  </div>
                </td>
                <td className="py-3 px-3 font-mono-numbers">
                  <span
                    className={`font-medium ${
                      prj.delayVarianceDays > 0 ? "text-[#dc2626]" : "text-[#16a34a]"
                    }`}
                  >
                    {prj.delayVarianceDays > 0 ? `+${prj.delayVarianceDays}d` : "On Time"}
                  </span>
                </td>
                <td className="py-3 px-3">
                  <span
                    className={`inline-block px-2 py-0.5 rounded text-[11px] font-medium border ${
                      prj.status === "Critical Risk"
                        ? "bg-[#fee2e2] text-[#b91c1c] border-[#fca5a5]"
                        : prj.status === "Delayed"
                        ? "bg-[#fef3c7] text-[#b45309] border-[#fde68a]"
                        : "bg-[#e6f7f0] text-[#0d9263] border-[#a7f3d0]"
                    }`}
                  >
                    {prj.status}
                  </span>
                </td>
                <td className="py-3 px-3 text-right">
                  <button
                    type="button"
                    onClick={() =>
                      handleInspectWithAI(
                        prj.name,
                        `Milestone ${prj.currentMilestone}, slippage +${prj.delayVarianceDays}d, customer ${prj.customer}`
                      )
                    }
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#0c1a2d] hover:bg-[#1a3354] text-white rounded-lg text-[11px] font-semibold transition-colors cursor-pointer"
                  >
                    <MessageSquareText className="w-3 h-3 text-[#60a5fa]" />
                    <span>Audit WBS</span>
                  </button>
                </td>
              </tr>
            ))}
    </IRoomTable>
  );
}
