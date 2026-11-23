"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import {
  readStoredUserSchedule,
  useDashboard,
  writeStoredUserSchedule,
} from "@/features/workspace/dashboard-context";
import { KpiCards } from "@/features/risks/KpiCards";
import { ModelCardStrip } from "@/features/risks/ModelCardStrip";
import { DecisionBrief } from "@/features/risks/DecisionBrief";
import { RisksMonitor } from "@/features/risks/RisksMonitor";
import { PerformanceChart } from "@/features/dashboard/PerformanceChart";
import { ProductionLineStatus } from "@/features/dashboard/ProductionLineStatus";
import { StartHere } from "@/features/dashboard/StartHere";
import { ScheduleUploader } from "@/features/scheduler/ScheduleUploader";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button, LinkButton } from "@/components/ui/Button";
import { Verdict } from "@/components/ui/Verdict";
import { ROLE_PRESETS } from "@/lib/mock-data";
import {
  DEFAULT_MODEL_CARD,
  downloadOperationalExport,
  fetchDecisionActions,
  fetchDelayRiskPrediction,
  fetchMlModelCard,
  MlModelCard,
  scoreSopDocument,
} from "@/lib/api";
import { DecisionAction, DelayRiskPrediction, KnowledgeDoc, KpiItem, RiskItem, WbsTask } from "@/types";
import { Download, CalendarClock } from "lucide-react";
import { useT } from "@/lib/i18n";

function matchSopForTask(task: WbsTask, priorityDepartment: string, docs: KnowledgeDoc[]): string {
  if (docs.length === 0) return "";
  const query = `${task.code} ${task.task} ${task.workCenter || ""} ${priorityDepartment}`.toLowerCase();
  const qTokens = new Set(query.match(/[a-z0-9-]{2,}/g) || []);
  let bestScore = -1;
  let bestCode = docs[0].code;
  for (const doc of docs) {
    const score = scoreSopDocument(doc, query, qTokens);
    if (score > bestScore) {
      bestScore = score;
      bestCode = doc.code;
    }
  }
  return bestCode;
}

