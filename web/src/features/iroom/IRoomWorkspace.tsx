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
  Search
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

  useEffect(() => {
    fetchIRoomMaterials().then(setMaterials);
    fetchIRoomProjects().then(setProjects);
    fetchIRoomDrawings().then(setDrawings);
    fetchIRoomQuotations().then(setQuotations);
    fetchIRoomOperations().then(setOperations);
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

        {/* 3. Drawing Approval Tab */}
        {activeTab === "drawing" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#e2e8f0] text-[#64748b] uppercase tracking-wider text-[10px]">
                  <th className="py-2.5 px-3">Drawing Document</th>
                  <th className="py-2.5 px-3">Revision</th>
                  <th className="py-2.5 px-3">Tooling Engineer</th>
                  <th className="py-2.5 px-3">Submission Timestamp</th>
                  <th className="py-2.5 px-3">Approval Gate</th>
                  <th className="py-2.5 px-3 text-right">AI Copilot Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f1f5f9]">
                {drawings
                  .filter(d => d.dwgNumber.toLowerCase().includes(searchQuery.toLowerCase()) || d.title.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map((dwg) => (
                    <tr key={dwg.id} className="hover:bg-[#f8fafc] transition-colors">
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
                      <td className="py-3 px-3 font-mono text-[#1e293b] font-bold">{dwg.revision}</td>
                      <td className="py-3 px-3 text-[#334155]">{dwg.engineer} ({dwg.department})</td>
                      <td className="py-3 px-3 text-[#64748b] font-mono-numbers">{dwg.submittedDate}</td>
                      <td className="py-3 px-3">
                        <span className={`inline-block px-2.5 py-0.5 rounded text-[11px] font-bold border ${
                          dwg.status === "Approved"
                            ? "bg-[#dcfce7] text-[#15803d] border-[#86efac]"
                            : dwg.status === "Pending Review"
                            ? "bg-[#ffedd5] text-[#c2410c] border-[#fdba74]"
                            : "bg-[#fee2e2] text-[#b91c1c] border-[#fca5a5]"
                        }`}>
                          {dwg.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={() => handleInspectWithAI(dwg.dwgNumber, `Drawing title: ${dwg.title}, status: ${dwg.status}, engineer: ${dwg.engineer}`)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded-lg text-[11px] font-bold transition shadow-sm cursor-pointer"
                        >
                          <Sparkles className="w-3 h-3" />
                          <span>Check GD&T</span>
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
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
