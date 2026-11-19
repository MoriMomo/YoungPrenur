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
  ingestIRoomRecord,
} from "@/lib/api";
import {
  PackageCheck,
  TrendingUp,
  FileText,
  CreditCard,
  Cpu,
  Search,
  Plus,
  X,
} from "lucide-react";
import { MaterialTab } from "./tabs/MaterialTab";
import { ProgressTab } from "./tabs/ProgressTab";
import { DrawingTab } from "./tabs/DrawingTab";
import { QuotationTab } from "./tabs/QuotationTab";
import { OperationsTab } from "./tabs/OperationsTab";

export type IRoomTab = "material" | "progress" | "drawing" | "quotation" | "operations";

interface IRoomWorkspaceProps {
  initialTab?: IRoomTab;
  isApiLive?: boolean;
  onAskCopilot?: (contextQuery: string) => void;
  onToast?: (msg: string) => void;
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
  const [showAddForm, setShowAddForm] = useState(false);
  const [draftCode, setDraftCode] = useState("");
  const [draftParty, setDraftParty] = useState("");
  const [draftMetric, setDraftMetric] = useState("");

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

  const handleApproveSelectedDrawing = async () => {
    const updated: DrawingApprovalItem = { ...selectedDrawing, status: "Approved" };
    setDrawings((prev) =>
      prev.map((d) => (d.id === selectedDrawing.id ? updated : d))
    );
    const saved = await ingestIRoomRecord("drawings", { ...updated });
    onToast?.(
      saved
        ? `Drawing ${selectedDrawing.dwgNumber} approved and persisted to database.`
        : `Drawing ${selectedDrawing.dwgNumber} approved in local preview.`
    );
  };

