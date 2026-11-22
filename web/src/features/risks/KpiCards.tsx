"use client";

import React, { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { KpiItem } from "@/types";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import { useT } from "@/lib/i18n";

interface KpiCardsProps {
  kpis: KpiItem[];
}

const TONE = {
  alert: { dot: "bg-hold", text: "text-hold", label: "Out of tolerance" },
  warn: { dot: "bg-warn", text: "text-warn", label: "Near tolerance" },
  normal: { dot: "bg-pass", text: "text-pass", label: "Within tolerance" },
} as const;

/** Role KPIs as certificate measurement fields: one ruled grid, value, then deviation and context. */
export const KpiCards: React.FC<KpiCardsProps> = ({ kpis }) => {
  const gridRef = useRef<HTMLDListElement>(null);
  const t = useT();

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.from("[data-kpi-card]", {
          y: 8,
          opacity: 0,
          duration: 0.28,
          stagger: 0.05,
          ease: "power2.out",
          clearProps: "transform,opacity",
        });
      });
      return () => mm.revert();
    },
    { scope: gridRef, dependencies: [kpis] }
  );

  return (
    <dl ref={gridRef} className="grid grid-cols-1 border-l border-t border-rule-strong bg-sheet sm:grid-cols-2 xl:grid-cols-4">
      {kpis.map((kpi, idx) => {
        const tone = TONE[kpi.status] ?? TONE.normal;
        const isUp = kpi.trend.includes("↑");
        const isDown = kpi.trend.includes("↓");
        return (
          <div key={`${kpi.title}-${idx}`} data-kpi-card className="border-b border-r border-rule-strong px-5 py-4">
          <dt className="flex items-start justify-between gap-3 text-xs text-ink-2">
            <span>{t(kpi.title)}</span>
            <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${tone.dot}`} title={t(tone.label)} aria-label={t(tone.label)} />
          </dt>
          <dd className="mt-2 font-mono-numbers text-[30px] font-medium leading-none tracking-tight text-ink">{kpi.value}</dd>
          <dd className="mt-2.5 text-xs leading-snug">
            <span className={`inline-flex items-center gap-0.5 font-medium ${tone.text}`}>
              {isUp && <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={1.6} />}
              {isDown && <ArrowDownRight className="h-3.5 w-3.5" strokeWidth={1.6} />}
              {t(kpi.trend).replace(/^[↑↓]\s*/, "")}
            </span>
            {kpi.subtle && <span className="text-ink-3"> · {t(kpi.subtle)}</span>}
          </dd>
        </div>
      );
    })}
    </dl>
  );
};
