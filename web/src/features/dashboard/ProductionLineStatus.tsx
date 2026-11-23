"use client";

import React, { useState } from "react";
import { useT } from "@/lib/i18n";
import { useRouter } from "next/navigation";
import { ProductionLineItem, WbsTask } from "@/types";
import {
  ChevronRight,
  MapPin,
  Table as TableIcon,
  CalendarClock,
  UserCheck,
  ArrowUpRight,
} from "lucide-react";

interface ProductionLineStatusProps {
  tasks?: WbsTask[];
  projectName?: string | null;
  onSelectLine?: (line: ProductionLineItem) => void;
}

interface WorkCenterTwin {
  id: string;
  name: string;
  machineModel: string;
  wbsCode: string;
  wbsTask: string;
  wbsProject: string;
  utilization: number;
  actualDays: number;
  plannedDays: number;
  operator: string;
  status: "On track" | "Attention" | "Critical Constraint" | "Ahead of plan";
  statusTone: "green" | "amber" | "red" | "cyan";
  x: number;
  y: number;
  w: number;
  h: number;
  telemetryNote: string;
}

const SLOTS = [
  { x: 40, y: 40, w: 320, h: 130 },
  { x: 400, y: 40, w: 360, h: 130 },
  { x: 40, y: 195, w: 320, h: 130 },
  { x: 400, y: 195, w: 360, h: 130 },
] as const;

function fromUploadedTasks(tasks: WbsTask[], projectName?: string | null): WorkCenterTwin[] {
  const ordered = [...tasks].sort((a, b) => b.delayRisk - a.delayRisk);
  return ordered.map((t, idx) => {
    const slot = SLOTS[idx % SLOTS.length];
    const isHigh = t.riskLevel === "HIGH" || t.delayRisk >= 0.6;
    const isMed = !isHigh && (t.riskLevel === "MEDIUM" || t.delayRisk >= 0.25 || t.actualDays > t.plannedDays);
    const isAhead = !isHigh && !isMed && t.actualDays < t.plannedDays;

    const status: WorkCenterTwin["status"] = isHigh
      ? "Critical Constraint"
      : isMed
      ? "Attention"
      : isAhead
      ? "Ahead of plan"
      : "On track";

    const statusTone: WorkCenterTwin["statusTone"] =
      status === "Critical Constraint"
        ? "red"
        : status === "Attention"
        ? "amber"
        : status === "Ahead of plan"
        ? "cyan"
        : "green";

    const riskPct = Math.round(t.delayRisk * 100);
    return {
      id: `${t.code}-${idx}`,
      name: t.workCenter?.trim() || "Assigned Work Center",
      machineModel: t.critical ? "Critical-Path Station" : "Standard WBS Cell",
      wbsCode: t.code,
      wbsTask: t.task,
      wbsProject: projectName || "Uploaded Schedule",
      utilization: Math.min(100, Math.max(5, riskPct)),
      actualDays: t.actualDays,
      plannedDays: t.plannedDays,
      operator: t.owner?.trim() || "Unassigned",
      status,
      statusTone,
      ...slot,
      telemetryNote:
        t.drivers?.[0] ||
        `Float ${t.floatDays}d · Forecast ${t.actualDays}d vs ${t.plannedDays}d planned`,
    };
  });
}

function toLineItem(bay: WorkCenterTwin): ProductionLineItem {
  const mappedStatus: ProductionLineItem["status"] =
    bay.status === "Critical Constraint"
      ? "Attention"
      : bay.status === "Ahead of plan"
      ? "Above target"
      : bay.status;
  const mappedColor: ProductionLineItem["statusColor"] =
    bay.statusTone === "red" || bay.statusTone === "amber"
      ? "warn"
      : bay.statusTone === "cyan"
      ? "cyan"
      : "green";

  return {
    id: bay.id,
    name: bay.name,
    utilization: bay.utilization,
    outputActual: bay.actualDays,
    outputTarget: bay.plannedDays,
    status: mappedStatus,
    statusColor: mappedColor,
  };
}