  const handleAddRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draftCode.trim()) return;
    const id = `${activeTab}-${Date.now().toString().slice(-4)}`;
    if (activeTab === "material") {
      const hours = Math.max(4, Number(draftMetric) || 32);
      const item: MaterialDeliveryItem = {
        id,
        partNumber: draftCode.trim().toUpperCase(),
        description: "Shop-floor ingested material lot",
        supplier: draftParty.trim() || "Approved Vendor",
        eta: "Scheduled",
        stockCoverHours: hours,
        supplierLeadDays: 3,
        status: hours <= 48 ? "Critical" : hours <= 80 ? "At Risk" : "Normal",
        riskScore: hours <= 48 ? 0.85 : 0.3,
        openPo: `PO-${Date.now().toString().slice(-4)}`,
      };
      setMaterials((prev) => [item, ...prev]);
      await ingestIRoomRecord("materials", { ...item });
    } else if (activeTab === "progress") {
      const pct = Math.min(100, Math.max(0, Number(draftMetric) || 50));
      const item: ProjectProgressItem = {
        id,
        projectCode: draftCode.trim().toUpperCase(),
        name: draftParty.trim() || draftCode.trim(),
        customer: "IMAJIN Client Order",
        currentMilestone: "In Machining",
        progressPercent: pct,
        targetCompletion: "Scheduled",
        delayVarianceDays: pct < 60 ? 1.5 : 0,
        status: pct < 60 ? "Delayed" : "On Schedule",
      };
      setProjects((prev) => [item, ...prev]);
      await ingestIRoomRecord("progress", { ...item });
    } else if (activeTab === "drawing") {
      const item: DrawingApprovalItem = {
        id,
        dwgNumber: draftCode.trim().toUpperCase(),
        title: draftParty.trim() || "Engineering revision drawing",
        revision: draftMetric.trim() || "Rev A.0",
        engineer: "Tooling Engineering",
        department: "Tooling R&D",
        submittedDate: "Just now",
        status: "Pending Review",
        criticalDwg: true,
      };
      setDrawings((prev) => [item, ...prev]);
      await ingestIRoomRecord("drawings", { ...item });
    } else if (activeTab === "quotation") {
      const item: QuotationPoItem = {
        id,
        poNumber: draftCode.trim().toUpperCase(),
        quotationRef: `QTN-${Date.now().toString().slice(-4)}`,
        vendorName: draftParty.trim() || "Industrial Supplier",
        totalValueIdr: draftMetric.trim() || "Rp 45.000.000",
        status: "Pending Approval",
        paymentTerm: "Net 30 Days",
        expedited: true,
      };
      setQuotations((prev) => [item, ...prev]);
      await ingestIRoomRecord("quotations", { ...item });
    } else {
      const oee = Math.min(100, Math.max(10, Number(draftMetric) || 88));
      const item: OperationTrackerItem = {
        id,
        workCenter: draftCode.trim(),
        machineId: draftParty.trim() || `CELL-${Date.now().toString().slice(-3)}`,
        operator: "Assigned Operator",
        shift: "Shift 1",
        oeePercent: oee,
        spindleUtilization: oee,
        vibrationSensor: oee < 75 ? "ELEVATED" : "NORMAL",
        activeJob: "Live Production Lot",
      };
      setOperations((prev) => [item, ...prev]);
      await ingestIRoomRecord("operations", { ...item });
    }
    setDraftCode("");
    setDraftParty("");
    setDraftMetric("");
    setShowAddForm(false);
    onToast?.(`Ingested new ${activeTab} record into backend database.`);
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

          <div className="flex items-center gap-2.5 text-xs text-[#64748b] font-medium">
            <span>Active stream:</span>
            <strong className="text-[#101e30] capitalize bg-[#f1f5f9] px-2.5 py-1 rounded-md font-mono-numbers">
              {activeTab}
            </strong>
            <button
              type="button"
              onClick={() => setShowAddForm((prev) => !prev)}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#0c1a2d] hover:bg-[#1a3354] text-white rounded-lg text-xs font-semibold cursor-pointer transition-colors"
            >
              {showAddForm ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
              <span>{showAddForm ? "Cancel" : "Add Record"}</span>
            </button>
          </div>
        </div>

        {showAddForm && (
          <form
            onSubmit={handleAddRecord}
            className="mb-5 p-3.5 rounded-xl bg-[#f8fafc] border border-[#e2eaf3] grid grid-cols-1 sm:grid-cols-4 gap-2.5 items-center"
          >
            <input
              type="text"
              required
              value={draftCode}
              onChange={(e) => setDraftCode(e.target.value)}
              placeholder={
                activeTab === "material"
                  ? "Part Number (e.g. AL7075-PLATE)"
                  : activeTab === "progress"
                  ? "Project Code (e.g. PRJ-2026-11)"
                  : activeTab === "drawing"
                  ? "Drawing # (e.g. DWG-2026-09)"
                  : activeTab === "quotation"
                  ? "PO Number (e.g. PO-2026-991)"
                  : "Work Center (e.g. CNC Cell B)"
              }
              className="px-3 py-2 bg-white border border-[#cbd5e1] rounded-lg text-xs"
            />
            <input
              type="text"
              value={draftParty}
              onChange={(e) => setDraftParty(e.target.value)}
              placeholder={
                activeTab === "material"
                  ? "Supplier name"
                  : activeTab === "drawing"
                  ? "Drawing title"
                  : activeTab === "operations"
                  ? "Machine ID"
                  : "Project / Vendor name"
              }
              className="px-3 py-2 bg-white border border-[#cbd5e1] rounded-lg text-xs"
            />
            <input
              type="text"
              value={draftMetric}
              onChange={(e) => setDraftMetric(e.target.value)}
              placeholder={
                activeTab === "material"
                  ? "Stock cover hrs (e.g. 24)"
                  : activeTab === "progress"
                  ? "Progress % (e.g. 72)"
                  : activeTab === "drawing"
                  ? "Revision (e.g. Rev A.1)"
                  : activeTab === "quotation"
                  ? "Value IDR (e.g. Rp 55.000.000)"
                  : "OEE % (e.g. 91.5)"
              }
              className="px-3 py-2 bg-white border border-[#cbd5e1] rounded-lg text-xs"
            />
            <button
              type="submit"
              className="px-3 py-2 bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-xs font-semibold rounded-lg cursor-pointer transition-colors"
            >
              Save to Stream
            </button>
          </form>
        )}

        {/* 1. Material Delivery */}
        {activeTab === "material" && (
          <MaterialTab
            searchQuery={searchQuery}
            handleInspectWithAI={handleInspectWithAI}
            materials={materials}
          />
        )}

        {/* 2. Project Progress */}
        {activeTab === "progress" && (
          <ProgressTab
            searchQuery={searchQuery}
            handleInspectWithAI={handleInspectWithAI}
            projects={projects}
          />
        )}

        {/* 3. Drawing Approval + Dynamic CAD Inspector */}
        {activeTab === "drawing" && (
          <DrawingTab
            searchQuery={searchQuery}
            handleInspectWithAI={handleInspectWithAI}
            drawings={drawings}
            selectedDrawing={selectedDrawing}
            setSelectedDwgId={setSelectedDwgId}
            activeRevision={activeRevision}
            setActiveRevision={setActiveRevision}
            showGdtOverlay={showGdtOverlay}
            setShowGdtOverlay={setShowGdtOverlay}
            handleApproveSelectedDrawing={handleApproveSelectedDrawing}
          />
        )}

        {/* 4. Quotation & PO */}
        {activeTab === "quotation" && (
          <QuotationTab
            searchQuery={searchQuery}
            handleInspectWithAI={handleInspectWithAI}
            quotations={quotations}
          />
        )}

        {/* 5. Operation Tracker */}
        {activeTab === "operations" && (
          <OperationsTab
            searchQuery={searchQuery}
            handleInspectWithAI={handleInspectWithAI}
            operations={operations}
          />
        )}
      </div>
    </div>
  );
};
