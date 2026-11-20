"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
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
  fetchLiveOverviewKpis,
  fetchMlModelCard,
  MlModelCard,
} from "@/lib/api";
import { KpiItem } from "@/types";
import { Download, CalendarClock, CheckCircle2, Clock } from "lucide-react";

export default function DashboardOverviewPage() {
  const {
    selectedRole,
    isApiLive,
    actions,
    auditLog,
    setReviewingAction,
    showToast,
  } = useDashboard();

  const [liveKpis, setLiveKpis] = useState<KpiItem[] | null>(null);
  const [modelCard, setModelCard] = useState<MlModelCard>(DEFAULT_MODEL_CARD);
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

  return (
    <div className="space-y-6">
      <PageHeader
        title={currentRolePreset.title}
        description={currentRolePreset.sub}
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

      {/* 4 Role KPI Cards */}
      <div>
        <KpiCards kpis={isApiLive && liveKpis ? liveKpis : currentRolePreset.kpis} />
      </div>

      {/* Real-Data XGBoost Validation Readout */}
      <div>
        <ModelCardStrip card={modelCard} compact />
      </div>

      {/* Primary Analytics Grid: Operational Chart + Role-Sorted Decision Brief */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
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
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-7">
          <ProductionLineStatus
            onSelectLine={(line) => {
              showToast(`Opening IRoom Operation Tracker for ${line.name}`);
            }}
          />
        </div>
        <div className="lg:col-span-5">
          <RisksMonitor
            risks={RISKS_AND_OPPORTUNITIES}
            onSeeAllToast={() => showToast("Viewing active cross-module risk register")}
          />
        </div>
      </div>

      {/* HITL Audit Trail & Pilot Validation Checks (ISO 9001 Cl. 7.5 + BMC Table VI) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Audit Log */}
        <div className="lg:col-span-6 bg-white rounded-xl border border-rule p-5 space-y-3">
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

        {/* Pilot Validation Checks (BMC Table VI) */}
        <div className="lg:col-span-6 bg-white rounded-xl border border-rule p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-[20px] font-bold leading-tight text-ink">
                Pilot validation checklist
              </h2>
              <p className="text-xs text-ink-3">
                Benchmarking criteria for the planned 8-week pilot &amp; n=15 user evaluation
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
            {PILOT_CHECKS.map((chk) => (
              <div
                key={chk.id}
                className="p-2.5 rounded-lg bg-sheet border border-rule space-y-1"
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

    </div>
  );
}
