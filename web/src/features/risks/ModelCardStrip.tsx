"use client";

import React from "react";
import { MlModelCard } from "@/lib/api";

interface ModelCardStripProps {
  card: MlModelCard;
  compact?: boolean;
}

function fmtAuc(v: number | null | undefined): string {
  return typeof v === "number" ? v.toFixed(2) : "n/a";
}

export const ModelCardStrip: React.FC<ModelCardStripProps> = ({ card, compact = false }) => {
  const real = card.real_validation_metrics;
  const dslib = real?.by_source?.dslib;
  const cnc = real?.by_source?.cnc;

  const stats = [
    {
      label: "Real Held-Out AUC",
      value: fmtAuc(real?.roc_auc ?? card.synthetic_test_metrics.roc_auc),
      meta: `vs ${fmtAuc(real?.baseline_rule_roc_auc ?? card.synthetic_test_metrics.baseline_rule_roc_auc)} rule`,
    },
    {
      label: "DSLIB DAGs",
      value: fmtAuc(dslib?.roc_auc),
      meta: `${dslib?.n_projects ?? 15} held-out projects`,
    },
    {
      label: "4TU CNC Orders",
      value: fmtAuc(cnc?.roc_auc),
      meta: `${cnc?.n_projects ?? 36} held-out orders`,
    },
    {
      label: "Slip MAE",
      value: `${(real?.slip_mae_days ?? card.synthetic_test_metrics.slip_mae_days).toFixed(2)}d`,
      meta: "XGBoost hurdle",
    },
    {
      label: "Real Corpus",
      value: card.n_real_tasks.toLocaleString(),
      meta: `${card.n_projects.toLocaleString()} total projects`,
    },
  ];

  return (
    <div className="bg-white rounded-xl border border-[#e5e7eb] px-5 py-4">
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#f1f5f9]">
        <div className="flex items-center gap-2 text-xs font-medium text-[#111827]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#16a34a]" />
          <span>XGBoost Hurdle Validation Readout</span>
        </div>
        <span className="text-xs font-mono-numbers text-[#64748b]">
          {real ? `${(real.n_tasks ?? 0).toLocaleString()} held-out real tasks` : "Synthetic baseline"}
        </span>
      </div>

      <div className={`grid grid-cols-2 ${compact ? "sm:grid-cols-5" : "sm:grid-cols-3 lg:grid-cols-5"} gap-4 pt-3`}>
        {stats.map((item) => (
          <div key={item.label} className="min-w-0">
            <div className="text-xs text-[#64748b] truncate">{item.label}</div>
            <div className="text-lg font-medium text-[#111827] font-mono-numbers mt-0.5">
              {item.value}
            </div>
            <div className="text-xs font-mono-numbers text-[#64748b] truncate">
              {item.meta}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
