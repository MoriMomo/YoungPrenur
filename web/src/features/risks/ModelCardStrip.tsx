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

function fmtPct(v: number | null | undefined): string {
  return typeof v === "number" ? `${Math.round(v * 100)}%` : "n/a";
}

/**
 * The model's validation, led by the one claim the product makes publicly
 * (ROC-AUC on held-out real projects vs rule-based scoring), with the breakdown beneath.
 */
export const ModelCardStrip: React.FC<ModelCardStripProps> = ({ card }) => {
  const real = card.real_validation_metrics;
  const dslib = real?.by_source?.dslib;
  const cnc = real?.by_source?.cnc;
  const auc = real?.roc_auc ?? card.synthetic_test_metrics.roc_auc;
  const baseline = real?.baseline_rule_roc_auc ?? card.synthetic_test_metrics.baseline_rule_roc_auc;
  const projects = real?.n_projects ?? (dslib?.n_projects ?? 0) + (cnc?.n_projects ?? 0);

  const breakdown = [
    { label: "Project schedules (DSLIB)", value: fmtAuc(dslib?.roc_auc), meta: `${dslib?.n_projects ?? 15} projects` },
    { label: "CNC production orders (4TU)", value: fmtAuc(cnc?.roc_auc), meta: `${cnc?.n_projects ?? 36} orders` },
    {
      label: "Late tasks caught",
      value: fmtPct(real?.recall),
      meta: `${fmtPct(real?.precision)} of flags right · cut-off ${(real?.threshold ?? card.decision_threshold ?? 0.5).toFixed(2)}`,
    },
    {
      label: "Average slip error",
      value: `${(real?.slip_mae_days ?? card.synthetic_test_metrics.slip_mae_days).toFixed(2)} d`,
      meta: "on late tasks",
    },
  ];

  return (
    <section aria-label="Model validation" className="border border-rule-strong bg-sheet">
      <div className="border-b border-rule-strong px-5 py-4">
        <p className="text-xs text-ink-2">{real ? "Validated on held-out real projects" : "Validated on synthetic test data"}</p>
        <p className="mt-1.5 whitespace-nowrap font-mono-numbers text-[30px] font-medium leading-none text-ink">
          {fmtAuc(auc)} <span className="text-sm text-ink-2">ROC-AUC</span>
        </p>
        <p className="mt-2 text-xs text-ink-2">
          {real ? `${projects} real projects the model never saw` : "Synthetic test split"} · rule-based scoring:{" "}
          <span className="whitespace-nowrap font-mono-numbers text-ink">{fmtAuc(baseline)}</span>
        </p>
      </div>
      <dl className="grid grid-cols-2">
        {breakdown.map((item, idx) => (
          <div
            key={item.label}
            className={`px-4 py-4 ${idx < 2 ? "border-b border-rule" : ""} ${idx % 2 === 0 ? "border-r border-rule" : ""}`}
          >
            <dt className="text-xs text-ink-2">{item.label}</dt>
            <dd className="mt-1 whitespace-nowrap font-mono-numbers text-lg font-medium text-ink">{item.value}</dd>
            <dd className="text-xs text-ink-3">{item.meta}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
};
