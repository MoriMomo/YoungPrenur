"use client";

import React, { useState, useEffect } from "react";
import {
  MaterialDeliveryItem,
  ProjectProgressItem,
  DrawingApprovalItem,
  QuotationPoItem,
  OperationTrackerItem,
} from "@/types";
import {
  fetchIRoomMaterials,
  fetchIRoomProjects,
  fetchIRoomDrawings,
  fetchIRoomQuotations,
  fetchIRoomOperations,
} from "@/lib/api";
import {
  PackageCheck,
  TrendingUp,
  FileText,
  CreditCard,
  Cpu,
  Search,
  Eye,
  CheckCircle2,
  Check,
  MessageSquareText,
} from "lucide-react";

export type IRoomTab = "material" | "progress" | "drawing" | "quotation" | "operations";

interface IRoomWorkspaceProps {
  initialTab?: IRoomTab;
  isApiLive?: boolean;
  onAskCopilot?: (contextQuery: string) => void;
  onToast?: (msg: string) => void;
}

function IRoomTable({
  headers,
  children,
}: {
  headers: string[];
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs">
        <thead>
          <tr className="border-b border-[#e2eaf3] text-[#64748b] text-[11px] font-semibold">
            {headers.map((header, idx) => (
              <th
                key={header}
                className={`py-2.5 px-3${idx === headers.length - 1 ? " text-right" : ""}`}
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[#f1f5f9]">{children}</tbody>
      </table>
    </div>
  );
}

export const IRoomWorkspace: React.FC<IRoomWorkspaceProps> = ({
  initialTab = "material",
  isApiLive = false,
  onAskCopilot,
  onToast,
}) => {
  const [activeTab, setActiveTab] = useState<IRoomTab>(initialTab);
  const [materials, setMaterials] = useState<MaterialDeliveryItem[]>([]);
  const [projects, setProjects] = useState<ProjectProgressItem[]>([]);
  const [drawings, setDrawings] = useState<DrawingApprovalItem[]>([]);
  const [quotations, setQuotations] = useState<QuotationPoItem[]>([]);
  const [operations, setOperations] = useState<OperationTrackerItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  const [selectedDwgId, setSelectedDwgId] = useState<string>("dwg-01");
  const [activeRevision, setActiveRevision] = useState<"Rev 2.0" | "Rev 3.1">("Rev 3.1");
  const [showGdtOverlay, setShowGdtOverlay] = useState<boolean>(true);

  useEffect(() => {
    let active = true;
    fetchIRoomMaterials().then((d) => active && setMaterials(d));
    fetchIRoomProjects().then((d) => active && setProjects(d));
    fetchIRoomDrawings().then((d) => active && setDrawings(d));
    fetchIRoomQuotations().then((d) => active && setQuotations(d));
    fetchIRoomOperations().then((d) => active && setOperations(d));
    return () => {
      active = false;
    };
  }, []);

  const tabs = [
    {
      id: "material" as const,
      label: "Material Delivery",
      icon: PackageCheck,
      alert: materials.some((m) => m.status === "Critical"),
    },
    {
      id: "progress" as const,
      label: "Project Progress",
      icon: TrendingUp,
      alert: projects.some((p) => p.status === "Critical Risk"),
    },
    {
      id: "drawing" as const,
      label: "Drawing Approval",
      icon: FileText,
      alert: drawings.some((d) => d.status === "Pending Review"),
    },
    {
      id: "quotation" as const,
      label: "Quotation & PO",
      icon: CreditCard,
      alert: quotations.some((q) => q.status === "Pending Approval"),
    },
    {
      id: "operations" as const,
      label: "Operation Tracker",
      icon: Cpu,
      alert: operations.some((o) => o.vibrationSensor === "ELEVATED"),
    },
  ];

  const selectedDrawing =
    drawings.find((d) => d.id === selectedDwgId) ||
    drawings[0] || {
      id: "dwg-01",
      dwgNumber: "DWG-2026-04-REV-C",
      title: "Upper Stamping Punch Geometry & Clearance",
      revision: "Rev C.2",
      engineer: "Hendra Wijaya, ST",
      department: "Tooling R&D",
      submittedDate: "13 Oct 2026 14:15",
      status: "Pending Review" as const,
      criticalDwg: true,
    };

  const handleInspectWithAI = (entityName: string, detail: string) => {
    const query = `Analyze IRoom ${activeTab.toUpperCase()} record ${entityName}: ${detail}. Provide recommended mitigation and SOP reference.`;
    onAskCopilot?.(query);
    onToast?.(`Analyzing ${entityName} in Manufacturing Copilot.`);
  };

  const handleApproveSelectedDrawing = () => {
    setDrawings((prev) =>
      prev.map((d) =>
        d.id === selectedDrawing.id ? { ...d, status: "Approved" } : d
      )
    );
    onToast?.(
      `Drawing ${selectedDrawing.dwgNumber} (${selectedDrawing.revision}) approved for Gate 3.`
    );
  };

  return (
    <div className="space-y-6">
      {/* Module Header */}
      <div className="bg-[#0c1a2d] border border-[#1e3450] rounded-xl p-6 text-white">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="text-xs font-medium text-[#60a5fa] mb-1">
              IRoom System Ingestion Layer (Pilot Scope Connector)
            </div>
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">
              Unified IRoom Telemetry Hub
            </h1>
            <p className="text-xs sm:text-sm text-[#94a3b8] max-w-2xl mt-1">
              Correlates 5 operational modules (Material, Progress, Drawing, PO, Operations) into role-based decision support with human approval gates.
            </p>
          </div>

          <div className="bg-[#081220] border border-[#234268] rounded-xl px-4 py-2 text-right self-start md:self-auto">
            <div className="text-[11px] text-[#93c5fd] font-medium">
              IRoom Connector Status
            </div>
            <div className="text-xs sm:text-sm font-medium flex items-center gap-2 justify-end mt-0.5">
              <span
                className={`w-2 h-2 rounded-full ${
                  isApiLive ? "bg-[#10b981]" : "bg-[#f59e0b]"
                }`}
              />
              <span className={isApiLive ? "text-[#34d399]" : "text-[#fbbf24]"}>
                {isApiLive ? "FastAPI PoC Connected" : "Simulated Pilot Dataset"}
              </span>
            </div>
          </div>
        </div>

        {/* 5-Stream Tabs */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mt-5 pt-5 border-t border-[#1e3450]">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold transition-colors text-left cursor-pointer ${
                  isSelected
                    ? "bg-[#2563eb] text-white"
                    : "bg-[#142842] hover:bg-[#1e395c] text-[#cad8e8]"
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isSelected ? "text-white" : "text-[#60a5fa]"}`} />
                <span className="truncate flex-1">{tab.label}</span>
                {tab.alert && (
                  <span className="w-2 h-2 rounded-full bg-[#f87171] shrink-0" title="Attention needed" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content Card */}
      <div className="bg-white border border-[#e2eaf3] rounded-xl p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-[#94a3b8] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={`Search ${activeTab} records, codes, or suppliers`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs pl-9 pr-3 py-2 border border-[#cbd5e1] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2563eb] bg-[#f8fafc]"
            />
          </div>

          <div className="text-xs text-[#64748b] font-medium flex items-center gap-2">
            <span>Active stream:</span>
            <strong className="text-[#101e30] capitalize bg-[#f1f5f9] px-2.5 py-1 rounded-md font-mono-numbers">
              {activeTab}
            </strong>
          </div>
        </div>

        {/* 1. Material Delivery */}
        {activeTab === "material" && (
          <IRoomTable
            headers={[
              "Part Number & Material",
              "Supplier",
              "ETA & Cover Window",
              "Risk Score",
              "Purchase Order",
              "Copilot Action",
            ]}
          >
            {materials
                  .filter(
                    (m) =>
                      m.partNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      m.supplier.toLowerCase().includes(searchQuery.toLowerCase())
                  )
                  .map((mat) => (
                    <tr key={mat.id} className="hover:bg-[#f8fafc] transition-colors">
                      <td className="py-3 px-3">
                        <div className="font-medium text-[#111827]">{mat.partNumber}</div>
                        <div className="text-[11px] text-[#64748b] truncate max-w-xs">
                          {mat.description}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-[#374151] font-medium">{mat.supplier}</td>
                      <td className="py-3 px-3">
                        <div className="font-medium text-[#111827]">{mat.eta}</div>
                        <div className="text-[11px] text-[#dc2626] font-mono-numbers font-medium">
                          {mat.stockCoverHours}h stock cover left
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[11px] font-medium border ${
                            mat.status === "Critical"
                              ? "bg-[#fee2e2] text-[#b91c1c] border-[#fca5a5]"
                              : mat.status === "At Risk"
                              ? "bg-[#fef3c7] text-[#b45309] border-[#fde68a]"
                              : "bg-[#e6f7f0] text-[#0d9263] border-[#a7f3d0]"
                          }`}
                        >
                          {mat.status} ({(mat.riskScore * 100).toFixed(0)}%)
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono-numbers text-[#2563eb] font-semibold">
                        {mat.openPo}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          type="button"
                          onClick={() =>
                            handleInspectWithAI(
                              mat.partNumber,
                              `Stock cover ${mat.stockCoverHours}h vs Lead time ${mat.supplierLeadDays}d, PO ${mat.openPo}`
                            )
                          }
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#0c1a2d] hover:bg-[#1a3354] text-white rounded-lg text-[11px] font-semibold transition-colors cursor-pointer"
                        >
                          <MessageSquareText className="w-3 h-3 text-[#60a5fa]" />
                          <span>Mitigate</span>
                        </button>
                      </td>
                    </tr>
                  ))}
          </IRoomTable>
        )}

        {/* 2. Project Progress */}
        {activeTab === "progress" && (
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
        )}

        {/* 3. Drawing Approval + Dynamic CAD Inspector */}
        {activeTab === "drawing" && (
          <div className="space-y-5">
            <div className="bg-[#06142a] rounded-xl p-4 sm:p-5 border border-[#1a3356] text-white overflow-hidden">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 mb-3 border-b border-[#1b3457]">
                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-[#2563eb] text-white font-mono-numbers">
                      CAD GD&amp;T Inspector
                    </span>
                    <span className="text-[11px] text-[#93c5fd] font-mono-numbers">
                      {selectedDrawing.dwgNumber} · {selectedDrawing.revision}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                        selectedDrawing.status === "Approved"
                          ? "bg-[#16a34a] text-white"
                          : "bg-[#d97706] text-white"
                      }`}
                    >
                      {selectedDrawing.status}
                    </span>
                  </div>
                  <h3 className="text-sm sm:text-base font-medium text-white">
                    {selectedDrawing.title}
                  </h3>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center bg-[#0c1e38] p-1 rounded-xl border border-[#244570]">
                    <button
                      type="button"
                      onClick={() => setActiveRevision("Rev 2.0")}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                        activeRevision === "Rev 2.0"
                          ? "bg-[#dc2626] text-white"
                          : "text-[#94a3b8] hover:text-white"
                      }`}
                    >
                      Rev 2.0 (Baseline)
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveRevision("Rev 3.1")}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                        activeRevision === "Rev 3.1"
                          ? "bg-[#16a34a] text-white"
                          : "text-[#94a3b8] hover:text-white"
                      }`}
                    >
                      Rev 3.1 (Compensated)
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowGdtOverlay(!showGdtOverlay)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors cursor-pointer ${
                      showGdtOverlay
                        ? "bg-[#2563eb] text-white border-[#3b82f6]"
                        : "bg-[#0c1e38] text-[#94a3b8] border-[#244570]"
                    }`}
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>GD&amp;T Overlay: {showGdtOverlay ? "ON" : "OFF"}</span>
                  </button>
                </div>
              </div>

              <div className="relative w-full rounded-xl bg-[#040e1e] border border-[#162d4e] overflow-hidden p-2">
                <svg
                  viewBox="0 0 760 300"
                  className="w-full h-auto block select-none"
                  role="img"
                  aria-label={`CAD blueprint for ${selectedDrawing.dwgNumber}`}
                >
                  <rect width="760" height="300" fill="#040e1e" />

                  <g stroke="#244570" strokeWidth="1">
                    <path d="M 15 25 L 15 15 L 25 15" fill="none" />
                    <path d="M 745 25 L 745 15 L 735 15" fill="none" />
                    <path d="M 15 275 L 15 285 L 25 285" fill="none" />
                    <path d="M 745 275 L 745 285 L 735 285" fill="none" />
                  </g>

                  {/* Title Box bound to selectedDrawing */}
                  <rect
                    x="515"
                    y="218"
                    width="230"
                    height="72"
                    fill="#06142a"
                    stroke="#244570"
                    strokeWidth="1"
                    rx="4"
                  />
                  <text x="525" y="235" fill="#94a3b8" fontSize="9" fontFamily="monospace">
                    DOC: {selectedDrawing.dwgNumber}
                  </text>
                  <text x="525" y="250" fill="#60a5fa" fontSize="9.5" fontWeight="bold" fontFamily="monospace">
                    ENG: {selectedDrawing.engineer}
                  </text>
                  <text x="525" y="265" fill="#94a3b8" fontSize="9" fontFamily="monospace">
                    VIEW: {activeRevision} · {selectedDrawing.department}
                  </text>
                  <text x="525" y="280" fill="#64748b" fontSize="8" fontFamily="monospace">
                    ISO 2768-m / AS9100D · IMAJIN CAD
                  </text>

                  {/* View A */}
                  <g transform="translate(170, 150)">
                    <line
                      x1="-120"
                      y1="0"
                      x2="120"
                      y2="0"
                      stroke="#0284c7"
                      strokeWidth="0.8"
                      strokeDasharray="8 3 2 3"
                      opacity="0.6"
                    />
                    <line
                      x1="0"
                      y1="-120"
                      x2="0"
                      y2="120"
                      stroke="#0284c7"
                      strokeWidth="0.8"
                      strokeDasharray="8 3 2 3"
                      opacity="0.6"
                    />
                    <circle cx="0" cy="0" r="105" fill="none" stroke="#e2e8f0" strokeWidth="2.5" />
                    <circle
                      cx="0"
                      cy="0"
                      r="82"
                      fill="none"
                      stroke="#38bdf8"
                      strokeWidth="1"
                      strokeDasharray="4 4"
                      opacity="0.7"
                    />

                    {[0, 60, 120, 180, 240, 300].map((deg) => {
                      const rad = (deg * Math.PI) / 180;
                      const hx = 82 * Math.cos(rad);
                      const hy = 82 * Math.sin(rad);
                      return (
                        <circle
                          key={deg}
                          cx={hx}
                          cy={hy}
                          r="6.5"
                          fill="#040e1e"
                          stroke="#38bdf8"
                          strokeWidth="1.5"
                        />
                      );
                    })}

                    <circle
                      cx="0"
                      cy="0"
                      r="40"
                      fill={
                        activeRevision === "Rev 3.1"
                          ? "rgba(16, 185, 129, 0.08)"
                          : "rgba(239, 68, 68, 0.12)"
                      }
                      stroke={activeRevision === "Rev 3.1" ? "#10b981" : "#ef4444"}
                      strokeWidth="2.5"
                    />

                    {showGdtOverlay && (
                      <rect
                        x="-52"
                        y="-52"
                        width="104"
                        height="104"
                        rx="6"
                        fill="none"
                        stroke={activeRevision === "Rev 3.1" ? "#10b981" : "#ef4444"}
                        strokeWidth="2"
                        strokeDasharray="5 3"
                      />
                    )}

                    <text
                      x="0"
                      y="-112"
                      fill="#94a3b8"
                      fontSize="9"
                      textAnchor="middle"
                      fontFamily="monospace"
                    >
                      VIEW A: FLANGE ELEVATION (PCD Ø 164)
                    </text>
                  </g>

                  {/* View B */}
                  <g transform="translate(380, 150)">
                    <line
                      x1="-30"
                      y1="0"
                      x2="110"
                      y2="0"
                      stroke="#0284c7"
                      strokeWidth="0.8"
                      strokeDasharray="8 3 2 3"
                      opacity="0.6"
                    />
                    <path
                      d={
                        activeRevision === "Rev 3.1"
                          ? "M 0 -105 L 26 -105 L 26 -40 L 95 -40 L 95 40 L 26 40 L 26 105 L 0 105 Z"
                          : "M 0 -105 L 20 -105 L 20 -40 L 90 -40 L 90 40 L 20 40 L 20 105 L 0 105 Z"
                      }
                      fill="rgba(56, 189, 248, 0.06)"
                      stroke="#e2e8f0"
                      strokeWidth="2"
                    />
                    <text
                      x="45"
                      y="125"
                      fill="#94a3b8"
                      fontSize="9"
                      textAnchor="middle"
                      fontFamily="monospace"
                    >
                      SECTION B-B ({activeRevision})
                    </text>
                  </g>

                  {showGdtOverlay && (
                    <g>
                      <polyline
                        points="210,135 270,75 490,75"
                        fill="none"
                        stroke={activeRevision === "Rev 3.1" ? "#10b981" : "#ef4444"}
                        strokeWidth="1.5"
                      />
                      <circle
                        cx="210"
                        cy="135"
                        r="3"
                        fill={activeRevision === "Rev 3.1" ? "#10b981" : "#ef4444"}
                      />
                      <rect
                        x="490"
                        y="35"
                        width="255"
                        height="78"
                        rx="8"
                        fill="#081b33"
                        stroke={activeRevision === "Rev 3.1" ? "#10b981" : "#ef4444"}
                        strokeWidth="1.5"
                      />
                      <text
                        x="502"
                        y="52"
                        fill={activeRevision === "Rev 3.1" ? "#34d399" : "#f87171"}
                        fontSize="10"
                        fontWeight="bold"
                      >
                        {activeRevision === "Rev 3.1"
                          ? "GD&T COMPENSATED: PASS"
                          : "GD&T DEVIATION: BORE -0.040mm"}
                      </text>
                      <text x="502" y="68" fill="#e2e8f0" fontSize="9" fontFamily="monospace">
                        Nominal: Ø 84.000 H7 (+0.035 / 0.000)
                      </text>
                      <text
                        x="502"
                        y="82"
                        fill={activeRevision === "Rev 3.1" ? "#a7f3d0" : "#fca5a5"}
                        fontSize="9"
                        fontFamily="monospace"
                      >
                        {activeRevision === "Rev 3.1"
                          ? "Measured: Ø 84.015mm (+Offset applied)"
                          : "Measured: Ø 83.960mm (Spindle Drift)"}
                      </text>
                      <text x="502" y="98" fill="#94a3b8" fontSize="8">
                        {activeRevision === "Rev 3.1"
                          ? "Ready for WBS-2.1 CNC Cell A"
                          : "Root Cause: Cell A Thermal Drift (+1.8C)"}
                      </text>
                    </g>
                  )}
                </svg>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-3 pt-3 border-t border-[#1b3457]">
                <div className="text-xs text-[#94a3b8] flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#10b981]" />
                  <span>
                    Owner: <strong className="text-white">{selectedDrawing.engineer}</strong> (
                    {selectedDrawing.department})
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      handleInspectWithAI(
                        selectedDrawing.dwgNumber,
                        `${selectedDrawing.title}, revision ${selectedDrawing.revision}, current status ${selectedDrawing.status}`
                      )
                    }
                    className="px-3 py-1.5 rounded-xl bg-[#1e3a63] hover:bg-[#25497d] text-white text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <MessageSquareText className="w-3.5 h-3.5 text-[#60a5fa]" />
                    <span>Verify in Copilot</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleApproveSelectedDrawing}
                    disabled={selectedDrawing.status === "Approved"}
                    className="px-3 py-1.5 rounded-lg bg-[#2563eb] hover:bg-[#1d4ed8] disabled:bg-[#16a34a] text-white text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer disabled:cursor-default"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>
                      {selectedDrawing.status === "Approved"
                        ? "Gate 3 Approved"
                        : "Authorize Gate 3 Approval"}
                    </span>
                  </button>
                </div>
              </div>
            </div>

            <IRoomTable
              headers={[
                "Drawing Document",
                "Revision",
                "Tooling Engineer",
                "Submitted",
                "Approval Gate",
                "CAD Action",
              ]}
            >
              {drawings
                    .filter(
                      (d) =>
                        d.dwgNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        d.title.toLowerCase().includes(searchQuery.toLowerCase())
                    )
                    .map((dwg) => (
                      <tr
                        key={dwg.id}
                        onClick={() => setSelectedDwgId(dwg.id)}
                        className={`transition-colors cursor-pointer ${
                          selectedDrawing.id === dwg.id ? "bg-[#eff6ff]" : "hover:bg-[#f8fafc]"
                        }`}
                      >
                        <td className="py-3 px-3">
                          <div className="font-medium text-[#111827] flex items-center gap-1.5">
                            <span>{dwg.dwgNumber}</span>
                            {dwg.criticalDwg && (
                              <span className="px-1.5 py-0.5 bg-[#fef2f2] text-[#dc2626] font-medium text-[10px] rounded">
                                Critical
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-[#64748b]">{dwg.title}</div>
                        </td>
                        <td className="py-3 px-3 font-mono-numbers text-[#111827] font-medium">
                          {dwg.revision}
                        </td>
                        <td className="py-3 px-3 text-[#374151]">
                          {dwg.engineer} ({dwg.department})
                        </td>
                        <td className="py-3 px-3 text-[#64748b] font-mono-numbers">
                          {dwg.submittedDate}
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[11px] font-medium border ${
                              dwg.status === "Approved"
                                ? "bg-[#e6f7f0] text-[#0d9263] border-[#a7f3d0]"
                                : dwg.status === "Pending Review"
                                ? "bg-[#fef3c7] text-[#b45309] border-[#fde68a]"
                                : "bg-[#fee2e2] text-[#b91c1c] border-[#fca5a5]"
                            }`}
                          >
                            {dwg.status}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedDwgId(dwg.id);
                              handleInspectWithAI(
                                dwg.dwgNumber,
                                `${dwg.title}, status ${dwg.status}, engineer ${dwg.engineer}`
                              );
                            }}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#0c1a2d] hover:bg-[#1a3354] text-white rounded-lg text-[11px] font-semibold transition-colors cursor-pointer"
                          >
                            <Eye className="w-3 h-3 text-[#60a5fa]" />
                            <span>Inspect with AI</span>
                          </button>
                        </td>
                      </tr>
                    ))}
            </IRoomTable>
          </div>
        )}

        {/* 4. Quotation & PO */}
        {activeTab === "quotation" && (
          <IRoomTable
            headers={[
              "PO Number & QTN Ref",
              "Vendor Name",
              "Total Value (IDR)",
              "Payment Term",
              "Status",
              "Copilot Action",
            ]}
          >
            {quotations
                  .filter(
                    (q) =>
                      q.poNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      q.vendorName.toLowerCase().includes(searchQuery.toLowerCase())
                  )
                  .map((po) => (
                    <tr key={po.id} className="hover:bg-[#f8fafc] transition-colors">
                      <td className="py-3 px-3">
                        <div className="font-medium text-[#111827] flex items-center gap-1.5">
                          <span className="font-mono-numbers">{po.poNumber}</span>
                          {po.expedited && (
                            <span className="px-1.5 py-0.5 bg-[#fffbeb] text-[#b45309] font-medium text-[10px] rounded">
                              Expedite
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-[#64748b] font-mono-numbers">
                          Ref: {po.quotationRef}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-[#374151] font-medium">{po.vendorName}</td>
                      <td className="py-3 px-3 font-mono-numbers text-[#111827] font-medium">
                        {po.totalValueIdr}
                      </td>
                      <td className="py-3 px-3 text-[#64748b]">{po.paymentTerm}</td>
                      <td className="py-3 px-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[11px] font-medium border ${
                            po.status === "PO Issued"
                              ? "bg-[#e6f7f0] text-[#0d9263] border-[#a7f3d0]"
                              : "bg-[#fef3c7] text-[#b45309] border-[#fde68a]"
                          }`}
                        >
                          {po.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          type="button"
                          onClick={() =>
                            handleInspectWithAI(
                              po.poNumber,
                              `Vendor ${po.vendorName}, value ${po.totalValueIdr}, term ${po.paymentTerm}`
                            )
                          }
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#0c1a2d] hover:bg-[#1a3354] text-white rounded-lg text-[11px] font-semibold transition-colors cursor-pointer"
                        >
                          <MessageSquareText className="w-3 h-3 text-[#60a5fa]" />
                          <span>Assess PO</span>
                        </button>
                      </td>
                    </tr>
                  ))}
          </IRoomTable>
        )}

        {/* 5. Operation Tracker */}
        {activeTab === "operations" && (
          <IRoomTable
            headers={[
              "Work Center & Machine",
              "Operator & Shift",
              "OEE & Spindle Load",
              "Vibration Sensor",
              "Active Job",
              "Copilot Action",
            ]}
          >
            {operations
                  .filter(
                    (op) =>
                      op.workCenter.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      op.machineId.toLowerCase().includes(searchQuery.toLowerCase())
                  )
                  .map((op) => (
                    <tr key={op.id} className="hover:bg-[#f8fafc] transition-colors">
                      <td className="py-3 px-3">
                        <div className="font-medium text-[#111827]">{op.workCenter}</div>
                        <div className="text-[11px] font-mono-numbers text-[#64748b]">
                          {op.machineId}
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-medium text-[#111827]">{op.operator}</div>
                        <div className="text-[11px] text-[#64748b]">{op.shift}</div>
                      </td>
                      <td className="py-3 px-3 font-mono-numbers">
                        <div className="font-medium text-[#111827]">OEE: {op.oeePercent}%</div>
                        <div className="text-[11px] text-[#2563eb]">
                          Spindle: {op.spindleUtilization}%
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[11px] font-medium border font-mono-numbers ${
                            op.vibrationSensor === "ELEVATED"
                              ? "bg-[#fee2e2] text-[#b91c1c] border-[#fca5a5]"
                              : "bg-[#e6f7f0] text-[#0d9263] border-[#a7f3d0]"
                          }`}
                        >
                          {op.vibrationSensor}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono-numbers text-[#334155] font-medium">
                        {op.activeJob}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          type="button"
                          onClick={() =>
                            handleInspectWithAI(
                              op.machineId,
                              `Work center ${op.workCenter}, OEE ${op.oeePercent}%, Vibration ${op.vibrationSensor}`
                            )
                          }
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#0c1a2d] hover:bg-[#1a3354] text-white rounded-lg text-[11px] font-semibold transition-colors cursor-pointer"
                        >
                          <MessageSquareText className="w-3 h-3 text-[#60a5fa]" />
                          <span>Sensor RCA</span>
                        </button>
                      </td>
                    </tr>
                  ))}
          </IRoomTable>
        )}
      </div>
    </div>
  );
};
