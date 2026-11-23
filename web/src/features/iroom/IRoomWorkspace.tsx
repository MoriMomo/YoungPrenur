"use client";

import React, { useState, useEffect, useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
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
  loadSampleIRoomApi,
  clearIRoomApi,
} from "@/lib/api";
import {
  IROOM_MATERIALS,
  IROOM_PROJECTS,
  IROOM_DRAWINGS,
  IROOM_QUOTATIONS,
  IROOM_OPERATIONS,
} from "@/lib/mock-data";
import {
  PackageCheck,
  TrendingUp,
  FileText,
  CreditCard,
  Cpu,
  Search,
  Plus,
  X,
  Database,
  Trash2,
} from "lucide-react";
import { MaterialTab } from "./tabs/MaterialTab";
import { ProgressTab } from "./tabs/ProgressTab";
import { DrawingTab } from "./tabs/DrawingTab";
import { QuotationTab } from "./tabs/QuotationTab";
import { OperationsTab } from "./tabs/OperationsTab";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { useT } from "@/lib/i18n";

export type IRoomTab = "material" | "progress" | "drawing" | "quotation" | "operations";

type Pair = [string, string];

const STREAM_EXPLANATIONS: Record<IRoomTab, { title: Pair; what: Pair; feeds: Pair }> = {
  material: {
    title: ["Material Delivery", "Pengiriman Material"],
    what: [
      "Tracks inbound raw alloys, fasteners, and sub-assemblies against remaining stock cover hours.",
      "Melacak paduan baku, pengencang, dan sub-rakitan yang masuk terhadap sisa jam ketahanan stok.",
    ],
    feeds: [
      "Flags stockout risks early so procurement can expedite POs before a work cell starves.",
      "Menandai risiko kehabisan stok lebih awal agar pengadaan bisa mempercepat PO sebelum sel kerja kekurangan bahan.",
    ],
  },
  progress: {
    title: ["Project Progress", "Progres Proyek"],
    what: [
      "Monitors active manufacturing programs, milestone completion %, and schedule variance.",
      "Memantau program manufaktur aktif, persentase penyelesaian milestone, dan selisih jadwal.",
    ],
    feeds: [
      "Surfaces slipping builds so project leads can reallocate capacity or escalate blockers.",
      "Menampilkan pekerjaan yang mundur agar pimpinan proyek bisa mengalihkan kapasitas atau mengeskalasi hambatan.",
    ],
  },
  drawing: {
    title: ["Drawing Approval", "Persetujuan Gambar"],
    what: [
      "Controls engineering CAD revisions, GD&T tolerance checks, and QA sign-off status.",
      "Mengendalikan revisi CAD engineering, pemeriksaan toleransi GD&T, dan status pengesahan QA.",
    ],
    feeds: [
      "Prevents machining from starting on unapproved or superseded print revisions.",
      "Mencegah permesinan dimulai dengan revisi gambar yang belum disetujui atau sudah diganti.",
    ],
  },
  quotation: {
    title: ["Quotation & PO", "Penawaran & PO"],
    what: [
      "Tracks supplier RFQs, committed purchase orders, and unit price variance against target.",
      "Melacak RFQ pemasok, purchase order yang sudah disepakati, dan selisih harga satuan terhadap target.",
    ],
    feeds: [
      "Catches cost overruns and stalled vendor approvals before spend hits the shop floor.",
      "Menangkap pembengkakan biaya dan persetujuan vendor yang tertahan sebelum pengeluaran sampai ke lantai produksi.",
    ],
  },
  operations: {
    title: ["Operation Tracker", "Pelacak Operasi"],
    what: [
      "Monitors active shop-floor work centers, machine utilization, and run status.",
      "Memantau work center aktif di lantai produksi, utilisasi mesin, dan status operasinya.",
    ],
    feeds: [
      "Highlights overloaded cells and downtime constraints for shift rescheduling.",
      "Menyoroti sel yang kelebihan beban dan kendala downtime untuk penjadwalan ulang shift.",
    ],
  },
};

