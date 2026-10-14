"use client";

import React, { useState, useEffect } from "react";
import { ProductionLineItem } from "@/types";
import { fetchProductionLines } from "@/lib/api";
import {
  Layers,
  Settings,
  ChevronRight,
  MapPin,
  Table as TableIcon,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Cpu,
  UserCheck,
  CalendarClock
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
    wbsCode: "WBS-1.2",
    wbsTask: "CNC Rough Machining",
    wbsProject: "Project Alpha (Aerospace Tooling)",
    utilization: 92,
    outputActual: 890,
    outputTarget: 1000,
    operator: "Bambang S. (Lead Tech)",
    status: "Attention",
    statusTone: "amber",
    x: 40,
    y: 40,
    w: 320,
    h: 130,
    telemetryNote: "Spindle load 92% · Cascade delay risk +2.0d on critical path",
  },
  {
    id: "bay-02",
    name: "Stamping Press Bay P-07",
    machineModel: "AIDA 600-Ton Hydraulic Press",
    wbsCode: "WBS-1.4",
    wbsTask: "Final Assembly & Stamping Tooling",
    wbsProject: "Precision Stamping Batch #4",
    utilization: 84,
    outputActual: 1240,
    outputTarget: 1300,
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
    name: "CNC Precision Lathe Cell B",
    machineModel: "Mazak Quick Turn 250MSY",
    wbsCode: "WBS-1.1",
    wbsTask: "Material Delivery & Ingot Ingestion",
    wbsProject: "Ingot Shaft Batch #12",
    utilization: 96,
    outputActual: 1450,
    outputTarget: 1400,
    operator: "Dedi K. (Machinist)",
    status: "On track",
    statusTone: "green",
    x: 40,
    y: 195,
    w: 320,
    h: 130,
    telemetryNote: "Nominal telemetry · Ingot lot verified against CAD tolerance",
  },
  {
    id: "bay-04",
    name: "Sub-Assembly & CMM Inspection",
    machineModel: "Hexagon Global CMM + Cleanroom Cell",
    wbsCode: "WBS-1.3",
    wbsTask: "Heat Treatment & Stress Relieving",
    wbsProject: "Avionics Bulkhead Assembly",
    utilization: 98,
    outputActual: 1510,
    outputTarget: 1480,
    operator: "Siti M. (Senior QC)",
    status: "Above target",
    statusTone: "cyan",
    x: 400,
    y: 195,
    w: 360,
    h: 130,
    telemetryNote: "First-Pass Yield 99.2% · AS9100 quality stamp authorized",
  },
];

