"use client";

import React, { useState, useEffect } from "react";
import { useDashboard } from "../layout";
import { ScheduleUploader } from "@/features/scheduler/ScheduleUploader";
import { GanttTimeline } from "@/features/scheduler/GanttTimeline";
import { DeviationTable } from "@/features/scheduler/DeviationTable";
import { fetchWbsSchedule } from "@/lib/api";
import { WBS_TASKS } from "@/lib/mock-data";
import { WbsTask } from "@/types";
import { Info } from "lucide-react";

export default function SchedulerPage() {
  const { showToast } = useDashboard();
  const [tasks, setTasks] = useState<WbsTask[]>(WBS_TASKS);

  useEffect(() => {
    fetchWbsSchedule().then((res) => {
      if (res && res.length > 0) setTasks(res);
    });
  }, []);

  const handleUploadComplete = (data: { tasks?: WbsTask[] }) => {
    if (data?.tasks) {
      setTasks(data.tasks);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <div className="text-[11px] font-bold text-[#2563eb] uppercase tracking-widest mb-1">
          Research Core · BINUS RTT & IMAJIN Enterprise
        </div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-[#101e30] tracking-tight">
          AI Project Scheduler & Delay-Risk ML Engine
        </h1>
        <p className="text-xs sm:text-sm text-[#536780]">
          Standardizes unstructured Excel/PDF schedules into normalized WBS activities and predicts critical path slippage.
        </p>
      </div>

      {/* Schedule Ingestion Component */}
      <ScheduleUploader
        onUploadComplete={handleUploadComplete}
        onToast={showToast}
      />

      {/* Top 2 Cards: Delay-Risk Summary + Methodology */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Delay Risk Summary Card */}
        <div className="bg-white rounded-xl border border-[#e2eaf3] p-5 shadow-[0_2px_8px_rgba(12,26,45,0.04)]">
          <div className="flex items-start justify-between gap-2 mb-3">
            <div>
              <h2 className="text-base font-bold text-[#101e30] tracking-tight">
                Delay-Risk Probability Summary
              </h2>
              <p className="text-xs text-[#536780]">Project Alpha: Precision Stamping & Aerospace Tooling</p>
            </div>
            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-[#fee2e2] text-[#dc2626] border border-[#fecaca]">
              Overall Delay Risk: 65.2%
            </span>
          </div>

          <div className="text-3xl sm:text-4xl font-extrabold text-[#dc2626] font-mono-numbers my-3">
            3.5 Days Slippage
          </div>
          <p className="text-xs text-[#64748b] mb-4">
            Predicted delivery variance calculated from critical path deviation and supervised ML classification.
          </p>

          <div className="pt-3 border-t border-[#f1f5f9]">
            <div className="text-xs font-bold text-[#101e30] mb-2 uppercase tracking-wide">
              Top Root-Cause Risk Drivers:
            </div>
            <ul className="text-xs text-[#475569] space-y-1.5 list-disc pl-4">
              <li>
                <strong className="text-[#1e293b]">Drawing Technical Review Variance (34% weight)</strong> — DWG-2026-04 revisions
              </li>
              <li>
                <strong className="text-[#1e293b]">Component M-204 Vendor Lead Time (28% weight)</strong> — 36h buffer remaining
              </li>
              <li>
                <strong className="text-[#1e293b]">Press P-07 Mechanical Constraint (22% weight)</strong> — Vibration +18%
              </li>
              <li>
                <strong className="text-[#1e293b]">Cell 02 Operator Staffing Deficit (16% weight)</strong> — 1 technician shortage
              </li>
            </ul>
          </div>
        </div>

        {/* Methodology & Citation Card */}
        <div className="bg-white rounded-xl border border-[#e2eaf3] p-5 shadow-[0_2px_8px_rgba(12,26,45,0.04)] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-bold text-[#101e30] tracking-tight">
                Model Configuration & Scientific Validation
              </h2>
              <span className="px-2 py-0.5 rounded text-[11px] font-mono-numbers bg-[#f1f5f9] text-[#475569]">
                CPM + XGBoost
              </span>
            </div>

            <p className="text-xs text-[#475569] leading-relaxed mb-4">
              Sistem mengekstraksi struktur aktivitas proyek (WBS) dari berkas Excel/PDF jadwal kerja tidak baku, melakukan normalisasi tanggal terencana vs kapasitas aktual, dan menghitung probabilitas deviasi sebelum keterlambatan fisik terjadi.
            </p>
          </div>

          <div className="p-3.5 bg-[#eff6ff] border border-[#bfdbfe] rounded-xl text-xs text-[#1e40af] space-y-1">
            <div className="flex items-center gap-1.5 font-bold">
              <Info className="w-4 h-4 text-[#2563eb]" />
              <span>Penelitian Terverifikasi BINUS RTT:</span>
            </div>
            <p className="italic text-[#1d4ed8] text-[11px] leading-snug">
              &quot;Sistem Inteligensi Penjadwalan dan Pendukung Keputusan Berbasis AI untuk Mitigasi Risiko Keterlambatan pada Manufaktur Berbasis Proyek&quot;
            </p>
            <div className="text-[10px] text-[#3b82f6] font-semibold pt-1">
              — Dr. Ir. Indrajani, S.Kom., M.M.
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Gantt Timeline */}
      <GanttTimeline tasks={tasks} />

      {/* Extracted WBS Deviation Table */}
      <DeviationTable tasks={tasks} />
    </div>
  );
}