const HOW_IROOM_WORKS: { step: string; title: Pair; body: Pair }[] = [
  {
    step: "01",
    title: ["Pick a stream", "Pilih aliran"],
    body: [
      "Switch tabs to check materials, project progress, drawings, POs, or machine status.",
      "Ganti tab untuk memeriksa material, progres proyek, gambar, PO, atau status mesin.",
    ],
  },
  {
    step: "02",
    title: ["Spot or log alerts", "Temukan atau catat peringatan"],
    body: [
      "Red dots mark items needing attention. Search any table or click Add record to log a new entry.",
      "Titik merah menandai item yang perlu perhatian. Cari di tabel mana pun atau klik Tambah catatan untuk mencatat entri baru.",
    ],
  },
  {
    step: "03",
    title: ["Act with Copilot", "Bertindak dengan Copilot"],
    body: [
      "Click a row action to open SOP-backed recommendations and route fixes for sign-off.",
      "Klik tindakan pada baris untuk membuka rekomendasi berbasis SOP dan mengirim perbaikan untuk disahkan.",
    ],
  },
];

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
  const t = useT();
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
  const panelRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (!panelRef.current) return;
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.fromTo(
          panelRef.current,
          { y: 6, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.22, ease: "power2.out", clearProps: "transform,opacity" }
        );
      });
      return () => mm.revert();
    },
    { dependencies: [activeTab] }
  );

  const refreshStreams = async () => {
    const [m, p, d, q, o] = await Promise.all([
      fetchIRoomMaterials(),
      fetchIRoomProjects(),
      fetchIRoomDrawings(),
      fetchIRoomQuotations(),
      fetchIRoomOperations(),
    ]);
    setMaterials(m);
    setProjects(p);
    setDrawings(d);
    setQuotations(q);
    setOperations(o);
  };

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

  const handleLoadSampleIRoom = async () => {
    const ok = await loadSampleIRoomApi();
    if (ok) {
      await refreshStreams();
      onToast?.(t("Loaded sample plant records into your workspace.", "Catatan pabrik contoh dimuat ke ruang kerja Anda."));
      return;
    }
    setMaterials(IROOM_MATERIALS);
    setProjects(IROOM_PROJECTS);
    setDrawings(IROOM_DRAWINGS);
    setQuotations(IROOM_QUOTATIONS);
    setOperations(IROOM_OPERATIONS);
    onToast?.(t("Loaded sample plant records for local preview.", "Catatan pabrik contoh dimuat untuk pratinjau lokal."));
  };

  const handleClearIRoom = async () => {
    await clearIRoomApi();
    setMaterials([]);
    setProjects([]);
    setDrawings([]);
    setQuotations([]);
    setOperations([]);
    onToast?.(t("Cleared all IRoom stream records back to blank.", "Semua catatan aliran IRoom dikosongkan kembali."));
  };

  const tabs = [
    {
      id: "material" as const,
      label: t(...STREAM_EXPLANATIONS.material.title),
      icon: PackageCheck,
      alert: materials.some((m) => m.status === "Critical"),
    },
    {
      id: "progress" as const,
      label: t(...STREAM_EXPLANATIONS.progress.title),
      icon: TrendingUp,
      alert: projects.some((p) => p.status === "Critical Risk"),
    },
    {
      id: "drawing" as const,
      label: t(...STREAM_EXPLANATIONS.drawing.title),
      icon: FileText,
      alert: drawings.some((d) => d.status === "Pending Review"),
    },
    {
      id: "quotation" as const,
      label: t(...STREAM_EXPLANATIONS.quotation.title),
      icon: CreditCard,
      alert: quotations.some((q) => q.status === "Pending Approval"),
    },
    {
      id: "operations" as const,
      label: t(...STREAM_EXPLANATIONS.operations.title),
      icon: Cpu,
      alert: operations.some((o) => o.vibrationSensor === "ELEVATED"),
    },
  ];

  const selectedDrawing: DrawingApprovalItem | null =
    drawings.find((d) => d.id === selectedDwgId) || drawings[0] || null;

  const totalRecordCount =
    materials.length + projects.length + drawings.length + quotations.length + operations.length;
  const activeTabCount =
    activeTab === "material"
      ? materials.length
      : activeTab === "progress"
      ? projects.length
      : activeTab === "drawing"
      ? drawings.length
      : activeTab === "quotation"
      ? quotations.length
      : operations.length;

  const handleInspectWithAI = (entityName: string, detail: string) => {
    const query = t(
      `Analyze IRoom ${activeTab.toUpperCase()} record ${entityName}: ${detail}. Provide recommended mitigation and SOP reference.`,
      `Analisis catatan IRoom ${activeTab.toUpperCase()} ${entityName}: ${detail}. Berikan mitigasi yang disarankan dan referensi SOP-nya. Jawab dalam bahasa Indonesia.`
    );
    onAskCopilot?.(query);
    onToast?.(t(`Analyzing ${entityName} in Manufacturing Copilot.`, `Menganalisis ${entityName} di Copilot Manufaktur.`));
  };

  const handleApproveSelectedDrawing = async () => {
    if (!selectedDrawing) return;
    const updated: DrawingApprovalItem = { ...selectedDrawing, status: "Approved" };
    setDrawings((prev) =>
      prev.map((d) => (d.id === selectedDrawing.id ? updated : d))
    );
    const saved = await ingestIRoomRecord("drawings", { ...updated });
    onToast?.(
      saved
        ? t(`Drawing ${selectedDrawing.dwgNumber} approved and persisted to database.`, `Gambar ${selectedDrawing.dwgNumber} disetujui dan disimpan ke basis data.`)
        : t(`Drawing ${selectedDrawing.dwgNumber} approved in local preview.`, `Gambar ${selectedDrawing.dwgNumber} disetujui di pratinjau lokal.`)
    );
  };

  const handleAddRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = draftCode.trim();
    const cleanParty = draftParty.trim();
    const cleanMetric = draftMetric.trim();
    if (!cleanCode || !cleanParty) {
      onToast?.(t("Enter both a record code and party/title before adding.", "Isi kode catatan dan pihak/judul sebelum menambahkan."));
      return;
    }
    const id = `${activeTab}-${Date.now().toString().slice(-4)}`;
    if (activeTab === "material") {
      const hours = Math.max(4, Number(cleanMetric) || 32);
      const item: MaterialDeliveryItem = {
        id,
        partNumber: cleanCode.toUpperCase(),
        description: "Shop-floor ingested material lot",
        supplier: cleanParty,
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
      const pct = Math.min(100, Math.max(0, Number(cleanMetric) || 50));
      const item: ProjectProgressItem = {
        id,
        projectCode: cleanCode.toUpperCase(),
        name: cleanParty,
        customer: "Client Order",
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
        dwgNumber: cleanCode.toUpperCase(),
        title: cleanParty,
        revision: cleanMetric || "Rev A.0",
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
        poNumber: cleanCode.toUpperCase(),
        quotationRef: `QTN-${Date.now().toString().slice(-4)}`,
        vendorName: cleanParty,
        totalValueIdr: cleanMetric || "Rp 45.000.000",
        status: "Pending Approval",
        paymentTerm: "Net 30 Days",
        expedited: true,
      };
      setQuotations((prev) => [item, ...prev]);
      await ingestIRoomRecord("quotations", { ...item });
    } else {
      const oee = Math.min(100, Math.max(10, Number(cleanMetric) || 88));
      const item: OperationTrackerItem = {
        id,
        workCenter: cleanCode,
        machineId: cleanParty,
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
    onToast?.(t(`Ingested new ${activeTab} record into backend database.`, `Catatan ${activeTab} baru dimasukkan ke basis data backend.`));
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("Plant records", "Catatan pabrik")}
        description={`${t(
          "Material delivery, project progress, drawing approval, quotations and operations in one place, each feeding the decisions that need sign-off.",
          "Pengiriman material, progres proyek, persetujuan gambar, penawaran, dan operasi di satu tempat, masing-masing mengisi keputusan yang perlu disahkan."
        )} ${
          isApiLive
            ? t("Scoped to your live workspace.", "Khusus untuk ruang kerja langsung Anda.")
            : t("Blank until you add records or load samples.", "Kosong hingga Anda menambah catatan atau memuat contoh.")
        }`}
      />

      <section

        aria-labelledby="iroom-how-it-works-heading"
        className="rounded-xl border border-rule bg-sheet"
      >
        <div className="border-b border-rule px-4 py-2">
          <h2 id="iroom-how-it-works-heading" className="text-xs font-semibold text-ink">
            {t("How plant records work", "Cara kerja catatan pabrik")}
          </h2>
        </div>
        <ol className="grid grid-cols-1 divide-y divide-rule md:grid-cols-3 md:divide-x md:divide-y-0">
          {HOW_IROOM_WORKS.map((item) => (
            <li key={item.step} className="px-4 py-3">
              <div className="flex items-baseline gap-2">
                <span className="text-xs font-semibold text-ink">{t(...item.title)}</span>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-ink-2">{t(...item.body)}</p>
            </li>
          ))}
        </ol>
      </section>

      <div role="tablist" aria-label={t("Plant records", "Catatan pabrik")} className="flex flex-wrap border-b border-rule-strong">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isSelected = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              role="tab"
              type="button"
              aria-selected={isSelected}
              onClick={() => setActiveTab(tab.id)}
              className={`-mb-px flex cursor-pointer items-center gap-2 whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                isSelected ? "border-stamp text-ink" : "border-transparent text-ink-2 hover:text-ink"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" strokeWidth={1.6} />
              {tab.label}
              {tab.alert && <span className="h-2 w-2 shrink-0 rounded-full bg-hold" title={t("Needs attention", "Perlu perhatian")} aria-label={t("needs attention", "perlu perhatian")} />}
            </button>
          );
        })}
      </div>

      {/* Main Content Card */}
      <div ref={panelRef} role="tabpanel" className="bg-sheet border border-rule-strong p-5 sm:p-6">
        <div className="mb-5 border border-rule bg-paper px-4 py-3">
          <p className="text-xs font-semibold text-ink">
            {t(
              `What is ${STREAM_EXPLANATIONS[activeTab].title[0]}?`,
              `Apa itu ${STREAM_EXPLANATIONS[activeTab].title[1]}?`
            )}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-ink-2">
            {t(...STREAM_EXPLANATIONS[activeTab].what)} {t(...STREAM_EXPLANATIONS[activeTab].feeds)}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-ink-3 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={t(`Search ${activeTab} records, codes, or suppliers`, `Cari catatan ${activeTab}, kode, atau pemasok`)}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs pl-9 pr-3 py-2 border border-rule-strong rounded-xl focus:outline-none focus:ring-2 focus:ring-stamp bg-paper"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {totalRecordCount > 0 && (
              <Button variant="secondary" onClick={() => void handleClearIRoom()}>
                <Trash2 className="h-4 w-4" />
                {t("Clear streams", "Kosongkan aliran")}
              </Button>
            )}
            <Button variant={showAddForm ? "secondary" : "primary"} onClick={() => setShowAddForm((prev) => !prev)}>
              {showAddForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {showAddForm ? t("Cancel", "Batal") : t("Add record", "Tambah catatan")}
            </Button>
          </div>
        </div>

        {showAddForm && (
          <form
            onSubmit={handleAddRecord}
            className="mb-5 p-3.5 rounded-xl bg-paper border border-rule grid grid-cols-1 sm:grid-cols-4 gap-2.5 items-center"
          >
            <input
              type="text"
              required
              value={draftCode}
              onChange={(e) => setDraftCode(e.target.value)}
              placeholder={
                activeTab === "material"
                  ? t("Part Number (e.g. AL7075-PLATE)", "Nomor Part (mis. AL7075-PLATE)")
                  : activeTab === "progress"
                  ? t("Project Code (e.g. PRJ-2026-11)", "Kode Proyek (mis. PRJ-2026-11)")
                  : activeTab === "drawing"
                  ? t("Drawing # (e.g. DWG-2026-09)", "No. Gambar (mis. DWG-2026-09)")
                  : activeTab === "quotation"
                  ? t("PO Number (e.g. PO-2026-991)", "Nomor PO (mis. PO-2026-991)")
                  : t("Work Center (e.g. CNC Cell B)", "Work Center (mis. CNC Cell B)")
              }
              className="px-3 py-2 bg-white border border-rule-strong rounded-lg text-xs"
            />
            <input
              type="text"
              value={draftParty}
              onChange={(e) => setDraftParty(e.target.value)}
              placeholder={
                activeTab === "material"
                  ? t("Supplier name", "Nama pemasok")
                  : activeTab === "drawing"
                  ? t("Drawing title", "Judul gambar")
                  : activeTab === "operations"
                  ? t("Machine ID", "ID mesin")
                  : t("Project / Vendor name", "Nama proyek / vendor")
              }
              className="px-3 py-2 bg-white border border-rule-strong rounded-lg text-xs"
            />
            <input
              type="text"
              value={draftMetric}
              onChange={(e) => setDraftMetric(e.target.value)}
              placeholder={
                activeTab === "material"
                  ? t("Stock cover hrs (e.g. 24)", "Jam ketahanan stok (mis. 24)")
                  : activeTab === "progress"
                  ? t("Progress % (e.g. 72)", "Progres % (mis. 72)")
                  : activeTab === "drawing"
                  ? t("Revision (e.g. Rev A.1)", "Revisi (mis. Rev A.1)")
                  : activeTab === "quotation"
                  ? t("Value IDR (e.g. Rp 55.000.000)", "Nilai IDR (mis. Rp 55.000.000)")
                  : t("OEE % (e.g. 91.5)", "OEE % (mis. 91,5)")
              }
              className="px-3 py-2 bg-white border border-rule-strong rounded-lg text-xs"
            />
            <button
              type="submit"
              className="px-3 py-2 bg-stamp hover:bg-stamp-deep text-white text-xs font-semibold rounded-lg cursor-pointer transition-colors"
            >
              {t("Save to Stream", "Simpan ke Aliran")}
            </button>
          </form>
        )}

        {activeTabCount === 0 && !showAddForm ? (
          <div className="rounded-xl border border-dashed border-rule-strong bg-paper p-8 text-center space-y-3">
            <div className="mx-auto w-9 h-9 rounded-full bg-white border border-rule flex items-center justify-center text-ink-3">
              <Database className="w-4 h-4" />
            </div>
            <div className="space-y-1 max-w-md mx-auto">
              <h3 className="text-sm font-semibold text-ink">
                {t(`No ${STREAM_EXPLANATIONS[activeTab].title[0]} records yet`, `Belum ada catatan ${STREAM_EXPLANATIONS[activeTab].title[1]}`)}
              </h3>
              <p className="text-xs text-ink-2 leading-relaxed">
                {t(
                  "Keep your streams clean with only your plant's real inputs, or load sample IRoom data to preview.",
                  "Gunakan hanya input nyata pabrik Anda, atau muat data contoh IRoom untuk pratinjau."
                )}
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2.5 pt-1">
              <Button variant="secondary" onClick={() => setShowAddForm(true)}>
                <Plus className="h-4 w-4" />
                {t("Add record", "Tambah catatan")}
              </Button>
              {totalRecordCount === 0 && (
                <Button variant="secondary" onClick={() => void handleLoadSampleIRoom()}>
                  <Database className="h-4 w-4" />
                  {t("Load sample streams", "Muat aliran contoh")}
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div>
            <div>
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
        )}
      </div>
    </div>
  );
};
