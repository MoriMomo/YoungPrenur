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
    machineModel: "Makino D800Z High-Torque",
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
    machineModel: "AIDA 600-Ton Hydraulic Press",
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
    machineModel: "Sodick ALC600G Precision EDM",
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
    machineModel: "Hexagon Global CMM + Cleanroom Cell",
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
        return "bg-[#e8f8f1] text-[#08784f] border-[#a7f3d0]";
      case "Critical Constraint":
        return "bg-[#fee2e2] text-[#b91c1c] border-[#fca5a5]";
      case "Attention":
        return "bg-[#fff3df] text-[#a35c00] border-[#fed7aa]";
      case "Above target":
        return "bg-[#e0f2fe] text-[#0369a1] border-[#bae6fd]";
      default:
        return "bg-slate-100 text-slate-700";
    }
  };

  const getProgressColor = (tone: WorkCenterTwin["statusTone"]) => {
    switch (tone) {
      case "red":
        return "bg-[#dc2626]";
      case "amber":
        return "bg-[#d97706]";
      case "cyan":
        return "bg-[#0891b2]";
      default:
        return "bg-[#0d9263]";
    }
  };

  const handleInspectBay = (bay: WorkCenterTwin) => {
    onSelectLine?.(toLineItem(bay));
    router.push("/dashboard/iroom?tab=operations");
  };

  return (
    <div className="bg-white border border-[#e5e7eb] rounded-xl p-5 sm:p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)] space-y-4">
      {/* Header & View Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#f1f5f9]">
        <div>
          <h2 className="text-[15px] font-medium text-[#111827]">
            Shop-Floor Work Centers &amp; WBS Binding
          </h2>
          <p className="text-xs text-[#64748b] mt-0.5">
            Both Spatial Map and Table View share identical work-center telemetry and WBS bindings
          </p>
        </div>

        <div className="flex items-center gap-1 h-8 p-0.5 bg-[#f3f4f6] rounded-lg border border-[#e5e7eb] self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setViewMode("map")}
            className={`flex items-center gap-1.5 h-7 px-2.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
              viewMode === "map"
                ? "bg-white text-[#111827] shadow-[0_1px_2px_rgba(0,0,0,0.05)]"
                : "text-[#4b5565] hover:text-[#111827]"
            }`}
          >
            <MapPin className="w-3.5 h-3.5 text-[#2563eb]" strokeWidth={1.5} />
            <span>Floor Map</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode("table")}
            className={`flex items-center gap-1.5 h-7 px-2.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
              viewMode === "table"
                ? "bg-white text-[#111827] shadow-[0_1px_2px_rgba(0,0,0,0.05)]"
                : "text-[#4b5565] hover:text-[#111827]"
            }`}
          >
            <TableIcon className="w-3.5 h-3.5 text-[#64748b]" strokeWidth={1.5} />
            <span>Table View</span>
          </button>
        </div>
      </div>

      {viewMode === "map" ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* SVG Floor Grid */}
          <div className="lg:col-span-8 bg-[#0d131c] rounded-xl p-4 border border-white/10 overflow-hidden">
            <div className="flex items-center justify-between text-[11px] font-mono-numbers text-[#8f98ab] mb-2 pb-2 border-b border-white/10">
              <span className="text-[#93c5fd] font-medium">
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
              <rect width="780" height="345" fill="#090e15" rx="10" />

              {WORK_CENTERS_TWIN.map((bay) => {
                const isSelected = bay.id === selectedBayId;
                const strokeColor =
                  bay.statusTone === "red"
                    ? "#ef4444"
                    : bay.statusTone === "amber"
                    ? "#f59e0b"
                    : bay.statusTone === "cyan"
                    ? "#06b6d4"
                    : "#10b981";

                const fillColor = isSelected ? "#162d4d" : "#0f2038";

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
                      fill="#0c1a2d"
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
                      fill="#ffffff"
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
                      fill="#2563eb"
                    />
                    <text
                      x={bay.x + bay.w - 40}
                      y={bay.y + 17}
                      fill="#ffffff"
                      fontSize="9"
                      fontWeight="600"
                      textAnchor="middle"
                      fontFamily="monospace"
                    >
                      {bay.wbsCode}
                    </text>

                    <text x={bay.x + 14} y={bay.y + 48} fill="#94a3b8" fontSize="10">
                      Tool: <tspan fill="#e2e8f0">{bay.machineModel}</tspan>
                    </text>

                    <text x={bay.x + 14} y={bay.y + 66} fill="#94a3b8" fontSize="10">
                      WBS: <tspan fill="#93c5fd" fontWeight="600">{bay.wbsTask}</tspan>
                    </text>

                    <rect
                      x={bay.x + 14}
                      y={bay.y + 80}
                      width={bay.w - 28}
                      height="7"
                      rx="3.5"
                      fill="#1b3353"
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
                      fill="#cbd5e1"
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
          <div className="lg:col-span-4 bg-[#fafafa] rounded-xl p-5 border border-[#e5e7eb] flex flex-col justify-between space-y-4">
            <div>
              <div className="flex flex-wrap items-center justify-between gap-1.5 pb-2 border-b border-[#e5e7eb]">
                <span className="font-mono-numbers text-[11px] font-medium text-[#64748b]">
                  Cell Inspector
                </span>
                <span
                  className={`font-mono-numbers px-2 py-0.5 rounded text-[11px] font-medium border ${getStatusBadge(
                    activeBay.status
                  )}`}
                >
                  {activeBay.status}
                </span>
              </div>

              <div className="mt-3 space-y-1">
                <h3 className="text-sm font-medium text-[#111827]">{activeBay.name}</h3>
                <p className="text-xs text-[#64748b]">{activeBay.machineModel}</p>
              </div>

              <div className="mt-3 p-3 rounded-xl bg-white border border-[#e5e7eb] space-y-1.5">
                <div className="text-[11px] font-medium text-[#2563eb] flex items-center gap-1.5">
                  <CalendarClock className="w-3.5 h-3.5" strokeWidth={1.5} />
                  <span>Bound WBS Package</span>
                </div>
                <div className="text-xs font-medium text-[#111827] flex items-center justify-between gap-2">
                  <span className="truncate">{activeBay.wbsTask}</span>
                  <span className="font-mono-numbers px-1.5 py-0.5 rounded bg-[#111827] text-white text-[10px] shrink-0">
                    {activeBay.wbsCode}
                  </span>
                </div>
                <div className="text-[11px] text-[#64748b]">
                  Project: <span className="font-medium text-[#374151]">{activeBay.wbsProject}</span>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-1 xl:grid-cols-2 gap-2 text-xs font-mono-numbers">
                <div className="p-2 rounded-lg bg-white border border-[#e5e7eb]">
                  <span className="text-[11px] text-[#64748b] block">Utilization</span>
                  <span className="text-sm font-medium text-[#111827]">{activeBay.utilization}%</span>
                </div>
                <div className="p-2 rounded-lg bg-white border border-[#e5e7eb]">
                  <span className="text-[11px] text-[#64748b] block">Units</span>
                  <span className="text-sm font-medium text-[#111827]">
                    {activeBay.outputActual} / {activeBay.outputTarget}
                  </span>
                </div>
              </div>

              <div className="mt-3 flex items-center gap-2 text-xs text-[#4b5565]">
                <UserCheck className="w-4 h-4 text-[#64748b]" strokeWidth={1.5} />
                <span>
                  Operator: <span className="font-medium text-[#111827]">{activeBay.operator}</span>
                </span>
              </div>

              <div className="mt-3 p-2.5 rounded-lg bg-white border border-[#e5e7eb] text-xs text-[#4b5565] leading-relaxed">
                <span className="font-medium text-[#111827]">Telemetry Notice:</span>{" "}
                {activeBay.telemetryNote}
              </div>
            </div>

            <div className="pt-3 border-t border-[#e5e7eb]">
              <button
                type="button"
                onClick={() => handleInspectBay(activeBay)}
                className="w-full h-9 bg-[#111827] hover:bg-[#1f2937] text-white text-xs font-medium rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Cpu className="w-3.5 h-3.5 text-[#9ca3af]" strokeWidth={1.5} />
                <span>Inspect Sensor Stream in IRoom</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#e5e7eb] text-[#64748b] text-[11px] font-medium">
                <th className="py-2.5 px-3 font-medium">Work Center</th>
                <th className="py-2.5 px-3 font-medium">Bound WBS Task</th>
                <th className="py-2.5 px-3 font-medium">Utilization</th>
                <th className="py-2.5 px-3 font-medium">Actual vs Target</th>
                <th className="py-2.5 px-3 font-medium">Status</th>
                <th className="py-2.5 px-3 text-right font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f1f5f9]">
              {WORK_CENTERS_TWIN.map((bay) => (
                <tr key={bay.id} className="hover:bg-[#fafafa] transition-colors">
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-2.5">
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${getProgressColor(bay.statusTone)}`} />
                      <div>
                        <div className="font-medium text-[#111827]">{bay.name}</div>
                        <div className="text-[11px] text-[#64748b]">{bay.machineModel}</div>
                      </div>
                    </div>
                  </td>

                  <td className="py-3 px-3">
                    <span className="font-mono-numbers px-2 py-0.5 rounded bg-[#eff6ff] text-[#1d4ed8] font-medium text-[11px]">
                      {bay.wbsCode} · {bay.wbsTask}
                    </span>
                  </td>

                  <td className="py-3 px-3">
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 bg-[#e5e7eb] rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${getProgressColor(bay.statusTone)}`}
                          style={{ width: `${bay.utilization}%` }}
                        />
                      </div>
                      <span className="font-medium font-mono-numbers text-[#374151]">
                        {bay.utilization}%
                      </span>
                    </div>
                  </td>

                  <td className="py-3 px-3 font-mono-numbers text-[#4b5565]">
                    <span className="font-medium text-[#111827]">{bay.outputActual.toLocaleString("en-US")}</span> /{" "}
                    {bay.outputTarget.toLocaleString("en-US")} units
                  </td>

                  <td className="py-3 px-3">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-[11px] font-medium border ${getStatusBadge(
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
                      className="inline-flex items-center gap-1 text-[11px] font-medium text-[#2563eb] hover:text-[#1d4ed8] hover:underline cursor-pointer"
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
