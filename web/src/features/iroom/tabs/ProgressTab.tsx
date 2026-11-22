"use client";

import React from "react";
import { MessageSquareText } from "lucide-react";
import { ProjectProgressItem } from "@/types";
import { IRoomTable } from "../IRoomTable";
import { useT } from "@/lib/i18n";

export interface ProgressTabProps {
  searchQuery: string;
  handleInspectWithAI: (entityName: string, detail: string) => void;
  projects: ProjectProgressItem[];
}

export function ProgressTab({ searchQuery, handleInspectWithAI, projects }: ProgressTabProps) {
  const t = useT();
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
              <tr key={prj.id} className="hover:bg-paper transition-colors">
                <td className="py-3 px-3">
                  <div className="font-medium text-ink">{prj.name}</div>
                  <div className="text-xs text-ink-3">
                    {prj.customer} · {prj.projectCode}
                  </div>
                </td>
                <td className="py-3 px-3 font-medium text-ink-2">
                  {prj.currentMilestone}
                </td>
                <td className="py-3 px-3">
                  <div className="flex items-center gap-2">
                    <div className="w-20 h-2 bg-rule rounded-full overflow-hidden">
                      <div
                        className="h-full bg-stamp rounded-full"
                        style={{ width: `${prj.progressPercent}%` }}
                      />
                    </div>
                    <span className="font-medium font-mono-numbers text-ink">
                      {prj.progressPercent}%
                    </span>
                  </div>
                </td>
                <td className="py-3 px-3 font-mono-numbers">
                  <span
                    className={`font-medium ${
                      prj.delayVarianceDays > 0 ? "text-hold" : "text-pass"
                    }`}
                  >
                    {prj.delayVarianceDays > 0 ? `+${prj.delayVarianceDays}${t("d", " h")}` : t("On Time")}
                  </span>
                </td>
                <td className="py-3 px-3">
                  <span
                    className={`inline-block px-2 py-0.5 rounded text-xs font-medium border ${
                      prj.status === "Critical Risk"
                        ? "bg-hold-wash text-hold border-hold-line"
                        : prj.status === "Delayed"
                        ? "bg-warn-wash text-warn border-warn-line"
                        : "bg-pass-wash text-pass border-pass-line"
                    }`}
                  >
                    {t(prj.status)}
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
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-stamp hover:bg-stamp-deep text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <MessageSquareText className="w-3 h-3 text-stamp" />
                    <span>{t("Audit WBS")}</span>
                  </button>
                </td>
              </tr>
            ))}
    </IRoomTable>
  );
}