export const ProductionLineStatus: React.FC<ProductionLineStatusProps> = ({
  onSelectLine
}) => {
  const [viewMode, setViewMode] = useState<"map" | "table">("map");
  const [selectedBayId, setSelectedBayId] = useState<string>("bay-01");
  const [lines, setLines] = useState<ProductionLineItem[]>([]);

  useEffect(() => {
    fetchProductionLines().then((data) => {
      if (data) setLines(data);
    });
  }, []);

  const activeBay =
    WORK_CENTERS_TWIN.find((b) => b.id === selectedBayId) || WORK_CENTERS_TWIN[0];

  const getStatusBadge = (status: ProductionLineItem["status"]) => {
    switch (status) {
      case "On track":
        return "bg-[#e8f8f1] text-[#08784f] border-[#a7f3d0]";
      case "Attention":
        return "bg-[#fff3df] text-[#a35c00] border-[#fed7aa]";
      case "Above target":
        return "bg-[#e0f2fe] text-[#0369a1] border-[#bae6fd]";
      default:
        return "bg-slate-100 text-slate-700";
    }
  };

  const getProgressColor = (status: ProductionLineItem["status"]) => {
    switch (status) {
      case "Attention":
        return "bg-[#f59e0b]";
      case "Above target":
        return "bg-[#06b6d4]";
      default:
        return "bg-[#2563eb]";
    }
  };

  return (
    <div className="bg-white border border-[#e2e8f0] rounded-2xl p-5 sm:p-6 shadow-[0_8px_24px_rgba(19,44,76,0.05)] space-y-4">
      {/* 1. Header with View Mode Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#f1f5f9]">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm sm:text-base font-extrabold text-[#15243a] flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#2563eb]" />
              <span>Shop-Floor Digital Twin &amp; Work Centers</span>
            </h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#eff6ff] text-[#2563eb] border border-[#dbeafe] uppercase tracking-wider">
              WBS Task Linked
            </span>
          </div>
          <p className="text-xs text-[#64748b]">
            Directly binds shop-floor machine cells to active WBS project deliverables and live IRoom telemetry
          </p>
        </div>

        {/* View Switcher Toggle */}
        <div className="flex items-center gap-1.5 p-1 bg-[#f1f5f9] rounded-xl border border-[#e2e8f0] self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setViewMode("map")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              viewMode === "map"
                ? "bg-white text-[#0f172a] shadow-sm border border-[#cbd5e1]"
                : "text-[#64748b] hover:text-[#0f172a]"
            }`}
          >
            <MapPin className="w-3.5 h-3.5 text-[#2563eb]" />
            <span>Spatial Plant Map (2.5D)</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode("table")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              viewMode === "table"
                ? "bg-white text-[#0f172a] shadow-sm border border-[#cbd5e1]"
                : "text-[#64748b] hover:text-[#0f172a]"
            }`}
          >
            <TableIcon className="w-3.5 h-3.5 text-[#64748b]" />
            <span>Table View</span>
          </button>
        </div>
      </div>

      {/* 2. Mode A: 2.5D Spatial Shop-Floor Digital Twin Map */}
      {viewMode === "map" ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* SVG Isometric / Top-Down Factory Floor Grid */}
            <div className="lg:col-span-8 bg-[#0a1526] rounded-2xl p-4 border border-[#1b2f4c] shadow-inner relative overflow-hidden">
              {/* Plant Floor Ambient Header */}
              <div className="flex items-center justify-between text-[11px] font-mono-numbers text-[#94a3b8] mb-2 pb-2 border-b border-[#1b2f4c]/60">
                <span className="flex items-center gap-1.5 text-[#38bdf8] font-bold">
                  <span className="w-2 h-2 rounded-full bg-[#10b981] animate-pulse" />
                  SHOP-FLOOR BAY MATRIX · SHOP A
                </span>
                <span>GRID: 4 WORK CENTERS CONNECTED</span>
              </div>

              {/* Interactive Vector Floor Map */}
              <svg
                viewBox="0 0 780 345"
                className="w-full h-auto block"
                role="img"
                aria-label="Shop-Floor Spatial Map"
              >
                {/* Factory Grid Background Pattern */}
                <defs>
                  <pattern id="plant-grid" width="30" height="30" patternUnits="userSpaceOnUse">
                    <path d="M 30 0 L 0 0 0 30" fill="none" stroke="#162a45" strokeWidth="0.8" />
                  </pattern>
                </defs>
                <rect width="780" height="345" fill="url(#plant-grid)" rx="12" />

                {/* Machine Bay Nodes */}
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

                  const fillColor = isSelected ? "#142845" : "#0f2038";

                  return (
                    <g
                      key={bay.id}
                      onClick={() => setSelectedBayId(bay.id)}
                      className="cursor-pointer transition-all duration-200"
                    >
                      {/* Machine Bay Card Outer Frame */}
                      <rect
                        x={bay.x}
                        y={bay.y}
                        width={bay.w}
                        height={bay.h}
                        rx="10"
                        fill={fillColor}
                        stroke={strokeColor}
                        strokeWidth={isSelected ? "2.5" : "1.2"}
                        strokeDasharray={isSelected ? "none" : "none"}
                        className="transition-colors hover:fill-[#183153]"
                      />

                      {/* Header Strip inside Bay */}
                      <rect
                        x={bay.x}
                        y={bay.y}
                        width={bay.w}
                        height="28"
                        rx="10"
                        fill="#0c1a2d"
                        opacity="0.9"
                      />

                      {/* Status Pulsing Ring LED */}
                      <circle
                        cx={bay.x + 18}
                        cy={bay.y + 14}
                        r="6"
                        fill={strokeColor}
                        opacity="0.3"
                        className="animate-ping"
                      />
                      <circle
                        cx={bay.x + 18}
                        cy={bay.y + 14}
                        r="3.5"
                        fill={strokeColor}
                      />

                      {/* Bay Title & Machine Model */}
                      <text
                        x={bay.x + 32}
                        y={bay.y + 18}
                        fill="#ffffff"
                        fontSize="11"
                        fontWeight="bold"
                        fontFamily="sans-serif"
                      >
                        {bay.name}
                      </text>

                      {/* WBS Badge Pin */}
                      <rect
                        x={bay.x + bay.w - 76}
                        y={bay.y + 6}
                        width="68"
                        height="16"
                        rx="4"
                        fill="#2563eb"
                      />
                      <text
                        x={bay.x + bay.w - 42}
                        y={bay.y + 17}
                        fill="#ffffff"
                        fontSize="9"
                        fontWeight="extrabold"
                        textAnchor="middle"
                        fontFamily="monospace"
                      >
                        {bay.wbsCode}
                      </text>

                      {/* Machine Specs Body */}
                      <text
                        x={bay.x + 14}
                        y={bay.y + 48}
                        fill="#94a3b8"
                        fontSize="10"
                        fontFamily="sans-serif"
                      >
                        Tool: <tspan fill="#e2e8f0">{bay.machineModel}</tspan>
                      </text>

                      <text
                        x={bay.x + 14}
                        y={bay.y + 66}
                        fill="#94a3b8"
                        fontSize="10"
                        fontFamily="sans-serif"
                      >
                        WBS Task: <tspan fill="#38bdf8" fontWeight="bold">{bay.wbsTask}</tspan>
                      </text>

                      {/* Spindle / Line Utilization Progress Bar */}
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

                      {/* Utilization & Output Labels */}
                      <text
                        x={bay.x + 14}
                        y={bay.y + 104}
                        fill="#cbd5e1"
                        fontSize="10"
                        fontWeight="bold"
                        fontFamily="monospace"
                      >
                        Util: {bay.utilization}% · Output: {bay.outputActual.toLocaleString()}u
                      </text>

                      <text
                        x={bay.x + bay.w - 14}
                        y={bay.y + 104}
                        fill={strokeColor}
                        fontSize="10"
                        fontWeight="extrabold"
                        textAnchor="end"
                        fontFamily="sans-serif"
                      >
                        {bay.status}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>

            {/* Right-Side Machine Health & WBS Impact HUD Card */}
            <div className="lg:col-span-4 bg-[#f8fafc] rounded-2xl p-5 border border-[#e2eaf3] flex flex-col justify-between space-y-4 shadow-sm">
              <div>
                <div className="flex items-center justify-between pb-2 border-b border-[#e2e8f0]">
                  <span className="font-mono-numbers text-[10px] font-bold text-[#64748b] uppercase tracking-wide">
                    Live Bay Telemetry Inspector
                  </span>
                  <span
                    className={`font-mono-numbers px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                      activeBay.statusTone === "red"
                        ? "bg-[#fee2e2] text-[#dc2626] border border-[#fecaca]"
                        : activeBay.statusTone === "amber"
                        ? "bg-[#fef3c7] text-[#d97706] border border-[#fde68a]"
                        : "bg-[#dcfce7] text-[#15803d] border border-[#86efac]"
                    }`}
                  >
                    {activeBay.status}
                  </span>
                </div>

                <div className="mt-3 space-y-1">
                  <h3 className="text-sm font-extrabold text-[#0f172a]">{activeBay.name}</h3>
                  <p className="text-xs text-[#64748b]">{activeBay.machineModel}</p>
                </div>

                {/* Direct WBS Project Tie-In Box */}
                <div className="mt-3.5 p-3 rounded-xl bg-white border border-[#cbd5e1] space-y-2">
                  <div className="text-[10px] font-extrabold uppercase text-[#2563eb] tracking-wide flex items-center gap-1.5">
                    <CalendarClock className="w-3.5 h-3.5 text-[#2563eb]" />
                    <span>Bound WBS Work Package</span>
                  </div>
                  <div className="text-xs font-bold text-[#0f172a] flex items-center justify-between">
                    <span>{activeBay.wbsTask}</span>
                    <span className="font-mono-numbers px-1.5 py-0.5 rounded bg-[#0c1a2d] text-white text-[10px]">
                      {activeBay.wbsCode}
                    </span>
                  </div>
                  <div className="text-[11px] text-[#64748b]">
                    Project: <strong className="text-[#334155]">{activeBay.wbsProject}</strong>
                  </div>
                </div>

                {/* Shop-Floor KPIs */}
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs font-mono-numbers">
                  <div className="p-2 rounded-lg bg-white border border-[#e2e8f0]">
                    <span className="text-[10px] text-[#64748b] block">Spindle Load</span>
                    <strong className="text-sm text-[#0f172a]">{activeBay.utilization}%</strong>
                  </div>
                  <div className="p-2 rounded-lg bg-white border border-[#e2e8f0]">
                    <span className="text-[10px] text-[#64748b] block">Units Done</span>
                    <strong className="text-sm text-[#0f172a]">
                      {activeBay.outputActual} / {activeBay.outputTarget}
                    </strong>
                  </div>
                </div>

                {/* Active Operator */}
                <div className="mt-3 flex items-center gap-2 text-xs text-[#334155]">
                  <UserCheck className="w-4 h-4 text-[#2563eb]" />
                  <span>Operator: <strong>{activeBay.operator}</strong></span>
                </div>

                {/* Telemetry Alert Note */}
                <div className="mt-3 p-2.5 rounded-lg bg-[#eff6ff] border border-[#bfdbfe] text-xs text-[#1e40af] leading-relaxed">
                  <strong>Telemetry Notice:</strong> {activeBay.telemetryNote}
                </div>
              </div>

              <div className="pt-3 border-t border-[#e2e8f0]">
                <button
                  type="button"
                  onClick={() => {
                    const line = lines.find((l) => l.name.includes(activeBay.wbsCode)) || lines[0];
                    if (line) onSelectLine?.(line);
                  }}
                  className="w-full py-2 bg-[#0c1a2d] hover:bg-[#152a45] text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Cpu className="w-3.5 h-3.5 text-[#38bdf8]" />
                  <span>Inspect Sensor Stream in IRoom</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* 3. Mode B: Standard Table View */
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#e2e8f0] text-[#64748b] uppercase tracking-wider text-[10px]">
                <th className="py-2.5 px-3">Production Line / Cell</th>
                <th className="py-2.5 px-3">Bound WBS Task</th>
                <th className="py-2.5 px-3">Spindle / Line Utilization</th>
                <th className="py-2.5 px-3">Actual vs Target</th>
                <th className="py-2.5 px-3">Telemetry Status</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f1f5f9]">
              {lines.map((line, idx) => {
                const twin = WORK_CENTERS_TWIN[idx % WORK_CENTERS_TWIN.length];
                return (
                  <tr key={line.id} className="hover:bg-[#f8fafc] transition-colors">
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-[#f0f4f9] flex items-center justify-center text-[#2563eb] shrink-0">
                          <Settings className="w-3.5 h-3.5" />
                        </div>
                        <span className="font-bold text-[#1e293b]">{line.name}</span>
                      </div>
                    </td>

                    <td className="py-3 px-3">
                      <span className="font-mono-numbers px-1.5 py-0.5 rounded bg-[#eff6ff] text-[#1d4ed8] font-bold text-[10px]">
                        {twin.wbsCode} · {twin.wbsTask}
                      </span>
                    </td>

                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-[#e2e8f0] rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${getProgressColor(line.status)}`}
                            style={{ width: `${line.utilization}%` }}
                          />
                        </div>
                        <span className="font-semibold text-[#334155]">{line.utilization}%</span>
                      </div>
                    </td>

                    <td className="py-3 px-3 font-mono-numbers text-[#334155]">
                      <strong>{line.outputActual.toLocaleString()}</strong> / {line.outputTarget.toLocaleString()} units
                    </td>

                    <td className="py-3 px-3">
                      <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold border ${getStatusBadge(line.status)}`}>
                        {line.status}
                      </span>
                    </td>

                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => onSelectLine?.(line)}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-[#2563eb] hover:text-[#1d4ed8] hover:underline cursor-pointer"
                      >
                        <span>Inspect</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
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
