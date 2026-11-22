"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { useDashboard } from "@/features/workspace/dashboard-context";
import { KpiCards } from "@/features/risks/KpiCards";
import { ModelCardStrip } from "@/features/risks/ModelCardStrip";
import { DecisionBrief } from "@/features/risks/DecisionBrief";
import { RisksMonitor } from "@/features/risks/RisksMonitor";
import { PerformanceChart } from "@/features/dashboard/PerformanceChart";
import { ProductionLineStatus } from "@/features/dashboard/ProductionLineStatus";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button, LinkButton } from "@/components/ui/Button";
import { Verdict } from "@/components/ui/Verdict";
import { ROLE_PRESETS, RISKS_AND_OPPORTUNITIES, PILOT_CHECKS } from "@/lib/mock-data";
import {
  DEFAULT_MODEL_CARD,
  downloadOperationalExport,
  fetchIRoomDrawings,
  fetchIRoomMaterials,
  fetchIRoomOperations,
  fetchIRoomProjects,
  fetchLiveOverviewKpis,
  fetchMlModelCard,
  MlModelCard,
} from "@/lib/api";
import {
  DrawingApprovalItem,
  KpiItem,
  MaterialDeliveryItem,
  OperationTrackerItem,
  ProjectProgressItem,
  RiskItem,
} from "@/types";
import { Download, CalendarClock, CheckCircle2, Clock } from "lucide-react";

