"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ProductionLineItem } from "@/types";
import {
  ChevronRight,
  MapPin,
  Table as TableIcon,
  Cpu,
  UserCheck,
  CalendarClock,
} from "lucide-react";

interface ProductionLineStatusProps {
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
  outputActual: number;
  outputTarget: number;
  operator: string;
  status: "On track" | "Attention" | "Critical Constraint" | "Above target";
  statusTone: "green" | "amber" | "red" | "cyan";
  x: number;
  y: number;
  w: number;
  h: number;
  telemetryNote: string;
}

const WORK_CENTERS_TWIN: WorkCenterTwin[] = [
  {
    id: "bay-01",
    name: "CNC Milling Cell A (5-Axis)",
    machineModel: "5-Axis Vertical Mill",
    wbsCode: "WBS-2.1",
    wbsTask: "CNC 5-Axis Milling & Surface Profiling",
    wbsProject: "Project Alpha (Aerospace Tooling)",
    utilization: 92,
    outputActual: 1240,
    outputTarget: 1300,
    operator: "Bambang S. (Lead Tech)",
    status: "On track",
    statusTone: "green",
    x: 40,
    y: 40,
    w: 320,
    h: 130,
    telemetryNote: "Spindle load 92% · Nominal thermal drift compensation active",
  },
  {
    id: "bay-02",
    name: "Stamping Press Bay P-07",
    machineModel: "600-Ton Hydraulic Press",
    wbsCode: "WBS-2.2",
    wbsTask: "Precision Stamping & Forming",
    wbsProject: "Project Alpha (Aerospace Tooling)",
    utilization: 68,
    outputActual: 890,
    outputTarget: 1000,
    operator: "Agus H. (Press Master)",
    status: "Critical Constraint",
    statusTone: "red",
    x: 400,
    y: 40,
    w: 360,
    h: 130,
    telemetryNote: "Vibration sensor +18% elevated (SOP-PRS-04 seal inspection required)",
  },
  {
    id: "bay-03",
    name: "Wire EDM Cell 03",
    machineModel: "Precision Wire EDM",
    wbsCode: "WBS-1.3",
    wbsTask: "Tooling & Stamping Die Fabrication",
    wbsProject: "EV Battery Enclosure Die",
    utilization: 96,
    outputActual: 1510,
    outputTarget: 1480,
    operator: "Rudi Hermawan (Cert L3)",
    status: "Above target",
    statusTone: "cyan",
    x: 40,
    y: 195,
    w: 320,
    h: 130,
    telemetryNote: "Nominal telemetry · Die clearance verified within +/-0.02mm",
  },
  {
    id: "bay-04",
    name: "Assembly Cell 02 & CMM Lab",
    machineModel: "3-Axis Bridge CMM + Cleanroom Cell",
    wbsCode: "WBS-3.1",
    wbsTask: "Cell 02 Sub-Assembly & Tolerancing",
    wbsProject: "Project Alpha (Aerospace Tooling)",
    utilization: 74,
    outputActual: 890,
    outputTarget: 1000,
    operator: "Siti M. (Senior QC)",
    status: "Attention",
    statusTone: "amber",
    x: 400,
    y: 195,
    w: 360,
    h: 130,
    telemetryNote: "11% below shift target (1 technician deficit on evening shift)",
  },
];

function toLineItem(bay: WorkCenterTwin): ProductionLineItem {
  const mappedStatus: ProductionLineItem["status"] =
    bay.status === "Critical Constraint" ? "Attention" : bay.status;
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
    outputActual: bay.outputActual,
    outputTarget: bay.outputTarget,
    status: mappedStatus,
    statusColor: mappedColor,
  };
}