function actionsFromTasks(
  tasks: WbsTask[],
  priorityDepartment: string,
  knowledgeDocs: KnowledgeDoc[] = []
): DecisionAction[] {
  return [...tasks]
    .filter((t) => t.delayRisk >= 0.25 || (t.varianceDays ?? 0) > 0 || t.actualDays > t.plannedDays)
    .sort((a, b) => b.delayRisk - a.delayRisk)
    .slice(0, 6)
    .map((t) => {
      const pct = Math.round(t.delayRisk * 100);
      const variance = t.varianceDays ?? Math.max(0, t.actualDays - t.plannedDays);
      const urgency: DecisionAction["urgency"] =
        t.riskLevel === "HIGH" || pct >= 65 ? "Urgent" : pct >= 40 ? "High" : "Medium";
      return {
        id: `act-${t.code.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
        title: `Mitigate ${t.code}: ${t.task}`,
        urgency,
        urgencyBadge: urgency === "Urgent" ? "red" : "warn",
        department: priorityDepartment,
        confidence: Math.max(55, Math.min(98, pct)),
        description: `Uploaded task (${t.workCenter || "Unassigned cell"}) scores ${pct}% delay risk (+${variance}d variance). ${t.drivers?.[0] || "Monitor schedule float."}`,
        impact: `Protects ${t.critical ? "critical path" : "WBS float"} (${t.plannedDays}d planned vs ${t.actualDays}d forecast).`,
        owner: t.owner || priorityDepartment,
        due: urgency === "Urgent" ? "Immediate" : "Next shift review",
        sourceDoc: matchSopForTask(t, priorityDepartment, knowledgeDocs),
        flagged: false,
        status: "pending",
      };
    });
}

export default function DashboardOverviewPage() {
  const router = useRouter();
  const tr = useT(); // `t` is the task variable throughout this file
  const pageRef = useRef<HTMLDivElement>(null);
  const {
    userId,
    userName,
    selectedRole,
    knowledgeDocs,
    actions,
    setActions,
    auditLog,
    setReviewingAction,
    showToast,
    askCopilotWithPrompt,
  } = useDashboard();

  const [prediction, setPrediction] = useState<DelayRiskPrediction | null>(null);
  const [loadingSchedule, setLoadingSchedule] = useState(true);
  const [modelCard, setModelCard] = useState<MlModelCard>(DEFAULT_MODEL_CARD);
  const currentRolePreset = ROLE_PRESETS[selectedRole] || ROLE_PRESETS["Operations Manager"];

  useEffect(() => {
    let active = true;
    Promise.all([fetchDelayRiskPrediction(), fetchMlModelCard()]).then(([pred, card]) => {
      if (!active) return;
      if (pred) {
        setPrediction(pred);
        writeStoredUserSchedule(pred, userId);
      } else {
        setPrediction(readStoredUserSchedule(userId));
      }
      setModelCard(card);
      setLoadingSchedule(false);
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
      const [pred, freshActions] = await Promise.all([
        fetchDelayRiskPrediction(),
        fetchDecisionActions(),
      ]);
      if (pred) {
        setPrediction(pred);
        writeStoredUserSchedule(pred, userId);
      }
      if (freshActions && freshActions.length > 0) setActions(freshActions);
      return;
    }
    if (data?.tasks && data.tasks.length > 0) {
      const tasks = data.tasks;
      const highRisk = tasks.filter((t) => t.riskLevel === "HIGH" || t.delayRisk >= 0.6).length;
      const crit = tasks.filter((t) => t.critical).length;
      const avgRisk = Math.round((tasks.reduce((s, t) => s + t.delayRisk, 0) / tasks.length) * 100);
      const totalOverrun = tasks.reduce((s, t) => s + Math.max(0, t.actualDays - t.plannedDays), 0);
      const localPred: DelayRiskPrediction = {
        source: "upload",
        filename: data.filename,
        extraction_method: data.extraction_method || "table",
        document_summary: data.document_summary ?? null,
        project_name:
          data.filename?.replace(/\.(csv|xlsx|xls|pdf|docx|doc)$/i, "").replace(/_/g, " ") ||
          "Uploaded Schedule",
        overall_delay_probability: avgRisk,
        critical_path_tasks_count: crit,
        high_risk_tasks_count: highRisk,
        estimated_project_slippage_days: totalOverrun,
        risk_drivers: [],
        tasks,
        methodology: "Local schedule parse",
      };
      setPrediction(localPred);
      writeStoredUserSchedule(localPred, userId);
    }
  };

  const tasks = prediction?.tasks ?? [];
  const taskCodes = new Set(tasks.map((t) => t.code.toLowerCase()));
  const backendTaskActions = actions.filter((a) => {
    const hay = `${a.id} ${a.title}`.toLowerCase();
    return Array.from(taskCodes).some((code) => hay.includes(code));
  });
  const activeActions = (
    backendTaskActions.length > 0
      ? backendTaskActions
      : actionsFromTasks(tasks, currentRolePreset.priorityDepartment, knowledgeDocs)
  ).toSorted((a, b) => {
    const aMatch = a.department === currentRolePreset.priorityDepartment ? 0 : 1;
    const bMatch = b.department === currentRolePreset.priorityDepartment ? 0 : 1;
    return aMatch - bMatch;
  });

  const onPlanCount = tasks.filter((t) => t.actualDays <= t.plannedDays).length;
  const overrunCount = tasks.length - onPlanCount;
  const attainmentPct = tasks.length > 0 ? (onPlanCount / tasks.length) * 100 : 0;
  const pendingActions = activeActions.filter((a) => !a.flagged);
  const urgentPendingCount = pendingActions.filter((a) => a.urgency === "Urgent").length;
  const topPriorityAction = pendingActions[0] ?? activeActions[0];

  const uploadedKpis: KpiItem[] = prediction
    ? [
        {
          title: tr("Schedule Attainment", "Pencapaian Jadwal"),
          value: `${attainmentPct.toFixed(1)}%`,
          trend: tr(`${onPlanCount}/${tasks.length} tasks on plan`, `${onPlanCount}/${tasks.length} tugas sesuai rencana`),
          subtle: prediction.filename || prediction.project_name,
          icon: "activity",
          status: attainmentPct >= 80 ? "normal" : attainmentPct >= 50 ? "warn" : "alert",
        },
        {
          title: tr("ML Delay Risk", "Risiko Terlambat (ML)"),
          value: `${prediction.overall_delay_probability.toFixed(1)}%`,
          trend: tr(
            `P50 +${prediction.estimated_project_slippage_days.toFixed(1)}d slippage`,
            `P50 mundur +${prediction.estimated_project_slippage_days.toFixed(1)} hari`
          ),
          subtle: tr(`${prediction.critical_path_tasks_count} critical-path tasks`, `${prediction.critical_path_tasks_count} tugas jalur kritis`),
          icon: "alert",
          status:
            prediction.overall_delay_probability >= 60
              ? "alert"
              : prediction.overall_delay_probability >= 30
              ? "warn"
              : "normal",
        },
        {
          title: tr("High-Risk WBS Tasks", "Tugas WBS Berisiko Tinggi"),
          value: `${prediction.high_risk_tasks_count} / ${tasks.length}`,
          trend: tr(`${overrunCount} tasks over planned duration`, `${overrunCount} tugas melebihi durasi rencana`),
          subtle: prediction.methodology || "XGBoost + CPM",
          icon: "layers",
          status: prediction.high_risk_tasks_count > 0 ? "warn" : "normal",
        },
        {
          title: tr("Open HITL Decisions", "Keputusan HITL Terbuka"),
          value: tr(`${pendingActions.length} Pending`, `${pendingActions.length} Menunggu`),
          trend: tr(`${urgentPendingCount} urgent`, `${urgentPendingCount} mendesak`),
          subtle: tr(`${auditLog.length} signed off in session`, `${auditLog.length} disahkan di sesi ini`),
          icon: "check",
          status: urgentPendingCount > 0 ? "alert" : "normal",
        },
      ]
    : [];

  const uploadedRisks: RiskItem[] = [...tasks]
    .filter(
      (t) =>
        t.riskLevel === "HIGH" ||
        t.riskLevel === "MEDIUM" ||
        t.delayRisk >= 0.25 ||
        t.actualDays > t.plannedDays
    )
    .sort((a, b) => b.delayRisk - a.delayRisk)
    .slice(0, 6)
    .map((t) => {
      const pct = Math.round(t.delayRisk * 100);
      const isHigh = t.riskLevel === "HIGH" || t.delayRisk >= 0.6;
      const variance = Math.max(0, t.actualDays - t.plannedDays);
      return {
        id: `risk-${t.code}`,
        type: "risk",
        symbol: "!",
        symbolClass: "warn",
        title: `${t.code}: ${t.task}`,
        desc: tr(
          `${pct}% delay risk · ${t.actualDays}d forecast vs ${t.plannedDays}d plan (+${variance}d) · ${t.drivers?.[0] || "Critical schedule path"}`,
          `Risiko terlambat ${pct}% · prakiraan ${t.actualDays} h vs rencana ${t.plannedDays} h (+${variance} h) · ${t.drivers?.[0] ? tr(t.drivers[0]) : "Jalur jadwal kritis"}`
        ),
        dept: t.workCenter || t.owner || tr("Unassigned", "Belum ditugaskan"),
        badge: tr(isHigh ? "Hold" : "Watch"),
        badgeClass: isHigh ? "red" : "warn",
      };
    });

  const displayName = userName?.trim() || selectedRole;
  const keyInsightText = loadingSchedule
    ? tr("Checking for an uploaded project schedule...", "Memeriksa jadwal proyek yang diunggah...")
    : !prediction
    ? tr(
        "No uploaded schedule active. Upload a CSV, Excel, PDF, or Word schedule below to populate your cockpit from real tasks.",
        "Belum ada jadwal aktif. Unggah jadwal CSV, Excel, PDF, atau Word di bawah untuk mengisi kokpit dengan tugas nyata."
      )
    : pendingActions.length > 0 && topPriorityAction
    ? tr(
        `${prediction.filename || prediction.project_name}: ${prediction.overall_delay_probability.toFixed(1)}% delay risk (+${prediction.estimated_project_slippage_days.toFixed(1)}d P50) and ${pendingActions.length} open decisions — top priority: ${topPriorityAction.title}.`,
        `${prediction.filename || prediction.project_name}: risiko terlambat ${prediction.overall_delay_probability.toFixed(1)}% (+${prediction.estimated_project_slippage_days.toFixed(1)} hari P50) dan ${pendingActions.length} keputusan terbuka — prioritas utama: ${topPriorityAction.title}.`
      )
    : tr(
        `${prediction.filename || prediction.project_name}: all ${activeActions.length} task decisions reviewed (${tasks.length} WBS tasks analyzed).`,
        `${prediction.filename || prediction.project_name}: semua ${activeActions.length} keputusan tugas sudah ditinjau (${tasks.length} tugas WBS dianalisis).`
      );

  const handleExportSummary = () => {
    downloadOperationalExport(selectedRole, activeActions, auditLog);
    showToast(tr(`Exported operational brief (.txt) for ${selectedRole}.`, `Ringkasan operasional (.txt) untuk ${tr(selectedRole)} diekspor.`));
  };

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.from("[data-dash-section]", {
          y: 10,
          opacity: 0,
          duration: 0.3,
          stagger: 0.05,
          ease: "power2.out",
          clearProps: "transform,opacity",
        });
      });
      return () => mm.revert();
    },
    { scope: pageRef, dependencies: [Boolean(prediction)] }
  );

  return (
    <div ref={pageRef} className="space-y-6">
      <PageHeader
        title={tr(`Hello, ${displayName}`, `Halo, ${userName?.trim() || tr(selectedRole)}`)}
        description={
          prediction
            ? tr(
                `${currentRolePreset.title} · Active uploaded schedule: ${prediction.filename || prediction.project_name}`,
                `${tr(currentRolePreset.title)} · Jadwal aktif: ${prediction.filename || prediction.project_name}`
              )
            : tr(
                `${currentRolePreset.title} · Waiting for an uploaded project schedule`,
                `${tr(currentRolePreset.title)} · Menunggu jadwal proyek diunggah`
              )
        }
        actions={
          <>
            {prediction && (
              <Button variant="secondary" onClick={handleExportSummary}>
                <Download className="h-4 w-4" strokeWidth={1.6} />
                {tr("Export brief", "Ekspor ringkasan")}
              </Button>
            )}
            <LinkButton href="/dashboard/scheduler">
              <CalendarClock className="h-4 w-4" strokeWidth={1.6} />
              {tr("Open schedule", "Buka jadwal")}
            </LinkButton>
          </>
        }
      />

      {!loadingSchedule && <StartHere hasSchedule={Boolean(prediction)} />}

      <div
        data-dash-section
        className="border border-rule-strong bg-sheet px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
      >
        <p className="text-ink-2">
          <span className="font-semibold text-ink">{tr("Key insight:", "Wawasan utama:")}</span> {keyInsightText}
        </p>
        {prediction && topPriorityAction && (
          <button
            type="button"
            onClick={() => setReviewingAction(topPriorityAction)}
            className="font-medium text-stamp hover:underline cursor-pointer shrink-0 self-start py-2 sm:self-auto sm:py-0"
          >
            {tr("Review top priority →", "Tinjau prioritas utama →")}
          </button>
        )}
      </div>

      {!loadingSchedule && !prediction && (
        <div data-dash-section className="space-y-3">
          <ScheduleUploader
            onUploadComplete={(res) => {
              void handleUploadComplete(res);
            }}
            onAskCopilot={(q) => {
              void askCopilotWithPrompt(q);
            }}
            onToast={showToast}
          />
        </div>
      )}

      {prediction && (
        <>
          <div>
            <KpiCards kpis={uploadedKpis} />
          </div>

          <div
            data-dash-section
            className="grid grid-cols-1 lg:grid-cols-12 lg:items-start gap-5"
          >
            <div className="lg:col-span-7">
              <PerformanceChart tasks={tasks} projectName={prediction.project_name} />
            </div>
            <div className="lg:col-span-5">
              <DecisionBrief
                actions={activeActions}
                priorityDepartment={currentRolePreset.priorityDepartment}
                onReviewAction={(act) => setReviewingAction(act)}
              />
            </div>
          </div>

          <div
            data-dash-section
            className="grid grid-cols-1 lg:grid-cols-12 lg:items-start gap-5"
          >
            <div className="lg:col-span-7">
              <ProductionLineStatus
                tasks={tasks}
                projectName={prediction.project_name}
                onSelectLine={(line) => {
                  showToast(tr(`Inspecting ${line.name} on schedule`, `Memeriksa ${line.name} di jadwal`));
                }}
              />
            </div>
            <div className="lg:col-span-5">
              <RisksMonitor
                risks={uploadedRisks}
                onSeeAllToast={() => router.push("/dashboard/scheduler")}
              />
            </div>
          </div>

          <div className="bg-sheet border border-rule-strong p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display text-[20px] font-bold leading-tight text-ink">
                  {tr("Human-in-the-Loop Decision Audit Log", "Log Audit Keputusan Human-in-the-Loop")}
                </h2>
                <p className="text-xs text-ink-3">
                  {tr(
                    "ISO 9001 Cl. 7.5 / AS9100D record control for accepted and overridden changes",
                    "Kendali catatan ISO 9001 Kl. 7.5 / AS9100D untuk perubahan yang disetujui dan dibatalkan"
                  )}
                </p>
              </div>
              <span className="font-mono-numbers text-xs text-ink-3">
                {tr(`${auditLog.length} logged`, `${auditLog.length} tercatat`)}
              </span>
            </div>

            {auditLog.length === 0 ? (
              <p className="text-xs text-ink-3 py-2">
                {tr("No decisions authorized or overridden yet for this schedule.", "Belum ada keputusan yang disetujui atau dibatalkan untuk jadwal ini.")}
              </p>
            ) : (
              <div className="divide-y divide-rule-soft text-xs max-h-60 overflow-y-auto">
                {auditLog.map((entry) => (
                  <div key={entry.id} className="py-2.5 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Verdict tone={entry.decision === "AUTHORIZED" ? "pass" : "warn"}>
                          {entry.decision === "AUTHORIZED" ? tr("Authorized", "Disetujui") : tr("Overridden", "Dibatalkan")}
                        </Verdict>
                        <span className="font-medium text-ink truncate">
                          {entry.actionTitle}
                        </span>
                      </div>
                      <p className="text-ink-2 mt-1">{entry.notes}</p>
                      <div className="text-xs text-ink-3 mt-0.5 font-mono-numbers">
                        {tr(entry.reviewerRole)} · Ref:{" "}
                        {entry.sopRef ? (
                          <Link
                            href={`/dashboard/knowledge?doc=${encodeURIComponent(entry.sopRef)}`}
                            className="text-stamp hover:underline"
                          >
                            {entry.sopRef}
                          </Link>
                        ) : (
                          <span>{tr("No SOP linked", "Belum ada SOP terkait")}</span>
                        )}
                      </div>
                    </div>
                    <span className="text-xs font-mono-numbers text-ink-3 shrink-0">
                      {entry.timestamp}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <details className="bg-sheet border border-rule-strong">
            <summary className="cursor-pointer px-5 py-3.5 text-sm font-medium text-ink flex items-center justify-between hover:bg-paper transition-colors">
              <span>{tr("Model validation readout", "Hasil validasi model")}</span>
              <span className="font-mono-numbers text-xs text-ink-3">
                ROC-AUC {(modelCard.real_validation_metrics?.roc_auc ?? modelCard.synthetic_test_metrics.roc_auc ?? 0).toFixed(2)}
              </span>
            </summary>
            <div className="border-t border-rule-strong p-5">
              <ModelCardStrip card={modelCard} compact />
            </div>
          </details>
        </>
      )}
    </div>
  );
}
