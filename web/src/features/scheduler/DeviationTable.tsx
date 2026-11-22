"use client";

import React from "react";
import { WbsTask } from "@/types";
import { useT } from "@/lib/i18n";

interface DeviationTableProps {
  tasks: WbsTask[];
}

export const DeviationTable: React.FC<DeviationTableProps> = ({ tasks }) => {
  const t = useT();
  const days = t("days", "hari");
  return (
    <div className="bg-white rounded-xl border border-rule p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-display text-[20px] font-bold leading-tight text-ink">
            {t("Schedule Variance & WBS Deviation Register", "Register Selisih Jadwal & Penyimpangan WBS")}
          </h2>
          <p className="text-xs text-ink-2">
            {t("Activity-level critical path analysis and slippage probability", "Analisis jalur kritis per aktivitas dan peluang kemunduran")}
          </p>
        </div>
      </div>

      {tasks.length === 0 ? (
        <div className="rounded-lg border border-dashed border-rule-strong bg-paper px-4 py-8 text-center text-xs text-ink-2">
          {t(
            "No WBS tasks loaded. Upload a CSV or Excel schedule above to inspect schedule variance and delay risk.",
            "Belum ada tugas WBS. Unggah jadwal CSV atau Excel di atas untuk memeriksa selisih jadwal dan risiko terlambat."
          )}
        </div>
      ) : (
        <div className="relative overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-xs">
            <thead>
              <tr className="border-b border-rule text-ink-3 text-xs font-semibold">
                <th className="pb-3 font-semibold">{t("WBS Code", "Kode WBS")}</th>
                <th className="pb-3 font-semibold">{t("Task Description", "Deskripsi Tugas")}</th>
                <th className="pb-3 font-semibold">{t("Planned", "Rencana")}</th>
                <th className="pb-3 font-semibold">{t("Actual / Forecast", "Aktual / Prakiraan")}</th>
                <th className="pb-3 font-semibold">{t("Variance", "Selisih")}</th>
                <th className="pb-3 font-semibold">{t("Critical Path", "Jalur Kritis")}</th>
                <th className="pb-3 font-semibold">{t("Delay Risk", "Risiko Terlambat")}</th>
                <th className="pb-3 font-semibold text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rule-soft">
              {tasks.map((task) => {
                const variance = Math.round((task.actualDays - task.plannedDays) * 10) / 10;
                return (
                  <tr key={task.code} className="hover:bg-paper transition-colors">
                    <td className="py-3.5 pr-3">
                      <span className="whitespace-nowrap font-mono-numbers px-2 py-0.5 rounded bg-sheet-sunk text-ink font-semibold text-xs">
                        {task.code}
                      </span>
                    </td>
                    <td className="py-3.5 pr-3 font-medium text-ink">
                      {task.task}
                    </td>
                    <td className="whitespace-nowrap py-3.5 pr-3 font-mono-numbers text-ink-3">
                      {task.plannedDays} {days}
                    </td>
                    <td className="whitespace-nowrap py-3.5 pr-3 font-mono-numbers font-semibold text-ink">
                      {task.actualDays} {days}
                    </td>
                    <td className="py-3.5 pr-3 font-mono-numbers font-medium">
                      {variance > 0 ? (
                        <span className="text-hold">+{variance}d</span>
                      ) : variance < 0 ? (
                        <span className="text-pass">{variance}d</span>
                      ) : (
                        <span className="text-pass">0d</span>
                      )}
                    </td>
                    <td className="py-3.5 pr-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                          task.critical
                            ? "bg-hold-wash text-hold"
                            : "bg-pass-wash text-pass"
                        }`}
                      >
                        {task.critical ? t("Critical (CPM)", "Kritis (CPM)") : t("Float Buffer", "Cadangan Float")}
                      </span>
                    </td>
                    <td className="py-3.5 pr-3 font-mono-numbers font-medium text-ink">
                      {(task.delayRisk * 100).toFixed(0)}%
                    </td>
                    <td className="py-3.5 text-right">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-md text-xs font-medium ${
                          task.status.includes("Delayed") || task.status.includes("At Risk")
                            ? "bg-hold-wash text-hold border border-hold-line"
                            : task.status.includes("Bottleneck") || task.status.includes("Lagging")
                            ? "bg-warn-wash text-warn border border-warn-line"
                            : "bg-pass-wash text-pass border border-pass-line"
                        }`}
                      >
                        {t(task.status)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