export const ProductionLineStatus: React.FC<ProductionLineStatusProps> = ({
  onSelectLine,
}) => {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<"map" | "table">("map");
  const [selectedBayId, setSelectedBayId] = useState<string>("bay-02");

  const activeBay =
    WORK_CENTERS_TWIN.find((b) => b.id === selectedBayId) || WORK_CENTERS_TWIN[0];

  const getStatusBadge = (status: WorkCenterTwin["status"]) => {
    switch (status) {
      case "On track":
        return "bg-pass-wash text-pass border-pass-line";
      case "Critical Constraint":
        return "bg-hold-wash text-hold border-hold-line";
      case "Attention":
        return "bg-warn-wash text-warn border-warn-line";
      case "Above target":
        return "bg-stamp-wash text-stamp border-stamp-line";
      default:
        return "bg-sheet-sunk text-ink-2 border-rule";
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
    router.push("/dashboard/iroom?tab=operations");
  };

  return (
    <div className="bg-white border border-rule rounded-xl p-5 sm:p-6 space-y-4">
      {/* Header & View Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-rule-soft">
        <div>
          <h2 className="font-display text-[20px] font-bold leading-tight text-ink">
            Shop-Floor Work Centers &amp; WBS Binding
          </h2>
          <p className="text-xs text-ink-3 mt-0.5">
            Both Spatial Map and Table View share identical work-center telemetry and WBS bindings
          </p>
        </div>

        <div className="flex items-center gap-1 h-8 p-0.5 bg-sheet-sunk rounded-lg border border-rule self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setViewMode("map")}
            className={`flex items-center gap-1.5 h-7 px-2.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
              viewMode === "map"
                ? "bg-white text-ink"
                : "text-ink-2 hover:text-ink"
            }`}
          >
            <MapPin className="w-3.5 h-3.5" strokeWidth={1.5} />
            <span>Floor Map</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode("table")}
            className={`flex items-center gap-1.5 h-7 px-2.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
              viewMode === "table"
                ? "bg-white text-ink"
                : "text-ink-2 hover:text-ink"
            }`}
          >
            <TableIcon className="w-3.5 h-3.5" strokeWidth={1.5} />
            <span>Table View</span>
          </button>
        </div>
      </div>

      {viewMode === "map" ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* SVG Floor Grid */}
          <div className="lg:col-span-8 bg-paper rounded-xl p-4 border border-rule overflow-hidden">
            <div className="flex items-center justify-between text-xs font-mono-numbers text-ink-2 mb-2 pb-2 border-b border-rule">
              <span className="text-stamp font-medium">
                Shop A Work Center Matrix
              </span>
              <span>4 cells monitored (simulated)</span>
            </div>

            <svg
              viewBox="0 0 780 345"
              className="w-full h-auto block"
              role="img"
              aria-label="Shop-Floor Spatial Map"
            >
              <rect width="780" height="345" fill="var(--color-paper)" rx="10" />

              {WORK_CENTERS_TWIN.map((bay) => {
                const isSelected = bay.id === selectedBayId;
                const strokeColor =
                  bay.statusTone === "red"
                    ? "var(--color-hold)"
                    : bay.statusTone === "amber"
                    ? "var(--color-warn)"
                    : bay.statusTone === "cyan"
                    ? "var(--color-stamp)"
                    : "var(--color-pass)";

                const fillColor = isSelected ? "var(--color-sheet-sunk)" : "var(--color-sheet-sunk)";

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
                      fill={fillColor}
                      stroke={strokeColor}
                      strokeWidth={isSelected ? "2.5" : "1.2"}
                    />
                    <rect
                      x={bay.x}
                      y={bay.y}
                      width={bay.w}
                      height="28"
                      rx="10"
                      fill="var(--color-paper)"
                    />
                    <circle
                      cx={bay.x + 18}
                      cy={bay.y + 14}
                      r="3.5"
                      fill={strokeColor}
                    />
                    <text
                      x={bay.x + 30}
                      y={bay.y + 18}
                      fill="var(--color-sheet)"
                      fontSize="11"
                      fontWeight="600"
                    >
                      {bay.name}
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
                      Tool: <tspan fill="var(--color-rule)">{bay.machineModel}</tspan>
                    </text>

                    <text x={bay.x + 14} y={bay.y + 66} fill="var(--color-ink-3)" fontSize="10">
                      WBS: <tspan fill="var(--color-stamp-line)" fontWeight="600">{bay.wbsTask}</tspan>
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
                      fill="var(--color-rule-strong)"
                      fontSize="10"
                      fontWeight="600"
                      fontFamily="monospace"
                    >
                      Util: {bay.utilization}% · {bay.outputActual.toLocaleString("en-US")}u
                    </text>

                    <text
                      x={bay.x + bay.w - 14}
                      y={bay.y + 105}
                      fill={strokeColor}
                      fontSize="10"
                      fontWeight="600"
                      textAnchor="end"
                    >
                      {bay.status}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Inspector Card */}
          <div className="lg:col-span-4 bg-sheet rounded-xl p-5 border border-rule flex flex-col justify-between space-y-4">
            <div>
              <div className="flex flex-wrap items-center justify-between gap-1.5 pb-2 border-b border-rule">
                <span className="font-mono-numbers text-xs font-medium text-ink-3">
                  Cell Inspector
                </span>
                <span
                  className={`font-mono-numbers px-2 py-0.5 rounded text-xs font-medium border ${getStatusBadge(
                    activeBay.status
                  )}`}
                >
                  {activeBay.status}
                </span>
              </div>

              <div className="mt-3 space-y-1">
                <h3 className="text-sm font-medium text-ink">{activeBay.name}</h3>
                <p className="text-xs text-ink-3">{activeBay.machineModel}</p>
              </div>

              <div className="mt-3 p-3 rounded-xl bg-white border border-rule space-y-1.5">
                <div className="text-xs font-medium text-stamp flex items-center gap-1.5">
                  <CalendarClock className="w-3.5 h-3.5" strokeWidth={1.5} />
                  <span>Bound WBS Package</span>
                </div>
                <div className="text-xs font-medium text-ink flex items-center justify-between gap-2">
                  <span className="truncate">{activeBay.wbsTask}</span>
                  <span className="font-mono-numbers px-1.5 py-0.5 rounded bg-ink text-white text-xs shrink-0">
                    {activeBay.wbsCode}
                  </span>
                </div>
                <div className="text-xs text-ink-3">
                  Project: <span className="font-medium text-ink-2">{activeBay.wbsProject}</span>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-1 xl:grid-cols-2 gap-2 text-xs font-mono-numbers">
                <div className="p-2 rounded-lg bg-white border border-rule">
                  <span className="text-xs text-ink-3 block">Utilization</span>
                  <span className="text-sm font-medium text-ink">{activeBay.utilization}%</span>
                </div>
                <div className="p-2 rounded-lg bg-white border border-rule">
                  <span className="text-xs text-ink-3 block">Units</span>
                  <span className="text-sm font-medium text-ink">
                    {activeBay.outputActual} / {activeBay.outputTarget}
                  </span>
                </div>
              </div>

              <div className="mt-3 flex items-center gap-2 text-xs text-ink-2">
                <UserCheck className="w-4 h-4 text-ink-3" strokeWidth={1.5} />
                <span>
                  Operator: <span className="font-medium text-ink">{activeBay.operator}</span>
                </span>
              </div>

              <div className="mt-3 p-2.5 rounded-lg bg-white border border-rule text-xs text-ink-2 leading-relaxed">
                <span className="font-medium text-ink">Telemetry Notice:</span>{" "}
                {activeBay.telemetryNote}
              </div>
            </div>

            <div className="pt-3 border-t border-rule">
              <button
                type="button"
                onClick={() => handleInspectBay(activeBay)}
                className="w-full h-9 bg-stamp hover:bg-stamp-deep text-white text-xs font-medium rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Cpu className="w-3.5 h-3.5 text-ink-3" strokeWidth={1.5} />
                <span>Inspect Sensor Stream in IRoom</span>
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
                <th className="py-2.5 px-3 font-medium">Bound WBS Task</th>
                <th className="py-2.5 px-3 font-medium">Utilization</th>
                <th className="py-2.5 px-3 font-medium">Actual vs Target</th>
                <th className="py-2.5 px-3 font-medium">Status</th>
                <th className="py-2.5 px-3 text-right font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rule-soft">
              {WORK_CENTERS_TWIN.map((bay) => (
                <tr key={bay.id} className="hover:bg-sheet transition-colors">
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-2.5">
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${getProgressColor(bay.statusTone)}`} />
                      <div>
                        <div className="font-medium text-ink">{bay.name}</div>
                        <div className="text-xs text-ink-3">{bay.machineModel}</div>
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
                    <span className="font-medium text-ink">{bay.outputActual.toLocaleString("en-US")}</span> /{" "}
                    {bay.outputTarget.toLocaleString("en-US")} units
                  </td>

                  <td className="py-3 px-3">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-xs font-medium border ${getStatusBadge(
                        bay.status
                      )}`}
                    >
                      {bay.status}
                    </span>
                  </td>

                  <td className="py-3 px-3 text-right">
                    <button
                      type="button"
                      onClick={() => handleInspectBay(bay)}
                      className="inline-flex items-center gap-1 text-xs font-medium text-stamp hover:text-stamp-deep hover:underline cursor-pointer"
                    >
                      <span>Open in IRoom</span>
                      <ChevronRight className="w-3.5 h-3.5" strokeWidth={1.5} />
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
