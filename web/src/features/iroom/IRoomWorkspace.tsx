"use client";

import React, { useState, useEffect } from "react";
import {
  MaterialDeliveryItem,
  ProjectProgressItem,
  DrawingApprovalItem,
  QuotationPoItem,
  OperationTrackerItem
} from "@/types";
import {
  fetchIRoomMaterials,
  fetchIRoomProjects,
  fetchIRoomDrawings,
  fetchIRoomQuotations,
  fetchIRoomOperations
} from "@/lib/api";
import {
  PackageCheck,
  TrendingUp,
  FileText,
  CreditCard,
  Cpu,
  Sparkles,
  Search,
  Eye,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Check,
  Maximize2
} from "lucide-react";

type IRoomTab = "material" | "progress" | "drawing" | "quotation" | "operations";

interface IRoomWorkspaceProps {
  onAskCopilot?: (contextQuery: string) => void;
  onToast?: (msg: string) => void;
}

export const IRoomWorkspace: React.FC<IRoomWorkspaceProps> = ({
  onAskCopilot,
  onToast
}) => {
  const [activeTab, setActiveTab] = useState<IRoomTab>("material");
  const [materials, setMaterials] = useState<MaterialDeliveryItem[]>([]);
  const [projects, setProjects] = useState<ProjectProgressItem[]>([]);
  const [drawings, setDrawings] = useState<DrawingApprovalItem[]>([]);
  const [quotations, setQuotations] = useState<QuotationPoItem[]>([]);
  const [operations, setOperations] = useState<OperationTrackerItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  // CAD Blueprint Inspector State
  const [selectedDwgId, setSelectedDwgId] = useState<string>("dwg-01");
  const [activeRevision, setActiveRevision] = useState<"Rev 2.0" | "Rev 3.1">("Rev 3.1");
  const [showGdtOverlay, setShowGdtOverlay] = useState<boolean>(true);

  useEffect(() => {
    fetchIRoomMaterials().then(setMaterials);
    fetchIRoomProjects().then(setProjects);
    fetchIRoomDrawings().then(setDrawings);
    fetchIRoomQuotations().then(setQuotations);
    fetchIRoomOperations().then(setOperations);

    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get("tab") as IRoomTab;
      if (tabParam && ["material", "progress", "drawing", "quotation", "operations"].includes(tabParam)) {
        setActiveTab(tabParam);
      }
    }
  }, []);

  const tabs = [
    { id: "material" as const, label: "Material Delivery", icon: PackageCheck, count: materials.length, alert: materials.some(m => m.status === "Critical") },
    { id: "progress" as const, label: "Project Progress", icon: TrendingUp, count: projects.length, alert: projects.some(p => p.status === "Critical Risk") },
    { id: "drawing" as const, label: "Drawing Approval", icon: FileText, count: drawings.length, alert: drawings.some(d => d.status === "Pending Review") },
    { id: "quotation" as const, label: "Quotation & PO", icon: CreditCard, count: quotations.length, alert: quotations.some(q => q.status === "Pending Approval") },
    { id: "operations" as const, label: "Operation Tracker", icon: Cpu, count: operations.length, alert: operations.some(o => o.vibrationSensor === "ELEVATED") },
  ];

  const handleInspectWithAI = (entityName: string, detail: string) => {
    const query = `Analisis modul IRoom ${activeTab.toUpperCase()}: ${entityName}. Detail: ${detail}. Berikan rekomendasi mitigasi risiko segera.`;
    onAskCopilot?.(query);
    onToast?.(`Sent ${entityName} to Manufacturing AI Copilot.`);
  };

  return (
    <div className="space-y-6">
      {/* Module Overview Header */}
      <div className="bg-gradient-to-r from-[#102238] via-[#173050] to-[#102238] border border-[#234268] rounded-2xl p-6 text-white shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#2563eb]/30 border border-[#3b82f6]/40 text-[#60a5fa] text-[11px] font-bold uppercase tracking-wider mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>IRoom Manufacturing Ingestion Layer</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight">
              Unified IRoom Telemetry Hub
            </h1>
            <p className="text-xs sm:text-sm text-[#94a3b8] max-w-2xl mt-1">
              Transforms live factory records from IRoom modules into cross-departmental actionable decision intelligence with Human-in-the-Loop governance.
            </p>
          </div>

          <div className="flex items-center gap-3 self-start md:self-auto">
            <div className="bg-[#0c1a2d]/80 border border-[#2b4865] rounded-xl px-4 py-2 text-right">
              <div className="text-[10px] text-[#93c5fd] uppercase tracking-wider font-semibold">
                IRoom Connector Sync
              </div>
              <div className="text-sm font-extrabold text-[#4ade80] flex items-center gap-1.5 justify-end">
                <span className="w-2 h-2 rounded-full bg-[#4ade80] animate-pulse" />
                <span>Connected (100% Live)</span>
              </div>
            </div>
          </div>
        </div>

        {/* 5-Stream Tab Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mt-6 pt-5 border-t border-[#234268]">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold transition-all text-left cursor-pointer ${
                  isSelected
                    ? "bg-[#2563eb] text-white shadow-md shadow-[#2563eb]/20"
                    : "bg-[#162a42] hover:bg-[#1f3a5a] text-[#cad8e8]"
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isSelected ? "text-white" : "text-[#38bdf8]"}`} />
                <span className="truncate flex-1">{tab.label}</span>
                {tab.alert && (
                  <span className="w-2 h-2 rounded-full bg-[#f87171] shrink-0" title="Attention needed" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Tab Content Card */}
      <div className="bg-white border border-[#e2e8f0] rounded-2xl p-5 sm:p-6 shadow-[0_8px_24px_rgba(19,44,76,0.05)]">
        {/* Search & Filter Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-[#94a3b8] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={`Search ${activeTab} records, part codes, or suppliers...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs pl-9 pr-3 py-2 border border-[#cbd5e1] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2563eb] bg-[#f8fafc]"
            />
          </div>

          <div className="text-xs text-[#64748b] font-medium flex items-center gap-2">
            <span>Showing active telemetry for:</span>
            <strong className="text-[#1e293b] uppercase bg-[#f1f5f9] px-2.5 py-1 rounded-md">
              {activeTab}
            </strong>
          </div>
        </div>

        {/* 1. Material Delivery Tab */}
        {activeTab === "material" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#e2e8f0] text-[#64748b] uppercase tracking-wider text-[10px]">
                  <th className="py-2.5 px-3">Part Number & Material</th>
                  <th className="py-2.5 px-3">Supplier</th>
                  <th className="py-2.5 px-3">ETA & Cover Window</th>
                  <th className="py-2.5 px-3">Risk Assessment</th>
                  <th className="py-2.5 px-3">Purchase Order</th>
                  <th className="py-2.5 px-3 text-right">AI Copilot Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f1f5f9]">
                {materials
                  .filter(m => m.partNumber.toLowerCase().includes(searchQuery.toLowerCase()) || m.supplier.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map((mat) => (
                    <tr key={mat.id} className="hover:bg-[#f8fafc] transition-colors">
                      <td className="py-3 px-3">
                        <div className="font-extrabold text-[#15243a]">{mat.partNumber}</div>
                        <div className="text-[11px] text-[#64748b] truncate max-w-xs">{mat.description}</div>
                      </td>
                      <td className="py-3 px-3 text-[#334155] font-medium">{mat.supplier}</td>
                      <td className="py-3 px-3">
                        <div className="font-bold text-[#1e293b]">{mat.eta}</div>
                        <div className="text-[11px] text-[#dc2626] font-semibold">{mat.stockCoverHours}h stock cover left</div>
                      </td>
                      <td className="py-3 px-3">
                        <span className={`inline-block px-2.5 py-0.5 rounded text-[11px] font-bold border ${
                          mat.status === "Critical"
                            ? "bg-[#fee2e2] text-[#b91c1c] border-[#fca5a5]"
                            : mat.status === "At Risk"
                            ? "bg-[#ffedd5] text-[#c2410c] border-[#fdba74]"
                            : "bg-[#dcfce7] text-[#15803d] border-[#86efac]"
                        }`}>
                          {mat.status} (Score: {(mat.riskScore * 100).toFixed(0)}%)
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono-numbers text-[#2563eb] font-semibold">{mat.openPo}</td>
                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={() => handleInspectWithAI(mat.partNumber, `Stock cover: ${mat.stockCoverHours}h vs Lead time: ${mat.supplierLeadDays}d. PO: ${mat.openPo}`)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded-lg text-[11px] font-bold transition shadow-sm cursor-pointer"
                        >
                          <Sparkles className="w-3 h-3" />
                          <span>AI Mitigate</span>
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 2. Project Progress Tab */}
        {activeTab === "progress" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#e2e8f0] text-[#64748b] uppercase tracking-wider text-[10px]">
                  <th className="py-2.5 px-3">Project & Customer</th>
                  <th className="py-2.5 px-3">Current WBS Stage</th>
                  <th className="py-2.5 px-3">Progress Attainment</th>
                  <th className="py-2.5 px-3">Schedule Slippage</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">AI Copilot Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f1f5f9]">
                {projects
                  .filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.customer.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map((prj) => (
                    <tr key={prj.id} className="hover:bg-[#f8fafc] transition-colors">
                      <td className="py-3 px-3">
                        <div className="font-extrabold text-[#15243a]">{prj.name}</div>
                        <div className="text-[11px] text-[#64748b]">{prj.customer} · {prj.projectCode}</div>
                      </td>
                      <td className="py-3 px-3 font-medium text-[#334155]">{prj.currentMilestone}</td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <div className="w-20 h-2 bg-[#e2e8f0] rounded-full overflow-hidden">
                            <div
                              className="h-full bg-[#2563eb] rounded-full"
                              style={{ width: `${prj.progressPercent}%` }}
                            />
                          </div>
                          <span className="font-bold text-[#1e293b]">{prj.progressPercent}%</span>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <span className={`font-bold ${prj.delayVarianceDays > 0 ? "text-[#dc2626]" : "text-[#16a34a]"}`}>
                          {prj.delayVarianceDays > 0 ? `+${prj.delayVarianceDays} days` : "On Time"}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span className={`inline-block px-2.5 py-0.5 rounded text-[11px] font-bold border ${
                          prj.status === "Critical Risk"
                            ? "bg-[#fee2e2] text-[#b91c1c] border-[#fca5a5]"
                            : prj.status === "Delayed"
                            ? "bg-[#ffedd5] text-[#c2410c] border-[#fdba74]"
                            : "bg-[#dcfce7] text-[#15803d] border-[#86efac]"
                        }`}>
                          {prj.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={() => handleInspectWithAI(prj.name, `Current milestone: ${prj.currentMilestone}, delay: +${prj.delayVarianceDays}d, customer: ${prj.customer}`)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded-lg text-[11px] font-bold transition shadow-sm cursor-pointer"
                        >
                          <Sparkles className="w-3 h-3" />
                          <span>Audit WBS</span>
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 3. Drawing Approval Tab with Interactive CAD Blueprint & GD&T Inspector */}
        {activeTab === "drawing" && (
          <div className="space-y-5">
            {/* Interactive Blueprint Canvas Viewer */}
            <div className="bg-[#06142a] rounded-2xl p-4 sm:p-5 border border-[#1a3356] text-white shadow-xl relative overflow-hidden">
              {/* Blueprint Topbar */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 mb-3 border-b border-[#1b3457]">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#2563eb] text-white font-mono-numbers">
                      CAD BLUEPRINT &amp; GD&amp;T INSPECTOR
                    </span>
                    <span className="text-[11px] text-[#38bdf8] font-mono-numbers">
                      DWG-2026-04-REV-C · Upper Stamping Punch Geometry
                    </span>
                  </div>
                  <h3 className="text-sm sm:text-base font-extrabold text-white flex items-center gap-2">
                    <span>Orthographic Tooling Blueprint (ISO 2768-m / AS9100)</span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#fef3c7] text-[#d97706] border border-[#fde68a]">
                      Gate 3 Tooling Review
                    </span>
                  </h3>
                </div>

                {/* Revision Diff Toggle & AI Overlay Switches */}
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center bg-[#0c1e38] p-1 rounded-xl border border-[#244570]">
                    <button
                      type="button"
                      onClick={() => setActiveRevision("Rev 2.0")}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                        activeRevision === "Rev 2.0"
                          ? "bg-[#ef4444] text-white shadow-sm"
                          : "text-[#94a3b8] hover:text-white"
                      }`}
                    >
                      Rev 2.0 (Baseline)
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveRevision("Rev 3.1")}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                        activeRevision === "Rev 3.1"
                          ? "bg-[#10b981] text-white shadow-sm"
                          : "text-[#94a3b8] hover:text-white"
                      }`}
                    >
                      Rev 3.1 (Compensated)
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowGdtOverlay(!showGdtOverlay)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                      showGdtOverlay
                        ? "bg-[#2563eb] text-white border-[#3b82f6]"
                        : "bg-[#0c1e38] text-[#94a3b8] border-[#244570]"
                    }`}
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>GD&amp;T AI Overlay: {showGdtOverlay ? "ON" : "OFF"}</span>
                  </button>
                </div>
              </div>

              {/* Technical SVG Blueprint Canvas */}
              <div className="relative w-full rounded-xl bg-[#040e1e] border border-[#162d4e] overflow-hidden p-2">
                <svg
                  viewBox="0 0 760 300"
                  className="w-full h-auto block select-none"
                  role="img"
                  aria-label="CAD Technical Drawing Blueprint"
                >
                  {/* Subtle Technical Drafting Grid */}
                  <defs>
                    <pattern id="cad-grid" width="20" height="20" patternUnits="userSpaceOnUse">
                      <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#0e2340" strokeWidth="0.6" />
                    </pattern>
                  </defs>
                  <rect width="760" height="300" fill="url(#cad-grid)" />

                  {/* Corner Drafting Target Marks */}
                  <g stroke="#244570" strokeWidth="1">
                    <path d="M 15 25 L 15 15 L 25 15" fill="none" />
                    <path d="M 745 25 L 745 15 L 735 15" fill="none" />
                    <path d="M 15 275 L 15 285 L 25 285" fill="none" />
                    <path d="M 745 275 L 745 285 L 735 285" fill="none" />
                  </g>

                  {/* Drafting Title Box (Bottom Right) */}
                  <rect x="520" y="225" width="225" height="65" fill="#06142a" stroke="#244570" strokeWidth="1" rx="4" />
                  <text x="530" y="242" fill="#94a3b8" fontSize="9" fontFamily="monospace">PART: UPPER STAMPING PUNCH</text>
                  <text x="530" y="257" fill="#38bdf8" fontSize="10" fontWeight="bold" fontFamily="monospace">DWG-2026-04-REV-C</text>
                  <text x="530" y="272" fill="#94a3b8" fontSize="9" fontFamily="monospace">MAT: SKD11 (HRC 58-60) · {activeRevision}</text>
                  <text x="530" y="284" fill="#64748b" fontSize="8" fontFamily="monospace">BINUS RTT &amp; IMAJIN R&amp;D LAB</text>

                  {/* View A: Front Elevation (Circular Flange with 6 Bolt Holes) */}
                  <g transform="translate(170, 150)">
                    {/* Drafting Centerlines */}
                    <line x1="-120" y1="0" x2="120" y2="0" stroke="#0284c7" strokeWidth="0.8" strokeDasharray="8 3 2 3" opacity="0.6" />
                    <line x1="0" y1="-120" x2="0" y2="120" stroke="#0284c7" strokeWidth="0.8" strokeDasharray="8 3 2 3" opacity="0.6" />

                    {/* Outer Flange Circle */}
                    <circle cx="0" cy="0" r="105" fill="none" stroke="#e2e8f0" strokeWidth="2.5" />
                    {/* Pitch Circle Diameter (PCD) */}
                    <circle cx="0" cy="0" r="82" fill="none" stroke="#38bdf8" strokeWidth="1" strokeDasharray="4 4" opacity="0.7" />

                    {/* 6 Bolt Holes on PCD */}
                    {[0, 60, 120, 180, 240, 300].map((deg) => {
                      const rad = (deg * Math.PI) / 180;
                      const hx = 82 * Math.cos(rad);
                      const hy = 82 * Math.sin(rad);
                      return (
                        <circle key={deg} cx={hx} cy={hy} r="6.5" fill="#040e1e" stroke="#38bdf8" strokeWidth="1.5" />
                      );
                    })}

                    {/* Precision Central Bore (Critical Tolerance Zone) */}
                    <circle
                      cx="0"
                      cy="0"
                      r="40"
                      fill={activeRevision === "Rev 3.1" ? "rgba(16, 185, 129, 0.08)" : "rgba(239, 68, 68, 0.12)"}
                      stroke={activeRevision === "Rev 3.1" ? "#10b981" : "#ef4444"}
                      strokeWidth="2.5"
                    />

                    {/* AI GD&T Tolerance Bounding Box Overlay */}
                    {showGdtOverlay && (
                      <g>
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
                        <circle cx="0" cy="0" r="50" fill="none" stroke="#ef4444" opacity="0.2" className="animate-ping" />
                      </g>
                    )}

                    <text x="0" y="-112" fill="#94a3b8" fontSize="9" textAnchor="middle" fontFamily="monospace">
                      VIEW A: FLANGE ELEVATION (PCD Ø 164)
                    </text>
                  </g>

                  {/* View B: Side Cross-Section Profile */}
                  <g transform="translate(380, 150)">
                    {/* Centerline */}
                    <line x1="-30" y1="0" x2="110" y2="0" stroke="#0284c7" strokeWidth="0.8" strokeDasharray="8 3 2 3" opacity="0.6" />

                    {/* Stepped Tooling Cross Section */}
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

                    {/* Chamfer Details */}
                    <line x1="95" y1="-40" x2="90" y2="-35" stroke="#38bdf8" strokeWidth="1.5" />
                    <line x1="95" y1="40" x2="90" y2="35" stroke="#38bdf8" strokeWidth="1.5" />

                    {/* Flange Thickness Dimension Line */}
                    <line x1="0" y1="-120" x2={activeRevision === "Rev 3.1" ? "26" : "20"} y2="-120" stroke="#38bdf8" strokeWidth="1" />
                    <line x1="0" y1="-124" x2="0" y2="-116" stroke="#38bdf8" strokeWidth="1" />
                    <line x1={activeRevision === "Rev 3.1" ? "26" : "20"} y1="-124" x2={activeRevision === "Rev 3.1" ? "26" : "20"} y2="-116" stroke="#38bdf8" strokeWidth="1" />
                    <text x={activeRevision === "Rev 3.1" ? "13" : "10"} y="-124" fill="#38bdf8" fontSize="9" textAnchor="middle" fontFamily="monospace">
                      {activeRevision === "Rev 3.1" ? "t=22.0mm" : "t=18.5mm"}
                    </text>

                    <text x="45" y="125" fill="#94a3b8" fontSize="9" textAnchor="middle" fontFamily="monospace">
                      SECTION B-B: SLEEVE PROFILE
                    </text>
                  </g>

                  {/* AI GD&T Callout Lead Line & Flag HUD */}
                  {showGdtOverlay && (
                    <g>
                      {/* Leader Line from Bore to HUD */}
                      <polyline points="210,135 270,75 490,75" fill="none" stroke="#ef4444" strokeWidth="1.5" />
                      <circle cx="210" cy="135" r="3" fill="#ef4444" />

                      {/* AI Callout Banner Box */}
                      <rect x="490" y="35" width="255" height="78" rx="8" fill="#081b33" stroke={activeRevision === "Rev 3.1" ? "#10b981" : "#ef4444"} strokeWidth="1.5" />

                      <text x="502" y="52" fill={activeRevision === "Rev 3.1" ? "#34d399" : "#f87171"} fontSize="10" fontWeight="bold" fontFamily="sans-serif">
                        {activeRevision === "Rev 3.1"
                          ? "✓ GD&T COMPENSATED: PASS"
                          : "⚠ GD&T DEVIATION: BORE -0.040mm"}
                      </text>

                      <text x="502" y="68" fill="#e2e8f0" fontSize="9" fontFamily="monospace">
                        Nominal: Ø 84.000 H7 (+0.035 / 0.000)
                      </text>
                      <text x="502" y="82" fill={activeRevision === "Rev 3.1" ? "#a7f3d0" : "#fca5a5"} fontSize="9" fontFamily="monospace">
                        {activeRevision === "Rev 3.1"
                          ? "Measured: Ø 84.015mm (+Tool Offset applied)"
                          : "Measured: Ø 83.960mm (Thermal Spindle Drift)"}
                      </text>
                      <text x="502" y="98" fill="#94a3b8" fontSize="8" fontFamily="sans-serif">
                        {activeRevision === "Rev 3.1"
                          ? "Resolved on Makino D800Z · Ready for WBS-1.2"
                          : "Root Cause: Cell A Spindle drift (+1.8°C)"}
                      </text>
                    </g>
                  )}
                </svg>
              </div>

              {/* Action Ribbon below Blueprint */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-3 pt-3 border-t border-[#1b3457]">
                <div className="text-xs text-[#94a3b8] flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#10b981]" />
                  <span>
                    Linked Work Center: <strong className="text-white">CNC Milling Cell A (WBS-1.2)</strong>
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      handleInspectWithAI(
                        "DWG-2026-04-REV-C",
                        "GD&T Bore deviation -0.040mm vs ISO 2768-m. Rev 3.1 compensation offset +0.040mm evaluated."
                      );
                    }}
                    className="px-3 py-1.5 rounded-xl bg-[#1e3a63] hover:bg-[#25497d] text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-[#38bdf8]" />
                    <span>Send CAD GD&amp;T to AI Copilot</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onToast?.("Drawing DWG-2026-04 Rev C.2 approved for production gate.");
                    }}
                    className="px-3 py-1.5 rounded-xl bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-md"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Authorize Gate 3 Approval</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Drawing Registry Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#e2e8f0] text-[#64748b] uppercase tracking-wider text-[10px]">
                    <th className="py-2.5 px-3">Drawing Document</th>
                    <th className="py-2.5 px-3">Revision</th>
                    <th className="py-2.5 px-3">Tooling Engineer</th>
                    <th className="py-2.5 px-3">Submission Timestamp</th>
                    <th className="py-2.5 px-3">Approval Gate</th>
                    <th className="py-2.5 px-3 text-right">Interactive CAD Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f1f5f9]">
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
                          selectedDwgId === dwg.id ? "bg-[#eff6ff]" : "hover:bg-[#f8fafc]"
                        }`}
                      >
                        <td className="py-3 px-3">
                          <div className="font-extrabold text-[#15243a] flex items-center gap-1.5">
                            <span>{dwg.dwgNumber}</span>
                            {dwg.criticalDwg && (
                              <span className="px-1.5 py-0.2 bg-[#fee2e2] text-[#dc2626] font-bold text-[9px] rounded">
                                CRITICAL
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-[#64748b]">{dwg.title}</div>
                        </td>
                        <td className="py-3 px-3 font-mono text-[#1e293b] font-bold">
                          {dwg.revision}
                        </td>
                        <td className="py-3 px-3 text-[#334155]">
                          {dwg.engineer} ({dwg.department})
                        </td>
                        <td className="py-3 px-3 text-[#64748b] font-mono-numbers">
                          {dwg.submittedDate}
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded text-[11px] font-bold border ${
                              dwg.status === "Approved"
                                ? "bg-[#dcfce7] text-[#15803d] border-[#86efac]"
                                : dwg.status === "Pending Review"
                                ? "bg-[#ffedd5] text-[#c2410c] border-[#fdba74]"
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
                                `Drawing title: ${dwg.title}, status: ${dwg.status}, engineer: ${dwg.engineer}`
                              );
                            }}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded-lg text-[11px] font-bold transition shadow-sm cursor-pointer"
                          >
                            <Eye className="w-3 h-3" />
                            <span>Inspect CAD Blueprint</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 4. Quotation & PO Tab */}
        {activeTab === "quotation" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#e2e8f0] text-[#64748b] uppercase tracking-wider text-[10px]">
                  <th className="py-2.5 px-3">PO Number & QTN Ref</th>
                  <th className="py-2.5 px-3">Vendor Name</th>
                  <th className="py-2.5 px-3">Total Value (IDR)</th>
                  <th className="py-2.5 px-3">Payment Term</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">AI Copilot Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f1f5f9]">
                {quotations
                  .filter(q => q.poNumber.toLowerCase().includes(searchQuery.toLowerCase()) || q.vendorName.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map((po) => (
                    <tr key={po.id} className="hover:bg-[#f8fafc] transition-colors">
                      <td className="py-3 px-3">
                        <div className="font-extrabold text-[#15243a] flex items-center gap-1.5">
                          <span>{po.poNumber}</span>
                          {po.expedited && (
                            <span className="px-1.5 py-0.2 bg-[#ffedd5] text-[#c2410c] font-bold text-[9px] rounded">
                              EXPEDITE
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-[#64748b]">Ref: {po.quotationRef}</div>
                      </td>
                      <td className="py-3 px-3 text-[#334155] font-medium">{po.vendorName}</td>
                      <td className="py-3 px-3 font-mono text-[#1e293b] font-bold">{po.totalValueIdr}</td>
                      <td className="py-3 px-3 text-[#64748b]">{po.paymentTerm}</td>
                      <td className="py-3 px-3">
                        <span className={`inline-block px-2.5 py-0.5 rounded text-[11px] font-bold border ${
                          po.status === "PO Issued"
                            ? "bg-[#dcfce7] text-[#15803d] border-[#86efac]"
                            : "bg-[#ffedd5] text-[#c2410c] border-[#fdba74]"
                        }`}>
                          {po.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={() => handleInspectWithAI(po.poNumber, `Vendor: ${po.vendorName}, value: ${po.totalValueIdr}, term: ${po.paymentTerm}`)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded-lg text-[11px] font-bold transition shadow-sm cursor-pointer"
                        >
                          <Sparkles className="w-3 h-3" />
                          <span>Assess PO</span>
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 5. Operation Tracker Tab */}
        {activeTab === "operations" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#e2e8f0] text-[#64748b] uppercase tracking-wider text-[10px]">
                  <th className="py-2.5 px-3">Work Center & Machine</th>
                  <th className="py-2.5 px-3">Active Operator & Shift</th>
                  <th className="py-2.5 px-3">OEE & Spindle Load</th>
                  <th className="py-2.5 px-3">IoT Vibration Sensor</th>
                  <th className="py-2.5 px-3">Active Job Allocation</th>
                  <th className="py-2.5 px-3 text-right">AI Copilot Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f1f5f9]">
                {operations
                  .filter(op => op.workCenter.toLowerCase().includes(searchQuery.toLowerCase()) || op.machineId.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map((op) => (
                    <tr key={op.id} className="hover:bg-[#f8fafc] transition-colors">
                      <td className="py-3 px-3">
                        <div className="font-extrabold text-[#15243a]">{op.workCenter}</div>
                        <div className="text-[11px] font-mono text-[#64748b]">{op.machineId}</div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-medium text-[#1e293b]">{op.operator}</div>
                        <div className="text-[11px] text-[#64748b]">{op.shift}</div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-bold text-[#1e293b]">OEE: {op.oeePercent}%</div>
                        <div className="text-[11px] text-[#2563eb]">Spindle: {op.spindleUtilization}%</div>
                      </td>
                      <td className="py-3 px-3">
                        <span className={`inline-block px-2.5 py-0.5 rounded text-[11px] font-bold border ${
                          op.vibrationSensor === "ELEVATED"
                            ? "bg-[#fee2e2] text-[#b91c1c] border-[#fca5a5]"
                            : "bg-[#dcfce7] text-[#15803d] border-[#86efac]"
                        }`}>
                          {op.vibrationSensor}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-[#334155] font-medium">{op.activeJob}</td>
                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={() => handleInspectWithAI(op.machineId, `Work center: ${op.workCenter}, OEE: ${op.oeePercent}%, Vibration: ${op.vibrationSensor}`)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded-lg text-[11px] font-bold transition shadow-sm cursor-pointer"
                        >
                          <Sparkles className="w-3 h-3" />
                          <span>Sensor RCA</span>
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
