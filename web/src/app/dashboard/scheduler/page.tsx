"use client";

import React, { useState, useEffect } from "react";
import {
  readStoredUserSchedule,
  useDashboard,
  writeStoredUserSchedule,
} from "@/features/workspace/dashboard-context";
import { ScheduleUploader } from "@/features/scheduler/ScheduleUploader";
import { GanttTimeline } from "@/features/scheduler/GanttTimeline";
import { DeviationTable } from "@/features/scheduler/DeviationTable";
import { ModelCardStrip } from "@/features/risks/ModelCardStrip";
import {
  DEFAULT_MODEL_CARD,
  fetchDecisionActions,
  fetchDelayRiskPrediction,
  fetchMlModelCard,
  MlModelCard,
} from "@/lib/api";
import { DelayRiskPrediction, WbsTask, RiskDriver } from "@/types";
import { PageHeader } from "@/components/ui/PageHeader";
import { useT } from "@/lib/i18n";

export default function SchedulerPage() {
  const { userId, showToast, setActions, askCopilotWithPrompt } = useDashboard();
  const tr = useT();
  const [tasks, setTasks] = useState<WbsTask[]>([]);
  const [projectName, setProjectName] = useState<string | null>(null);
  const [activeFilename, setActiveFilename] = useState<string | null>(null);
  const [extractionMethod, setExtractionMethod] = useState<string | null>(null);
  const [documentSummary, setDocumentSummary] = useState<string | null>(null);
  const [overallRisk, setOverallRisk] = useState<number | null>(null);
  const [slippageDays, setSlippageDays] = useState<number | null>(null);
  const [methodology, setMethodology] = useState<string | null>(null);
  const [drivers, setDrivers] = useState<RiskDriver[]>([]);
  const [modelCard, setModelCard] = useState<MlModelCard>(DEFAULT_MODEL_CARD);

  const applyPrediction = (pred: DelayRiskPrediction) => {
    setProjectName(pred.project_name || null);
    setActiveFilename(pred.filename || null);
    setExtractionMethod(pred.extraction_method || null);
    setDocumentSummary(pred.document_summary ?? null);
    setTasks(pred.tasks || []);
    setOverallRisk(pred.overall_delay_probability);
    setSlippageDays(pred.estimated_project_slippage_days);
    setMethodology(pred.methodology);
    setDrivers(pred.risk_drivers || []);
  };

  useEffect(() => {
    let active = true;
    fetchDelayRiskPrediction().then((pred) => {
      if (!active) return;
      const resolved = pred && pred.tasks.length > 0 ? pred : readStoredUserSchedule(userId);
      if (resolved) {
        applyPrediction(resolved);
        if (pred && pred.tasks.length > 0) writeStoredUserSchedule(pred, userId);
      } else {
        setTasks([]);
        setProjectName(null);
        setActiveFilename(null);
        setExtractionMethod(null);
        setDocumentSummary(null);
        setOverallRisk(null);
        setSlippageDays(null);
        setMethodology(null);
        setDrivers([]);
      }
    });
    fetchMlModelCard().then((card) => {
      if (active) setModelCard(card);
    });
    return () => {
      active = false;
    };
  }, [userId]);

  const handleUploadComplete = async (data: {
    tasks?: WbsTask[];
    source?: string;
    filename?: string;
    extraction_method?: string;
    document_summary?: string | null;
  }) => {
    if (data?.source === "backend") {
      // Backend scored the uploaded schedule; pull the updated analysis and computed decisions.
      const [pred, freshActions] = await Promise.all([
        fetchDelayRiskPrediction(),
        fetchDecisionActions(),
      ]);
      if (pred) {
        const mergedPred = {
          ...pred,
          filename: pred.filename || data.filename,
          extraction_method: pred.extraction_method || data.extraction_method,
          document_summary: pred.document_summary ?? data.document_summary ?? null,
        };
        applyPrediction(mergedPred);
        writeStoredUserSchedule(mergedPred, userId);
      }
      if (freshActions && freshActions.length > 0) {
        setActions(freshActions);
      }
      return;
    }
    if (data?.tasks && data.tasks.length > 0) {
      const cleanName = data.filename
        ? data.filename.replace(/\.(csv|xlsx|xlsm|xls|xer|xml|pdf|docx|doc)$/i, "").replace(/_/g, " ")
        : "Uploaded schedule";
      const totalSlip = data.tasks.reduce(
        (acc, t) => acc + Math.max(0, t.actualDays - t.plannedDays),
        0
      );
      const avgRisk =
        Math.round(
          (data.tasks.reduce((acc, t) => acc + t.delayRisk, 0) / data.tasks.length) * 1000
        ) / 10;
      const localPred: DelayRiskPrediction = {
        source: "upload",
        filename: data.filename,
        extraction_method: data.extraction_method || "table",
        document_summary: data.document_summary ?? null,
        project_name: cleanName,
        overall_delay_probability: avgRisk,
        critical_path_tasks_count: data.tasks.filter((t) => t.critical).length,
        high_risk_tasks_count: data.tasks.filter((t) => t.riskLevel === "HIGH" || t.delayRisk >= 0.6).length,
        estimated_project_slippage_days: Math.round(totalSlip * 10) / 10,
        risk_drivers: [],
        tasks: data.tasks,
        methodology:
          "Local CSV parse (backend offline — connect MDIP service for CPM + XGBoost scoring)",
      };
      applyPrediction(localPred);
      writeStoredUserSchedule(localPred, userId);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={tr("Scheduler and delay risk", "Penjadwal dan risiko keterlambatan")}
        description={tr(
          "Normalises CSV, Excel, PDF and Word schedules into WBS work packages, traces the critical path and scores each task's slippage risk.",
          "Menormalkan jadwal CSV, Excel, PDF, dan Word menjadi paket kerja WBS, menelusuri jalur kritis, dan menilai risiko kemunduran tiap tugas."
        )}
      />

      <div>
        <ScheduleUploader
          activeFilename={activeFilename}
          activeTaskCount={tasks.length}
          activeExtractionMethod={extractionMethod}
          activeDocumentSummary={documentSummary}
          onUploadComplete={handleUploadComplete}
          onAskCopilot={askCopilotWithPrompt}
          onToast={showToast}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white rounded-xl border border-rule p-5">
          <div className="flex items-start justify-between gap-2 mb-3">
            <div>
              <h2 className="font-display text-[20px] font-bold leading-tight text-ink">
                {tr("Delay-Risk Probability Summary", "Ringkasan Peluang Risiko Terlambat")}
              </h2>
              <p className="text-xs text-ink-3">
                {projectName || tr("No schedule uploaded", "Belum ada jadwal diunggah")}
              </p>
            </div>
            {tasks.length > 0 && overallRisk !== null && (
              <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-hold-wash text-hold border border-hold-line font-mono-numbers">
                {tr("Risk:", "Risiko:")} {overallRisk}%
              </span>
            )}
          </div>

          {tasks.length === 0 ? (
            <div className="rounded-lg border border-dashed border-rule-strong bg-paper px-4 py-6 text-xs leading-relaxed text-ink-2">
              {tr(
                "Upload a CSV, Excel, PDF, or Word (.docx) schedule above to compute critical-path slippage, Monte Carlo delay probability, and root-cause drivers — and make the document readable by Copilot.",
                "Unggah jadwal CSV, Excel, PDF, atau Word (.docx) di atas untuk menghitung kemunduran jalur kritis, peluang terlambat Monte Carlo, dan akar penyebabnya — sekaligus membuat dokumen dapat dibaca Copilot."
              )}
            </div>
          ) : (
            <>
              <div className="text-3xl sm:text-4xl font-medium text-hold font-mono-numbers my-3">
                +{(slippageDays ?? 0).toFixed(1)} {tr("Days Slippage", "Hari Mundur")}
              </div>
              <p className="text-xs text-ink-3 mb-4">
                {tr(
                  "Median (P50) project slippage across 2,000 Monte Carlo CPM runs from XGBoost task predictions.",
                  "Median (P50) kemunduran proyek dari 2.000 simulasi CPM Monte Carlo berdasarkan prediksi tugas XGBoost."
                )}
              </p>

              <div className="pt-3 border-t border-rule-soft">
                <div className="text-xs font-medium text-ink mb-2">
                  {tr("Root-Cause Risk Drivers", "Akar Penyebab Risiko")}
                </div>
                {drivers.length > 0 ? (
                  <ul className="text-xs text-ink-2 space-y-1.5 list-disc pl-4">
                    {drivers.map((drv, idx) => (
                      <li key={idx}>
                        <span className="font-medium text-ink">
                          {tr(drv.factor)} ({drv.weight})
                        </span>{" "}
                        — {drv.impact}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-ink-3">
                    {tr("Root-cause SHAP risk drivers require the live MDIP backend service.", "Akar penyebab risiko SHAP memerlukan layanan backend MDIP yang aktif.")}
                  </p>
                )}
              </div>
            </>
          )}
        </div>

        <div className="bg-white rounded-xl border border-rule p-5 flex flex-col justify-between gap-4">
          <div className="space-y-3">
            <h2 className="font-display text-[20px] font-bold leading-tight text-ink">{tr("Model provenance and validation", "Asal-usul dan validasi model")}</h2>
            <p className="text-xs leading-relaxed text-ink-2">
              <span className="font-medium text-ink">{tr("Method:", "Metode:")}</span>{" "}
              {methodology ||
                tr(
                  "CPM + XGBoost delay-risk model + Monte Carlo simulation (upload a schedule to score)",
                  "CPM + model risiko terlambat XGBoost + simulasi Monte Carlo (unggah jadwal untuk dinilai)"
                )}
            </p>

            <p className="text-xs text-ink-2 leading-relaxed">
              {tr(
                `Trained on ${modelCard.n_real_tasks.toLocaleString()} real historical tasks across DSLIB project DAGs and 4TU CNC shop-floor routing orders, blended with ${(modelCard.n_tasks - modelCard.n_real_tasks).toLocaleString()} synthetic WBS tasks.`,
                `Dilatih dengan ${modelCard.n_real_tasks.toLocaleString("id-ID")} tugas historis nyata dari DAG proyek DSLIB dan order routing lantai produksi CNC 4TU, dipadukan dengan ${(modelCard.n_tasks - modelCard.n_real_tasks).toLocaleString("id-ID")} tugas WBS sintetis.`
              )}
            </p>

            <ModelCardStrip card={modelCard} />
          </div>

        </div>
      </div>

      <div>
        <GanttTimeline
          tasks={tasks}
          baseRisk={overallRisk ?? 0}
          baseSlipDays={slippageDays ?? 0}
        />
      </div>

      <div>
        <DeviationTable tasks={tasks} />
      </div>
    </div>
  );
}
