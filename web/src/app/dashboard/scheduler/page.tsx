"use client";

import React, { useState, useEffect } from "react";
import { useDashboard } from "../layout";
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
import { WBS_TASKS, RISK_DRIVERS } from "@/lib/mock-data";
import { WbsTask, RiskDriver } from "@/types";

export default function SchedulerPage() {
  const { showToast, setActions } = useDashboard();
  const [tasks, setTasks] = useState<WbsTask[]>(WBS_TASKS);
  const [projectName, setProjectName] = useState<string>(
    "Project Alpha - Precision Stamping & Aerospace Tooling"
  );
  const [overallRisk, setOverallRisk] = useState<number>(59.9);
  const [slippageDays, setSlippageDays] = useState<number>(5.05);
  const [methodology, setMethodology] = useState<string>(
    "Offline fallback (backend disconnected)"
  );
  const [drivers, setDrivers] = useState<RiskDriver[]>(RISK_DRIVERS);
  const [modelCard, setModelCard] = useState<MlModelCard>(DEFAULT_MODEL_CARD);

  const applyPrediction = (pred: Awaited<ReturnType<typeof fetchDelayRiskPrediction>>) => {
    if (pred.project_name) setProjectName(pred.project_name);
    if (pred.tasks && pred.tasks.length > 0) setTasks(pred.tasks);
    setOverallRisk(pred.overall_delay_probability);
    setSlippageDays(pred.estimated_project_slippage_days);
    setMethodology(pred.methodology);
    if (pred.risk_drivers && pred.risk_drivers.length > 0) {
      setDrivers(pred.risk_drivers);
    }
  };

  useEffect(() => {
    let active = true;
    fetchDelayRiskPrediction().then((pred) => {
      if (active && pred) applyPrediction(pred);
    });
    fetchMlModelCard().then((card) => {
      if (active) setModelCard(card);
    });
    return () => {
      active = false;
    };
  }, []);

  const handleUploadComplete = async (data: { tasks?: WbsTask[]; source?: string }) => {
    if (data?.source === "backend") {
      // Backend scored the uploaded schedule; pull the updated analysis and computed decisions.
      const [pred, freshActions] = await Promise.all([
        fetchDelayRiskPrediction(),
        fetchDecisionActions(),
      ]);
      applyPrediction(pred);
      if (freshActions && freshActions.length > 0) {
        setActions(freshActions);
      }
      return;
    }
    if (data?.tasks && data.tasks.length > 0) {
      setTasks(data.tasks);
      const critCount = data.tasks.filter((t) => t.critical).length;
      const totalSlip = data.tasks.reduce(
        (acc, t) => acc + Math.max(0, t.actualDays - t.plannedDays),
        0
      );
      const avgRisk = Math.round(
        (data.tasks.reduce((acc, t) => acc + t.delayRisk, 0) / data.tasks.length) * 1000
      ) / 10;
      setSlippageDays(totalSlip > 0 ? totalSlip : 1.5);
      setOverallRisk(Math.min(95, Math.max(avgRisk, critCount * 15)));
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-medium text-[#111827] tracking-tight">
          AI Project Scheduler &amp; Delay-Risk Engine
        </h1>
        <p className="text-xs sm:text-sm text-[#4b5565] mt-0.5">
          Normalizes CSV and Excel schedules into WBS work packages and scores critical-path slippage risk.
        </p>
      </div>

      <ScheduleUploader onUploadComplete={handleUploadComplete} onToast={showToast} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white rounded-xl border border-[#e5e7eb] p-5">
          <div className="flex items-start justify-between gap-2 mb-3">
            <div>
              <h2 className="text-[15px] font-medium text-[#111827]">
                Delay-Risk Probability Summary
              </h2>
              <p className="text-xs text-[#64748b]">
                {projectName}
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-[#fef2f2] text-[#dc2626] border border-[#fecaca] font-mono-numbers">
              Risk: {overallRisk}%
            </span>
          </div>

          <div className="text-3xl sm:text-4xl font-medium text-[#dc2626] font-mono-numbers my-3">
            +{slippageDays.toFixed(1)} Days Slippage
          </div>
          <p className="text-xs text-[#64748b] mb-4">
            Median (P50) project slippage across 2,000 Monte Carlo CPM runs from XGBoost task predictions.
          </p>

          <div className="pt-3 border-t border-[#f1f5f9]">
            <div className="text-xs font-medium text-[#111827] mb-2">
              Root-Cause Risk Drivers
            </div>
            <ul className="text-xs text-[#4b5565] space-y-1.5 list-disc pl-4">
              {drivers.map((drv, idx) => (
                <li key={idx}>
                  <span className="font-medium text-[#111827]">
                    {drv.factor} ({drv.weight})
                  </span>{" "}
                  — {drv.impact}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-[#e5e7eb] p-5 flex flex-col justify-between gap-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-[15px] font-medium text-[#111827]">
                Model Provenance &amp; Validation
              </h2>
              <span className="px-2 py-0.5 rounded text-[11px] font-mono-numbers bg-[#f3f4f6] text-[#374151] border border-[#e5e7eb]">
                {methodology}
              </span>
            </div>

            <p className="text-xs text-[#4b5565] leading-relaxed">
              Trained on {modelCard.n_real_tasks.toLocaleString()} real historical tasks across DSLIB project DAGs and 4TU CNC shop-floor routing orders, blended with {((modelCard.n_tasks - modelCard.n_real_tasks)).toLocaleString()} synthetic WBS tasks.
            </p>

            <ModelCardStrip card={modelCard} />
          </div>

        </div>
      </div>

      <GanttTimeline tasks={tasks} baseRisk={overallRisk} baseSlipDays={slippageDays} />

      <DeviationTable tasks={tasks} />
    </div>
  );
}
