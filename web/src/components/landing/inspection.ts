import type { VerdictTone } from "@/components/ui/Verdict";

export type InspectionRow = {
  code: string;
  task: string;
  /** Day the task starts on the critical-path schedule. */
  start: number;
  planned: number;
  forecast: number;
  float: number | null;
  critical?: boolean;
  risk: number | null;
  /** Band from the server (HIGH / MEDIUM / LOW), set with the model's tuned cut-off. */
  level?: string;
  /** Model's risk drivers, most influential first. */
  drivers?: string[];
  workCenter?: string;
  /** Days this task's start was pushed by late predecessors; known for the sample chain only. */
  upstreamSlip?: number;
  /** Sample SOP clause Copilot would cite for this task (codes from the sample knowledge base). */
  sop?: { code: string; clause: string };
  done?: boolean;
};

export type Decision = "authorized" | "overridden";

/** Illustrative rows for the sample project, shown until a real schedule is inspected. One chain, so every task is critical. */
export const SAMPLE_ROWS: InspectionRow[] = [
  { code: "WBS-1.1", task: "Raw ingot delivery and intake", start: 0, planned: 4, forecast: 4, float: 0, critical: true, risk: null, done: true, workCenter: "Receiving dock" },
  {
    code: "WBS-1.2", task: "CNC 5-axis rough machining", start: 4, planned: 6, forecast: 8, float: 0, critical: true, risk: 0.44, workCenter: "MILL-CELL-01", sop: { code: "SOP-LINE2-OPT", clause: "Clause 1.4: Throughput Variance Trigger" },
    drivers: ["Forecast overrun vs. plan", "No float on the critical path", "Long single-machine duration"],
  },
  {
    code: "WBS-1.3", task: "Heat treatment and stress relieving", start: 12, planned: 3, forecast: 3, float: 0, critical: true, risk: 0.8, upstreamSlip: 2, workCenter: "FURNACE-02", sop: { code: "SOP-SCM-12", clause: "Clause 5.3: Commercial Penalty Protection" },
    drivers: ["Upstream predecessor slippage", "No float on the critical path", "Fixed furnace batch window"],
  },
  {
    code: "WBS-1.4", task: "Final stamping and tooling FAT", start: 15, planned: 5, forecast: 7, float: 0, critical: true, risk: 0.8, upstreamSlip: 2, workCenter: "PRESS-P07", sop: { code: "SOP-PRS-04", clause: "Clause 4.1: Die Alignment & Changeover Tolerances" },
    drivers: ["Forecast overrun vs. plan", "Upstream predecessor slippage", "No float on the critical path"],
  },
  {
    code: "WBS-1.5", task: "CMM quality inspection", start: 22, planned: 2, forecast: 2, float: 0, critical: true, risk: 0.34, upstreamSlip: 4, workCenter: "CMM-LAB", sop: { code: "SOP-ENG-02", clause: "Clause 3.1: Tolerancing Verification" },
    drivers: ["Thin schedule float buffer", "Upstream predecessor slippage"],
  },
  {
    code: "WBS-1.6", task: "Packaging and logistics", start: 24, planned: 1, forecast: 1, float: 0, critical: true, risk: 0.33, upstreamSlip: 4, workCenter: "Shipping",
    drivers: ["Upstream predecessor slippage", "Thin schedule float buffer"],
  },
];

export function verdictFor(row: InspectionRow): { tone: VerdictTone; label: string } {
  if (row.done) return { tone: "neutral", label: "Complete" };
  if (row.risk === null) return { tone: "neutral", label: "Not scored" };
  if (row.level === "HIGH") return { tone: "hold", label: "Hold" };
  if (row.level === "MEDIUM") return { tone: "warn", label: "Watch" };
  if (row.level === "LOW") return { tone: "pass", label: "Pass" };
  if (row.risk >= 0.6) return { tone: "hold", label: "Hold" };
  if (row.risk >= 0.35) return { tone: "warn", label: "Watch" };
  return { tone: "pass", label: "Pass" };
}

export const TONE_BAR: Record<VerdictTone, string> = {
  hold: "bg-hold",
  warn: "bg-warn",
  pass: "bg-pass",
  info: "bg-stamp",
  neutral: "bg-ink-3",
};
