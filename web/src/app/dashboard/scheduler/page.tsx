"use client";

import React, { useState, useEffect } from "react";
import { useDashboard } from "../layout";
import { ScheduleUploader } from "@/features/scheduler/ScheduleUploader";
import { GanttTimeline } from "@/features/scheduler/GanttTimeline";
import { DeviationTable } from "@/features/scheduler/DeviationTable";
import { fetchDelayRiskPrediction } from "@/lib/api";
import { WBS_TASKS, RISK_DRIVERS } from "@/lib/mock-data";
import { WbsTask, RiskDriver } from "@/types";
import { Info } from "lucide-react";

export default function SchedulerPage() {
  const { showToast } = useDashboard();
  const [tasks, setTasks] = useState<WbsTask[]>(WBS_TASKS);
  const [overallRisk, setOverallRisk] = useState<number>(65.2);
  const [slippageDays, setSlippageDays] = useState<number>(3.5);
  const [methodology, setMethodology] = useState<string>(
    "Rule-Based CPM + Heuristic PoC (XGBoost Roadmap)"
  );
  const [drivers, setDrivers] = useState<RiskDriver[]>(RISK_DRIVERS);

  useEffect(() => {
    let active = true;
    fetchDelayRiskPrediction().then((pred) => {
      if (!active || !pred) return;
      if (pred.tasks && pred.tasks.length > 0) setTasks(pred.tasks);
      setOverallRisk(pred.overall_delay_probability);
      setSlippageDays(pred.estimated_project_slippage_days);
      setMethodology(pred.methodology);
      if (pred.risk_drivers && pred.risk_drivers.length > 0) {
        setDrivers(pred.risk_drivers);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  const handleUploadComplete = (data: { tasks?: WbsTask[] }) => {
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
        <div className="text-xs font-medium text-[#2563eb] mb-1">
          BINUS RTT D1521 &amp; PT IMAJIN Research Core
        </div>
        <h1 className="text-xl sm:text-2xl font-semibold text-[#101e30] tracking-tight">
          AI Project Scheduler &amp; Heuristic Delay-Risk Engine
        </h1>
        <p className="text-xs sm:text-sm text-[#536780]">
          Standardizes unstructured CSV/Excel/PDF work schedules into normalized WBS activities and computes critical-path slippage risk.
        </p>
      </div>

      <ScheduleUploader onUploadComplete={handleUploadComplete} onToast={showToast} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white rounded-xl border border-[#e2eaf3] p-5">
          <div className="flex items-start justify-between gap-2 mb-3">
            <div>
              <h2 className="text-[15px] font-medium text-[#111827]">
                Delay-Risk Probability Summary
              </h2>
              <p className="text-xs text-[#64748b]">
                Project Alpha: Precision Stamping &amp; Aerospace Tooling
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-[#fef2f2] text-[#dc2626] border border-[#fecaca] font-mono-numbers">
              Risk: {overallRisk}%
            </span>
          </div>

          <div className="text-3xl sm:text-4xl font-semibold text-[#dc2626] font-mono-numbers my-3">
            +{slippageDays} Days Slippage
          </div>
          <p className="text-xs text-[#64748b] mb-4">
            Estimated delivery variance from Critical Path Method (CPM) + weighted heuristic rules.
          </p>

          <div className="pt-3 border-t border-[#f1f5f9]">
            <div className="text-xs font-semibold text-[#101e30] mb-2">
              Root-Cause Risk Drivers:
            </div>
            <ul className="text-xs text-[#475569] space-y-1.5 list-disc pl-4">
              {drivers.map((drv, idx) => (
                <li key={idx}>
                  <strong className="text-[#1e293b]">
                    {drv.factor} ({drv.weight})
                  </strong>{" "}
                  - {drv.impact}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-[#e2eaf3] p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 mb-3">
              <h2 className="text-[15px] font-medium text-[#111827]">
                Engine Configuration &amp; Feature Maturity
              </h2>
              <span className="px-2 py-0.5 rounded text-[11px] font-mono-numbers bg-[#f3f4f6] text-[#374151] border border-[#e5e7eb]">
                {methodology}
              </span>
            </div>

            <p className="text-xs text-[#4b5565] leading-relaxed mb-4">
              Per MDIP BMC Table II, schedule extraction and normalized WBS parsing operate at TRL 4 prototype stage, while delay-risk flags currently run on transparent CPM and heuristic rules. Supervised XGBoost duration prediction activates once partner historical logs are ingested in the pilot phase.
            </p>
          </div>

          <div className="p-3.5 bg-[#fafafa] border border-[#e5e7eb] rounded-xl text-xs text-[#374151] space-y-1">
            <div className="flex items-center gap-1.5 font-medium text-[#111827]">
              <Info className="w-4 h-4 text-[#2563eb]" strokeWidth={1.5} />
              <span>Verified BINUS RTT Research Reference:</span>
            </div>
            <p className="text-[#4b5565] text-[11px] leading-snug">
              &quot;Sistem Inteligensi Penjadwalan dan Pendukung Keputusan Berbasis AI untuk Mitigasi Risiko Keterlambatan pada Manufaktur Berbasis Proyek&quot; (Dr. Ir. Indrajani, S.Kom., M.M.)
            </p>
          </div>
        </div>
      </div>

      <GanttTimeline tasks={tasks} />

      <DeviationTable tasks={tasks} />
    </div>
  );
}
