import React from "react";

export type VerdictTone = "pass" | "hold" | "warn" | "info" | "neutral";

const TONE: Record<VerdictTone, string> = {
  pass: "text-pass bg-pass-wash border-pass-line",
  hold: "text-hold bg-hold-wash border-hold-line",
  warn: "text-warn bg-warn-wash border-warn-line",
  info: "text-stamp bg-stamp-wash border-stamp-line",
  neutral: "text-ink-2 bg-sheet-sunk border-rule",
};

/** A certificate verdict mark: condensed caps in a ruled box. Status, category and result labels all use it. */
export function Verdict({
  tone = "neutral",
  children,
  className = "",
}: {
  tone?: VerdictTone;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-sm border px-1.5 py-px font-display text-[12px] font-semibold uppercase tracking-[0.04em] leading-[18px] ${TONE[tone]} ${className}`}
    >
      {children}
    </span>
  );
}