export const ProductionLineStatus: React.FC<ProductionLineStatusProps> = ({
  tasks = [],
  projectName,
  onSelectLine,
}) => {
  const router = useRouter();
  const t = useT();
  const [viewMode, setViewMode] = useState<"map" | "table">("map");
  const allWorkCenters = fromUploadedTasks(tasks, projectName);
  const mapWorkCenters = allWorkCenters.slice(0, 4);
  const [selectedBayId, setSelectedBayId] = useState<string>("");

  if (allWorkCenters.length === 0) {
    return (
      <div className="bg-sheet border border-rule-strong p-5 sm:p-6">
        <h2 className="font-display text-[20px] font-bold leading-tight text-ink">
          {t("Uploaded Schedule Work Centers", "Work Center dari Jadwal yang Diunggah")}
        </h2>
        <p className="text-xs text-ink-3 mt-1">
          {t("Upload a schedule to map WBS activities to shop-floor work centers.", "Unggah jadwal untuk memetakan aktivitas WBS ke work center di lantai produksi.")}
        </p>
      </div>
    );
  }

  const activeBay =
    mapWorkCenters.find((b) => b.id === selectedBayId) ||
    allWorkCenters.find((b) => b.id === selectedBayId) ||
    mapWorkCenters[0];

  const getStatusBadge = (status: WorkCenterTwin["status"]) => {
    switch (status) {
      case "On track":
        return "bg-pass-wash text-pass border-pass-line";
      case "Critical Constraint":
        return "bg-hold-wash text-hold border-hold-line";
      case "Attention":
        return "bg-warn-wash text-warn border-warn-line";
      case "Ahead of plan":
        return "bg-stamp-wash text-stamp border-stamp-line";
    }
  };

  const getProgressColor = (tone: WorkCenterTwin["statusTone"]) => {
    switch (tone) {
      case "red":
        return "bg-hold";
      case "amber":
        return "bg-warn";
      case "cyan":
        return "bg-stamp";
      default:
        return "bg-pass";
    }
  };

  const handleInspectBay = (bay: WorkCenterTwin) => {
    onSelectLine?.(toLineItem(bay));
    router.push("/dashboard/scheduler");
  };

  return (
    <div className="@container bg-sheet border border-rule-strong p-5 sm:p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-rule-soft">
        <div>
          <h2 className="font-display text-[20px] font-bold leading-tight text-ink">
            {t("Schedule Work Centers & WBS Binding", "Work Center Jadwal & Keterkaitan WBS")}
          </h2>
          <p className="text-xs text-ink-3 mt-0.5">
            {t("Derived directly from your uploaded WBS tasks (ranked by XGBoost delay risk)", "Diturunkan langsung dari tugas WBS yang Anda unggah (diurutkan menurut risiko terlambat XGBoost)")}
          </p>
        </div>

        <div className="flex items-center gap-1 h-10 sm:h-8 p-0.5 bg-sheet-sunk rounded-lg border border-rule self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setViewMode("map")}
            className={`flex items-center gap-1.5 h-9 sm:h-7 px-2.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
              viewMode === "map" ? "bg-white text-ink" : "text-ink-2 hover:text-ink"
            }`}
          >
            <MapPin className="w-3.5 h-3.5" strokeWidth={1.5} />
            <span>{t("Cell Grid", "Grid Sel")}</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode("table")}
            className={`flex items-center gap-1.5 h-9 sm:h-7 px-2.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
              viewMode === "table" ? "bg-white text-ink" : "text-ink-2 hover:text-ink"
            }`}
          >
            <TableIcon className="w-3.5 h-3.5" strokeWidth={1.5} />
            <span>{t("All WBS", "Semua WBS")} ({allWorkCenters.length})</span>
          </button>
        </div>
      </div>

      {viewMode === "map" ? (
        <div className="grid grid-cols-1 @3xl:grid-cols-12 gap-5 items-stretch">
          <div className="@3xl:col-span-8 bg-paper rounded-xl p-3 border border-rule relative overflow-x-auto">
            <div className="min-w-[700px] @xl:min-w-0">
              <div className="flex items-center justify-between text-xs font-mono-numbers text-ink-3 mb-2 px-1">
                <span className="text-stamp font-medium">
                  {t(`Top ${mapWorkCenters.length} Highest-Risk Work Centers`, `${mapWorkCenters.length} Work Center Paling Berisiko`)}
                </span>
                <span>{t(`${allWorkCenters.length} uploaded WBS tasks total`, `Total ${allWorkCenters.length} tugas WBS diunggah`)}</span>
              </div>

              <svg
                viewBox="0 0 780 345"
                className="w-full h-auto block"
                role="img"
                aria-label={t("Uploaded Schedule Work Center Matrix", "Matriks Work Center Jadwal")}
              >
                <rect width="780" height="345" fill="var(--color-paper)" rx="10" />

                {mapWorkCenters.map((bay) => {
                  const isSelected = bay.id === activeBay.id;
                  const strokeColor =
                    bay.statusTone === "red"
                      ? "var(--color-hold)"
                      : bay.statusTone === "amber"
                      ? "var(--color-warn)"
                      : bay.statusTone === "cyan"
                      ? "var(--color-stamp)"
                      : "var(--color-pass)";

                  return (
                    <g
                      key={bay.id}
                      onClick={() => setSelectedBayId(bay.id)}
                      className="cursor-pointer"
                    >
                      <rect
                        x={bay.x}
                        y={bay.y}
                        width={bay.w}
                        height={bay.h}
                        rx="10"
                        fill="var(--color-sheet)"
                        stroke={strokeColor}
                        strokeWidth={isSelected ? "2.5" : "1.2"}
                      />
                      <rect
                        x={bay.x}
                        y={bay.y}
                        width={bay.w}
                        height="28"
                        rx="10"
                        fill="var(--color-sheet-sunk)"
                      />
                      <circle cx={bay.x + 18} cy={bay.y + 14} r="3.5" fill={strokeColor} />
                      <text
                        x={bay.x + 30}
                        y={bay.y + 18}
                        fill="var(--color-ink)"
                        fontSize="11"
                        fontWeight="600"
                      >
                        {bay.name.slice(0, 26)}
                      </text>

                      <rect
                        x={bay.x + bay.w - 72}
                        y={bay.y + 6}
                        width="64"
                        height="16"
                        rx="4"
                        fill="var(--color-stamp)"
                      />
                      <text
                        x={bay.x + bay.w - 40}
                        y={bay.y + 17}
                        fill="var(--color-sheet)"
                        fontSize="9"
                        fontWeight="600"
                        textAnchor="middle"
                        fontFamily="monospace"
                      >
                        {bay.wbsCode}
                      </text>

                      <text x={bay.x + 14} y={bay.y + 48} fill="var(--color-ink-3)" fontSize="10">
                        Owner: <tspan fill="var(--color-ink-2)">{bay.operator.slice(0, 28)}</tspan>
                      </text>

                      <text x={bay.x + 14} y={bay.y + 66} fill="var(--color-ink-3)" fontSize="10">
                        Task: <tspan fill="var(--color-ink)" fontWeight="600">{bay.wbsTask.slice(0, 34)}</tspan>
                      </text>

                      <rect
                        x={bay.x + 14}
                        y={bay.y + 80}
                        width={bay.w - 28}
                        height="7"
                        rx="3.5"
                        fill="var(--color-sheet-sunk)"
                      />
                      <rect
                        x={bay.x + 14}
                        y={bay.y + 80}
                        width={((bay.w - 28) * bay.utilization) / 100}
                        height="7"
                        rx="3.5"
                        fill={strokeColor}
                      />

                      <text
                        x={bay.x + 14}
                        y={bay.y + 105}
                        fill="var(--color-ink-2)"
                        fontSize="10"
                        fontWeight="600"
                        fontFamily="monospace"
                      >
                        Risk: {bay.utilization}% · {bay.actualDays}d / {bay.plannedDays}d
                      </text>

                      <text
                        x={bay.x + bay.w - 14}
                        y={bay.y + 105}
                        fill={strokeColor}
                        fontSize="10"
                        fontWeight="600"
                        textAnchor="end"
                      >
                        {t(bay.status)}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>

          <div className="@3xl:col-span-4 bg-paper rounded-xl p-5 border border-rule flex flex-col justify-between space-y-4">
            <div>
              <div className="flex flex-wrap items-center justify-between gap-1.5 pb-2 border-b border-rule">
                <span className="font-mono-numbers text-xs font-medium text-ink-3">
                  {t("WBS Cell Inspector", "Inspektur Sel WBS")}
                </span>
                <span
                  className={`font-mono-numbers px-2 py-0.5 rounded text-xs font-medium border ${getStatusBadge(
                    activeBay.status
                  )}`}
                >
                  {t(activeBay.status)}
                </span>
              </div>

              <div className="mt-3 space-y-1">
                <h3 className="text-sm font-medium text-ink">{t(activeBay.name)}</h3>
                <p className="text-xs text-ink-3">{t(activeBay.machineModel)}</p>
              </div>

              <div className="mt-3 p-3 rounded-xl bg-white border border-rule space-y-1.5">
                <div className="text-xs font-medium text-stamp flex items-center gap-1.5">
                  <CalendarClock className="w-3.5 h-3.5" strokeWidth={1.5} />
                  <span>{t("Bound WBS Package", "Paket WBS Terkait")}</span>
                </div>
                <div className="text-xs font-medium text-ink flex items-center justify-between gap-2">
                  <span className="truncate">{activeBay.wbsTask}</span>
                  <span className="font-mono-numbers px-1.5 py-0.5 rounded bg-ink text-white text-xs shrink-0">
                    {activeBay.wbsCode}
                  </span>
                </div>
                <div className="text-xs text-ink-3 truncate">
                  {t("Schedule:", "Jadwal:")} <span className="font-medium text-ink-2">{t(activeBay.wbsProject)}</span>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-1 @md:grid-cols-2 gap-2 text-xs font-mono-numbers">
                <div className="p-2 rounded-lg bg-white border border-rule">
                  <span className="text-xs text-ink-3 block">{t("Delay Risk", "Risiko Terlambat")}</span>
                  <span className="text-sm font-medium text-ink">{activeBay.utilization}%</span>
                </div>
                <div className="p-2 rounded-lg bg-white border border-rule">
                  <span className="text-xs text-ink-3 block">{t("Forecast vs Plan", "Prakiraan vs Rencana")}</span>
                  <span className="text-sm font-medium text-ink">
                    {activeBay.actualDays}{t("d", "h")} / {activeBay.plannedDays}{t("d", "h")}
                  </span>
                </div>
              </div>

              <div className="mt-3 flex items-center gap-2 text-xs text-ink-2">
                <UserCheck className="w-4 h-4 text-ink-3" strokeWidth={1.5} />
                <span>
                  {t("Owner:", "Pemilik:")} <span className="font-medium text-ink">{t(activeBay.operator)}</span>
                </span>
              </div>

              <div className="mt-3 p-2.5 rounded-lg bg-white border border-rule text-xs text-ink-2 leading-relaxed">
                <span className="font-medium text-ink">{t("Driver:", "Pemicu:")}</span> {t(activeBay.telemetryNote)}
              </div>
            </div>

            <div className="pt-3 border-t border-rule">
              <button
                type="button"
                onClick={() => handleInspectBay(activeBay)}
                className="w-full h-9 bg-stamp hover:bg-stamp-deep text-white text-xs font-medium rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <ArrowUpRight className="w-3.5 h-3.5" strokeWidth={1.5} />
                <span>{t("Open Full Schedule", "Buka Jadwal Lengkap")}</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-rule text-ink-3 text-xs font-medium">
                <th className="py-2.5 px-3 font-medium">Work Center</th>
                <th className="py-2.5 px-3 font-medium">{t("Bound WBS Task", "Tugas WBS Terkait")}</th>
                <th className="py-2.5 px-3 font-medium">{t("Delay Risk", "Risiko Terlambat")}</th>
                <th className="py-2.5 px-3 font-medium">{t("Forecast vs Planned", "Prakiraan vs Rencana")}</th>
                <th className="py-2.5 px-3 font-medium">Status</th>
                <th className="py-2.5 px-3 text-right font-medium">{t("Action", "Tindakan")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rule-soft">
              {allWorkCenters.map((bay) => (
                <tr key={bay.id} className="hover:bg-paper transition-colors">
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-2.5">
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${getProgressColor(bay.statusTone)}`} />
                      <div>
                        <div className="font-medium text-ink">{t(bay.name)}</div>
                        <div className="text-xs text-ink-3">{t(bay.operator)}</div>
                      </div>
                    </div>
                  </td>

                  <td className="py-3 px-3">
                    <span className="font-mono-numbers px-2 py-0.5 rounded bg-stamp-wash text-stamp-deep font-medium text-xs">
                      {bay.wbsCode} · {bay.wbsTask}
                    </span>
                  </td>

                  <td className="py-3 px-3">
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 bg-rule rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${getProgressColor(bay.statusTone)}`}
                          style={{ width: `${bay.utilization}%` }}
                        />
                      </div>
                      <span className="font-medium font-mono-numbers text-ink-2">
                        {bay.utilization}%
                      </span>
                    </div>
                  </td>

                  <td className="py-3 px-3 font-mono-numbers text-ink-2">
                    <span className="font-medium text-ink">{bay.actualDays}{t("d", "h")}</span> / {bay.plannedDays}{t("d", "h")}
                  </td>

                  <td className="py-3 px-3">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-xs font-medium border ${getStatusBadge(
                        bay.status
                      )}`}
                    >
                      {t(bay.status)}
                    </span>
                  </td>

                  <td className="py-3 px-3 text-right">
                    <button
                      type="button"
                      onClick={() => handleInspectBay(bay)}
                      className="inline-flex items-center gap-1 text-xs font-medium text-stamp hover:underline cursor-pointer"
                    >
                      <span>{t("Schedule", "Jadwal")}</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