export default function DashboardOverviewPage() {
  const router = useRouter();
  const pageRef = useRef<HTMLDivElement>(null);
  const {
    userName,
    selectedRole,
    isApiLive,
    actions,
    auditLog,
    setReviewingAction,
    showToast,
  } = useDashboard();

  const [liveKpis, setLiveKpis] = useState<KpiItem[] | null>(null);
  const [modelCard, setModelCard] = useState<MlModelCard>(DEFAULT_MODEL_CARD);
  const [operations, setOperations] = useState<OperationTrackerItem[]>([]);
  const [materials, setMaterials] = useState<MaterialDeliveryItem[]>([]);
  const [projects, setProjects] = useState<ProjectProgressItem[]>([]);
  const [drawings, setDrawings] = useState<DrawingApprovalItem[]>([]);
  const currentRolePreset = ROLE_PRESETS[selectedRole] || ROLE_PRESETS["Operations Manager"];

  useEffect(() => {
    let active = true;
    fetchMlModelCard().then((card) => {
      if (active) setModelCard(card);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    Promise.all([
      fetchIRoomOperations(),
      fetchIRoomMaterials(),
      fetchIRoomProjects(),
      fetchIRoomDrawings(),
    ]).then(([ops, mats, projs, dwgs]) => {
      if (!active) return;
      setOperations(ops);
      setMaterials(mats);
      setProjects(projs);
      setDrawings(dwgs);
    });
    return () => {
      active = false;
    };
  }, [isApiLive, actions]);

  useEffect(() => {
    if (!isApiLive) return;
    let active = true;
    fetchLiveOverviewKpis(selectedRole).then((kpis) => {
      if (active) setLiveKpis(kpis);
    });
    return () => {
      active = false;
    };
  }, [isApiLive, selectedRole, actions]);

  // Prioritize actions matching the active role's department first
  const sortedActions = actions.toSorted((a, b) => {
    const aMatch = a.department === currentRolePreset.priorityDepartment ? 0 : 1;
    const bMatch = b.department === currentRolePreset.priorityDepartment ? 0 : 1;
    return aMatch - bMatch;
  });

  const handleExportSummary = () => {
    downloadOperationalExport(selectedRole, actions, auditLog);
    showToast(`Exported operational brief (.txt) for ${selectedRole}.`);
  };

  const liveRisks: RiskItem[] = [
    ...materials
      .filter((m) => m.status !== "Normal")
      .map((m) => ({
        id: `mat-${m.id}`,
        type: "risk" as const,
        symbol: "!",
        symbolClass: "warn" as const,
        title: `${m.partNumber} Stock Cover Alert`,
        desc: `${m.stockCoverHours}h stock cover left vs. ${m.supplierLeadDays}d lead time (${m.supplier})`,
        dept: "Supply Chain",
        badge: m.status,
        badgeClass: (m.status === "Critical" ? "red" : "warn") as "red" | "warn",
      })),
    ...operations
      .filter((op) => op.vibrationSensor !== "NORMAL")
      .map((op) => ({
        id: `op-${op.id}`,
        type: "risk" as const,
        symbol: "!",
        symbolClass: "warn" as const,
        title: `${op.workCenter} (${op.machineId})`,
        desc: `${op.activeJob} · OEE ${op.oeePercent}% · Vibration ${op.vibrationSensor}`,
        dept: "Maintenance",
        badge: op.vibrationSensor === "CRITICAL" ? "Critical Constraint" : "Attention",
        badgeClass: (op.vibrationSensor === "CRITICAL" ? "red" : "warn") as "red" | "warn",
      })),
    ...projects
      .filter((p) => p.status !== "On Schedule")
      .map((p) => ({
        id: `prj-${p.id}`,
        type: "risk" as const,
        symbol: "!",
        symbolClass: "warn" as const,
        title: `${p.projectCode}: ${p.name}`,
        desc: `${p.currentMilestone} · +${p.delayVarianceDays}d variance (${p.progressPercent}% complete)`,
        dept: "Production Planning",
        badge: p.status,
        badgeClass: (p.status === "Critical Risk" ? "red" : "warn") as "red" | "warn",
      })),
    ...drawings
      .filter((d) => d.status !== "Approved")
      .map((d) => ({
        id: `dwg-${d.id}`,
        type: "risk" as const,
        symbol: "!",
        symbolClass: "warn" as const,
        title: `${d.dwgNumber} ${d.revision} (${d.status})`,
        desc: `${d.title} · Engineer: ${d.engineer}`,
        dept: d.department,
        badge: d.status,
        badgeClass: (d.criticalDwg ? "red" : "warn") as "red" | "warn",
      })),
  ]
    .sort((a, b) => (a.badgeClass === "red" ? 0 : 1) - (b.badgeClass === "red" ? 0 : 1))
    .slice(0, 5);

  const displayedRisks = liveRisks.length > 0 ? liveRisks : RISKS_AND_OPPORTUNITIES;
  const criticalStreamsCount =
    materials.filter((m) => m.status === "Critical").length +
    operations.filter((op) => op.vibrationSensor === "CRITICAL").length +
    projects.filter((p) => p.status === "Critical Risk").length;

  const pendingActions = sortedActions.filter((a) => !a.flagged);
  const urgentPendingCount = pendingActions.filter((a) => a.urgency === "Urgent").length;
  const topPriorityAction = pendingActions[0] ?? sortedActions[0];
  const displayName = userName?.trim() || selectedRole;
  const keyInsightText =
    pendingActions.length > 0 && topPriorityAction
      ? `${urgentPendingCount} urgent of ${pendingActions.length} open decisions and ${criticalStreamsCount} critical IRoom alerts need ${selectedRole} attention — top priority: ${topPriorityAction.title}.`
      : `All ${sortedActions.length} operational decisions are signed off; ${criticalStreamsCount} critical IRoom alerts active.`;

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
    { scope: pageRef }
  );

  return (
    <div ref={pageRef} className="space-y-6">
      <PageHeader
        title={`Hello, ${displayName}`}
        description={`${currentRolePreset.title} · ${currentRolePreset.sub}`}
        actions={
          <>
            <Button variant="secondary" onClick={handleExportSummary}>
              <Download className="h-4 w-4" strokeWidth={1.6} />
              Export brief
            </Button>
            <LinkButton href="/dashboard/scheduler">
              <CalendarClock className="h-4 w-4" strokeWidth={1.6} />
              Open schedule
            </LinkButton>
          </>
        }
      />

      <div data-dash-section className="border border-rule-strong bg-sheet px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
        <p className="text-ink-2">
          <span className="font-semibold text-ink">Key insight:</span> {keyInsightText}
        </p>
        {topPriorityAction && (
          <button
            type="button"
            onClick={() => setReviewingAction(topPriorityAction)}
            className="font-medium text-stamp hover:underline cursor-pointer shrink-0 self-start py-2 sm:self-auto sm:py-0"
          >
            Review top priority →
          </button>
        )}
      </div>

      {/* 4 Role KPI Cards */}
      <div>
        <KpiCards kpis={isApiLive && liveKpis ? liveKpis : currentRolePreset.kpis} />
      </div>

      {/* Primary Analytics Grid: Operational Chart + Role-Sorted Decision Brief */}
      <div data-dash-section className="grid grid-cols-1 lg:grid-cols-12 lg:items-start gap-5">
        <div className="lg:col-span-7">
          <PerformanceChart />
        </div>
        <div className="lg:col-span-5">
          <DecisionBrief
            actions={sortedActions}
            priorityDepartment={currentRolePreset.priorityDepartment}
            onReviewAction={(act) => setReviewingAction(act)}
          />
        </div>
      </div>

      {/* Shop-Floor Work Centers & Risk Monitor */}
      <div data-dash-section className="grid grid-cols-1 lg:grid-cols-12 lg:items-start gap-5">
        <div className="lg:col-span-7">
          <ProductionLineStatus
            operations={operations}
            onSelectLine={(line) => {
              showToast(`Opening IRoom Operation Tracker for ${line.name}`);
              router.push("/dashboard/iroom?tab=operations");
            }}
          />
        </div>
        <div className="lg:col-span-5">
          <RisksMonitor
            risks={displayedRisks}
            onSeeAllToast={() => router.push("/dashboard/scheduler")}
          />
        </div>
      </div>

      {/* HITL Decision Audit Log */}
      <div className="bg-sheet border border-rule-strong p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-[20px] font-bold leading-tight text-ink">
              Human-in-the-Loop Decision Audit Log
            </h2>
            <p className="text-xs text-ink-3">
              ISO 9001 Cl. 7.5 / AS9100D record control for accepted and overridden changes
            </p>
          </div>
          <span className="font-mono-numbers text-xs text-ink-3">
            {auditLog.length} logged
          </span>
        </div>

        <div className="divide-y divide-rule-soft text-xs max-h-60 overflow-y-auto">
          {auditLog.map((entry) => (
            <div key={entry.id} className="py-2.5 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Verdict tone={entry.decision === "AUTHORIZED" ? "pass" : "warn"}>
                    {entry.decision === "AUTHORIZED" ? "Authorized" : "Overridden"}
                  </Verdict>
                  <span className="font-medium text-ink truncate">
                    {entry.actionTitle}
                  </span>
                </div>
                <p className="text-ink-2 mt-1">{entry.notes}</p>
                <div className="text-xs text-ink-3 mt-0.5 font-mono-numbers">
                  {entry.reviewerRole} · Ref:{" "}
                  <Link
                    href={`/dashboard/knowledge?doc=${encodeURIComponent(entry.sopRef)}`}
                    className="text-stamp hover:underline"
                  >
                    {entry.sopRef}
                  </Link>
                </div>
              </div>
              <span className="text-xs font-mono-numbers text-ink-3 shrink-0">
                {entry.timestamp}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Collapsible Model Validation & Pilot Benchmark Disclosure */}
      <details className="bg-sheet border border-rule-strong">
        <summary className="cursor-pointer px-5 py-3.5 text-sm font-medium text-ink flex items-center justify-between hover:bg-paper transition-colors">
          <span>Model validation &amp; pilot benchmark details</span>
          <span className="font-mono-numbers text-xs text-ink-3">
            ROC-AUC {(modelCard.real_validation_metrics?.roc_auc ?? modelCard.synthetic_test_metrics.roc_auc ?? 0).toFixed(2)} · {PILOT_CHECKS.length} checks
          </span>
        </summary>
        <div className="border-t border-rule-strong p-5 grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-6">
            <ModelCardStrip card={modelCard} compact />
          </div>
          <div className="lg:col-span-6 space-y-3">
            <div>
              <h2 className="font-display text-[20px] font-bold leading-tight text-ink">
                Pilot validation checklist
              </h2>
              <p className="text-xs text-ink-3">
                Benchmarking criteria for the planned 8-week pilot &amp; n=15 user evaluation
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
              {PILOT_CHECKS.map((chk) => (
                <div
                  key={chk.id}
                  className="p-2.5 bg-paper border border-rule space-y-1"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-ink truncate">{chk.check}</span>
                    {chk.status === "pass" ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-pass shrink-0" strokeWidth={1.5} />
                    ) : (
                      <Clock className="w-3.5 h-3.5 text-warn shrink-0" strokeWidth={1.5} />
                    )}
                  </div>
                  <div className="text-xs text-ink-2">Target: {chk.target}</div>
                  <div className="text-xs font-mono-numbers text-stamp">
                    Status: {chk.currentSim}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </details>

    </div>
  );
}
