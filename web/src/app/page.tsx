"use client";

import React, { useRef, useState } from "react";
import Link from "next/link";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollTrigger);
import { FileSpreadsheet, Loader2, Upload } from "lucide-react";
import { ManufacturingRole } from "@/types";
import { ROLES, ROLE_PRESETS } from "@/lib/mock-data";
import { inspectScheduleFile, ScheduleUploadError } from "@/lib/api";
import { Navbar } from "@/components/layout/Navbar";
import Dither from "@/components/landing/Dither";
import Threads from "@/components/landing/Threads";
import Topography from "@/components/landing/Topography";
import { Button, LinkButton } from "@/components/ui/Button";
import { MdipLogo } from "@/components/ui/MdipLogo";
import { FileDrop } from "@/components/ui/FileDrop";
import { Verdict, VerdictTone } from "@/components/ui/Verdict";
import { Stamp } from "@/components/ui/Stamp";

type InspectionRow = {
  code: string;
  task: string;
  planned: number;
  forecast: number;
  float: number | null;
  risk: number | null;
  /** Band from the server (HIGH / MEDIUM / LOW), set with the model's tuned cut-off. */
  level?: string;
  driver?: string;
  done?: boolean;
};

/** Illustrative rows for the sample project, shown until a real schedule is inspected. */
const SAMPLE_ROWS: InspectionRow[] = [
  { code: "WBS-1.1", task: "Raw ingot delivery and intake", planned: 4, forecast: 4, float: 0, risk: null, done: true },
  { code: "WBS-1.2", task: "CNC 5-axis rough machining", planned: 6, forecast: 8, float: 0, risk: 0.44, driver: "Forecast overrun vs. plan" },
  { code: "WBS-1.3", task: "Heat treatment and stress relieving", planned: 3, forecast: 3, float: 0, risk: 0.8, driver: "Upstream predecessor slippage" },
  { code: "WBS-1.4", task: "Final stamping and tooling FAT", planned: 5, forecast: 7, float: 0, risk: 0.8, driver: "Forecast overrun vs. plan" },
  { code: "WBS-1.5", task: "CMM quality inspection", planned: 2, forecast: 2, float: 0, risk: 0.34, driver: "Thin schedule float buffer" },
  { code: "WBS-1.6", task: "Packaging and logistics", planned: 1, forecast: 1, float: 0, risk: 0.33, driver: "Upstream predecessor slippage" },
];

const METHOD = [
  {
    title: "Ingest the schedule",
    body: "CSV or Excel exports with planned and forecast durations. Column names in English or Indonesian are recognised and normalised into WBS work packages.",
  },
  {
    title: "Trace the critical path",
    body: "A forward and backward pass computes start days, float and the critical path, and carries slip from late predecessors to the tasks that depend on them.",
  },
  {
    title: "Score and explain",
    body: "An XGBoost model scores each task's chance of finishing beyond its float and names the drivers behind it. 2,000 Monte Carlo runs turn task risk into project risk.",
  },
  {
    title: "Sign off",
    body: "Recommended actions cite the SOP clause they rely on. A named supervisor authorizes or overrides each one, and every decision lands in the audit log.",
  },
];

const PLANS = [
  {
    eyebrow: "30-Day Plant Pilot",
    title: "Guided Trial",
    summary: "For one active manufacturing line or tooling build.",
    features: [
      "Up to 5 WBS schedules inspected",
      "CPM + 2,000-run Monte Carlo forecast",
      "6 role-scoped cockpit views",
      "Supervisor sign-off & audit log",
    ],
    cta: "Start 30-day pilot",
    recommended: false,
  },
  {
    eyebrow: "Single Plant",
    title: "Plant License",
    summary: "Annual per-site license for continuous schedule control.",
    features: [
      "Unlimited WBS & CSV/Excel inspections",
      "Custom plant SOP knowledge base",
      "AI copilot with cited SOP clauses",
      "Role-based access & exportable audit trail",
    ],
    cta: "Create plant workspace",
    recommended: true,
  },
  {
    eyebrow: "Enterprise",
    title: "Custom Quote",
    summary: "Multi-plant operations with strict IT/OT governance.",
    features: [
      "Multi-site portfolio & executive rollups",
      "Dedicated deployment or VPC isolation",
      "SAP PS / Primavera P6 / MS Project sync",
      "SSO, custom retention & onboarding SLA",
    ],
    cta: "Request enterprise quote",
    recommended: false,
  },
] as const;

function RiskCell({ row, tone }: { row: InspectionRow; tone: VerdictTone }) {
  if (row.risk === null) {
    return <span className="text-xs text-ink-3">{row.done ? "Finished" : "Not scored"}</span>;
  }
  const pct = Math.round(row.risk * 100);
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-24 bg-sheet-sunk" aria-hidden="true">
        <div
          className={`h-full ${tone === "hold" ? "bg-hold" : tone === "warn" ? "bg-warn" : "bg-pass"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="font-mono-numbers text-xs text-ink">{pct}%</span>
    </div>
  );
}

function verdictFor(row: InspectionRow): { tone: VerdictTone; label: string } {
  if (row.done) return { tone: "neutral", label: "Complete" };
  if (row.risk === null) return { tone: "neutral", label: "Not scored" };
  if (row.level === "HIGH") return { tone: "hold", label: "Hold" };
  if (row.level === "MEDIUM") return { tone: "warn", label: "Watch" };
  if (row.level === "LOW") return { tone: "pass", label: "Pass" };
  if (row.risk >= 0.6) return { tone: "hold", label: "Hold" };
  if (row.risk >= 0.35) return { tone: "warn", label: "Watch" };
  return { tone: "pass", label: "Pass" };
}

export default function LandingPage() {
  const [rows, setRows] = useState<InspectionRow[]>(SAMPLE_ROWS);
  const [subject, setSubject] = useState("Sample project · precision stamping die set");
  const [isSample, setIsSample] = useState(true);
  const [summary, setSummary] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [stampKey, setStampKey] = useState(0);
  const [activeRole, setActiveRole] = useState<ManufacturingRole>("Operations Manager");
  const deskRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLElement>(null);
  const rolePanelRef = useRef<HTMLDivElement>(null);
  const role = ROLE_PRESETS[activeRole];

  useGSAP(
    () => {
      if (!deskRef.current) return;
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.fromTo(
          "[data-scribble-path]",
          { strokeDasharray: 1, strokeDashoffset: 1 },
          {
            strokeDashoffset: 0,
            ease: "none",
            stagger: 0.12,
            scrollTrigger: {
              trigger: deskRef.current,
              start: "top top",
              end: "bottom bottom",
              scrub: 0.6,
            },
          }
        );
        gsap.fromTo(
          "[data-scribble-label]",
          { opacity: 0, y: 4 },
          {
            opacity: 1,
            y: 0,
            ease: "none",
            stagger: 0.12,
            scrollTrigger: {
              trigger: deskRef.current,
              start: "top top",
              end: "bottom bottom",
              scrub: 0.6,
            },
          }
        );
      });
      return () => mm.revert();
    },
    { scope: deskRef }
  );

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.from("[data-hero-item]", {
          y: 12,
          opacity: 0,
          duration: 0.35,
          stagger: 0.06,
          ease: "power2.out",
          clearProps: "transform,opacity",
        });
      });
      return () => mm.revert();
    },
    { scope: heroRef }
  );

  useGSAP(
    () => {
      if (!rolePanelRef.current) return;
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.fromTo(
          rolePanelRef.current,
          { y: 6, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.22, ease: "power2.out", clearProps: "transform,opacity" }
        );
      });
      return () => mm.revert();
    },
    { dependencies: [activeRole] }
  );

  const inspect = async (blob: Blob, name: string) => {
    setBusy(true);
    setNotice(null);
    try {
      const result = await inspectScheduleFile(blob, name);
      if (!result) {
        setNotice("The inspection service is not reachable from this site, so the sample certificate stays in place.");
        return;
      }
      setRows(
        result.tasks.map((t) => ({
          code: t.code,
          task: t.task,
          planned: t.plannedDays,
          forecast: t.actualDays,
          float: typeof t.floatDays === "number" ? t.floatDays : null,
          risk: /complete|done|selesai/i.test(t.status) ? null : t.delayRisk,
          level: t.riskLevel,
          driver: t.drivers?.[0],
          done: /complete|done|selesai/i.test(t.status),
        }))
      );
      setSubject(name.replace(/\.(csv|xlsx|xls)$/i, ""));
      setIsSample(false);
      if (typeof result.overall_delay_probability === "number") {
        const p50 = result.estimated_project_slippage_days ?? 0;
        setSummary(
          `${result.overall_delay_probability.toFixed(1)}% chance the project misses its due date · median slip +${p50.toFixed(1)} days`
        );
      }
      setStampKey((k) => k + 1);
    } catch (err) {
      setNotice(err instanceof ScheduleUploadError ? err.message : `Could not inspect ${name}.`);
    } finally {
      setBusy(false);
    }
  };

  const useSample = async () => {
    const base = process.env.NEXT_PUBLIC_BASE_PATH || "";
    const res = await fetch(`${base}/sample_master_schedule_wbs.csv`);
    if (!res.ok) {
      setNotice("The sample schedule could not be loaded.");
      return;
    }
    await inspect(new Blob([await res.text()], { type: "text/csv" }), "sample_master_schedule_wbs.csv");
  };

  const hold = rows.filter((r) => verdictFor(r).tone === "hold").length;

  return (
    <div ref={deskRef} className="drafting-grid relative min-h-screen px-3 py-4 sm:px-6 sm:py-8 xl:py-12">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0 hidden select-none xl:block"
      >
        <svg
          viewBox="0 0 1920 1080"
          preserveAspectRatio="xMidYMid slice"
          className="h-full w-full"
        >
          {/* Left margin engineer scribbles */}
          <g fill="none" strokeLinecap="round" strokeLinejoin="round">
            <path
              data-scribble-path
              pathLength={1}
              d="M 54 140 L 184 140 M 54 132 L 54 148 M 184 132 L 184 148"
              stroke="var(--color-ink-3)"
              strokeWidth="1.4"
              opacity="0.32"
            />
            <path
              data-scribble-path
              pathLength={1}
              d="M 62 360 C 95 340, 130 385, 172 362 L 172 440 C 135 458, 92 430, 66 452 M 56 520 C 56 498, 186 498, 186 520 C 186 542, 56 542, 56 520 Z"
              stroke="var(--color-stamp)"
              strokeWidth="1.5"
              opacity="0.28"
            />
            <path
              data-scribble-path
              pathLength={1}
              d="M 90 710 Q 145 745 205 725 M 192 717 L 206 725 L 195 736"
              stroke="var(--color-stamp)"
              strokeWidth="1.5"
              opacity="0.3"
            />

            {/* Right margin engineer scribbles */}
            <path
              data-scribble-path
              pathLength={1}
              d="M 1765 170 A 22 22 0 1 0 1809 170 A 22 22 0 1 0 1765 170 M 1753 170 L 1821 170 M 1787 136 L 1787 204"
              stroke="var(--color-ink-3)"
              strokeWidth="1.4"
              opacity="0.3"
            />
            <path
              data-scribble-path
              pathLength={1}
              d="M 1715 510 L 1875 510 M 1720 508 C 1755 506, 1770 415, 1795 415 C 1820 415, 1835 506, 1870 508 M 1795 415 L 1795 514"
              stroke="var(--color-stamp)"
              strokeWidth="1.5"
              opacity="0.28"
            />
            <path
              data-scribble-path
              pathLength={1}
              d="M 1735 815 L 1762 842 L 1848 772 M 1725 862 C 1770 854, 1820 866, 1868 856"
              stroke="var(--color-stamp)"
              strokeWidth="1.6"
              opacity="0.3"
            />
          </g>

          <g fontFamily="var(--font-mono)" fontSize="11" letterSpacing="0.08em">
            <text data-scribble-label x="54" y="166" fill="var(--color-ink-3)" fillOpacity="0.45">
              ±0.02 MM · TOL
            </text>
            <text data-scribble-label x="66" y="524" fill="var(--color-stamp)" fillOpacity="0.42">
              FLOAT = 0d (HOLD)
            </text>
            <text data-scribble-label x="72" y="758" fill="var(--color-stamp)" fillOpacity="0.42">
              CPM SLIP +2.0d
            </text>

            <text data-scribble-label x="1720" y="226" fill="var(--color-ink-3)" fillOpacity="0.45">
              ⌖ Ø0.05 DATUM A
            </text>
            <text data-scribble-label x="1720" y="534" fill="var(--color-stamp)" fillOpacity="0.42">
              2,000 RUNS · P50 / P80
            </text>
            <text data-scribble-label x="1725" y="882" fill="var(--color-stamp)" fillOpacity="0.42">
              OK · REV C.2 VERIFIED
            </text>
          </g>
        </svg>
      </div>

      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-y-6 left-3 z-10 hidden w-7 select-none flex-col items-center justify-between border-x border-rule-strong bg-paper/90 py-4 font-mono text-[10px] tracking-[0.18em] text-ink-3 2xl:flex"
      >
        <span>A1</span>
        <span className="[writing-mode:vertical-rl] rotate-180 uppercase">
          DRAWING NO. MDIP-DR-0001 · ISO 9001 CL. 7.5 · SCALE 1:1
        </span>
        <span>A4</span>
      </div>
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-y-6 right-3 z-10 hidden w-7 select-none flex-col items-center justify-between border-x border-rule-strong bg-paper/90 py-4 font-mono text-[10px] tracking-[0.18em] text-ink-3 2xl:flex"
      >
        <span>B1</span>
        <span className="[writing-mode:vertical-rl] uppercase">
          REV C.2 · HELD-OUT ROC-AUC 0.78 · SHEET 01 OF 01
        </span>
        <span>B4</span>
      </div>
      <div className="cert-frame relative z-10 mx-auto max-w-[1440px] bg-sheet shadow-[0_24px_60px_-24px_rgb(20_24_28/0.18)]">
        <Navbar />

        {/* Subject and action */}
        <section ref={heroRef} className="relative isolate grid gap-8 overflow-hidden border-b border-rule-strong bg-paper px-5 py-10 sm:px-8 lg:grid-cols-12 lg:py-14">
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 motion-reduce:hidden">
            <Threads
              color="#2b3fbf"
              accentColor="#aab6ac"
              lineCount={90}
              thickness={0.6}
              softness={1.3}
              amplitude={1.7}
              distance={0.4}
              waves={1.05}
              speed={0.6}
              split={0.04}
              fray={0.5}
              angle={25}
              taper={0.85}
              brightness={1.35}
              parting={0}
              enableMouseInteraction={true}
              fade={0.18}
              opacity={0.34}
            />
          </div>
          <div data-hero-item className="lg:col-span-7">
            <p className="font-mono text-xs uppercase tracking-[0.08em] text-ink-3">
              Schedule Delay-Risk Inspection · B2B Manufacturing SaaS
            </p>
            <h1 className="mt-3 font-display text-[44px] font-extrabold uppercase leading-[0.95] tracking-[-0.01em] text-ink sm:text-[56px] lg:text-[60px] xl:text-[72px]">
              Know which tasks will slip before the work cell stalls
            </h1>
            <p className="mt-5 max-w-[34rem] text-base leading-relaxed text-ink-2">
              MDIP inspects a project schedule the way your plant inspects a steel bar: every task&apos;s forecast measured
              against its plan, a delay-risk verdict with the reasons behind it, and a named supervisor who signs off the fix.
            </p>
            <div className="mt-6 flex flex-wrap gap-2.5">
              <LinkButton href="/login?mode=register" size="lg">
                Start 30-day pilot
              </LinkButton>
              <LinkButton href="/dashboard" variant="secondary" size="lg">
                Open live cockpit
              </LinkButton>
            </div>
          </div>

          <div data-hero-item className="lg:col-span-5 lg:self-center">
            <FileDrop
              accept=".csv,.xlsx,.xls"
              maxBytes={2 * 1024 * 1024}
              disabled={busy}
              onFile={(file) => void inspect(file, file.name)}
              onReject={setNotice}
              className="border border-rule-strong bg-sheet p-5"
            >
              {(open) => (
                <>
                  <h2 className="font-display text-xl font-bold text-ink">Submit a schedule for inspection</h2>
                  <p className="mt-1 text-sm text-ink-2">
                    Drop a CSV or Excel file here, or choose one: tasks, planned days and, if you have them, forecast days and dependencies.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button size="lg" onClick={open} disabled={busy}>
                      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" strokeWidth={1.75} />}
                      {busy ? "Inspecting…" : "Choose schedule file"}
                    </Button>
                    <Button size="lg" variant="secondary" onClick={useSample} disabled={busy}>
                      <FileSpreadsheet className="h-4 w-4" strokeWidth={1.75} />
                      Use the sample schedule
                    </Button>
                  </div>
                  {notice && (
                    <p role="status" className="mt-3 border border-warn-line bg-warn-wash px-3 py-2 text-sm text-warn">
                      {notice}
                    </p>
                  )}
                </>
              )}
            </FileDrop>
          </div>
        </section>

        {/* Compatibility & plant governance strip */}
        <section
          aria-label="Supported exports and governance"
          className="grid gap-3 border-b border-rule-strong bg-sheet-sunk px-5 py-3.5 text-xs text-ink-2 sm:px-8 lg:grid-cols-2 lg:items-center"
        >
          <p>
            <span className="font-semibold text-ink">Schedule exports:</span>{" "}
            SAP PS · MS Project · Primavera P6 · Excel / CSV (English &amp; Indonesian headers)
          </p>
          <p className="lg:text-right">
            <span className="font-semibold text-ink">Plant controls:</span>{" "}
            Isolated workspace · Zero public model training · Full HITL audit trail
          </p>
        </section>

        {/* Inspection table */}
        <section aria-labelledby="inspection-title" className="px-5 pb-8 pt-7 sm:px-8">
          <div>
            <h2 id="inspection-title" className="w-fit font-display text-2xl font-bold text-ink">
              Inspection results
            </h2>
            <p className="mt-1 w-fit max-w-[calc(100%-140px)] text-sm text-ink-2">
              Item inspected: <span className="font-medium text-ink">{subject}</span>
              {isSample && <span className="ml-2 text-ink-3">(illustrative sample data)</span>}
            </p>
          </div>

          <div className="relative mt-5">
            <Stamp
              key={stampKey}
              top="Validated on real data"
              center="AUC 0.78"
              bottom="51 held-out projects"
              size={100}
              className="absolute -top-[84px] right-1.5 z-20 hidden xl:block"
            />

            {/* Desktop and tablet: the ruled inspection table */}
            <div className="relative hidden overflow-x-auto border border-rule-strong md:block">
              <table className="w-full min-w-[820px] border-collapse text-sm">
                <thead>
                  <tr className="bg-paper text-left text-xs text-ink-2">
                    <th scope="col" className="border-b border-rule-strong px-3 py-2.5 font-medium">WBS</th>
                    <th scope="col" className="border-b border-rule-strong px-3 py-2.5 font-medium">Task</th>
                    <th scope="col" className="border-b border-rule-strong px-3 py-2.5 text-right font-medium">Planned (d)</th>
                    <th scope="col" className="border-b border-rule-strong px-3 py-2.5 text-right font-medium">Forecast (d)</th>
                    <th scope="col" className="border-b border-rule-strong px-3 py-2.5 text-right font-medium">Float (d)</th>
                    <th scope="col" className="border-b border-rule-strong px-3 py-2.5 font-medium">Delay risk</th>
                    <th scope="col" className="border-b border-rule-strong px-3 py-2.5 font-medium">Main driver</th>
                    <th scope="col" className="border-b border-rule-strong px-3 py-2.5 font-medium xl:pr-28">Verdict</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => {
                    const v = verdictFor(r);
                    const over = r.forecast > r.planned;
                    return (
                      <tr key={r.code} className="border-b border-rule last:border-b-0">
                        <td className="whitespace-nowrap px-3 py-2.5 font-mono-numbers text-xs text-ink-2">{r.code}</td>
                        <td className="px-3 py-2.5 text-ink">{r.task}</td>
                        <td className="px-3 py-2.5 text-right font-mono-numbers text-ink">{r.planned}</td>
                        <td className={`px-3 py-2.5 text-right font-mono-numbers ${over ? "font-semibold text-hold" : "text-ink"}`}>
                          {r.forecast}
                          {over && <span className="sr-only"> (over plan)</span>}
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono-numbers text-ink">
                          {r.float === null ? <span className="text-ink-3">n/a</span> : r.float}
                        </td>
                        <td className="px-3 py-2.5">
                          <RiskCell row={r} tone={v.tone} />
                        </td>
                        <td className="px-3 py-2.5 text-xs text-ink-2">
                          {r.driver ?? <span className="text-ink-3">{r.done ? "—" : "None reported"}</span>}
                        </td>
                        <td className="px-3 py-2.5">
                          <Verdict tone={v.tone}>{v.label}</Verdict>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Phones: one stacked record per task, verdict always visible */}
            <ol className="divide-y divide-rule border border-rule-strong md:hidden">
              {rows.map((r) => {
                const v = verdictFor(r);
                const over = r.forecast > r.planned;
                return (
                  <li key={r.code} className="px-4 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-mono-numbers text-xs text-ink-2">{r.code}</p>
                        <p className="text-sm font-medium text-ink">{r.task}</p>
                      </div>
                      <Verdict tone={v.tone}>{v.label}</Verdict>
                    </div>
                    <p className="mt-1.5 text-xs text-ink-2">
                      Planned <span className="font-mono-numbers text-ink">{r.planned} d</span> · Forecast{" "}
                      <span className={`font-mono-numbers ${over ? "font-semibold text-hold" : "text-ink"}`}>{r.forecast} d</span>
                      {r.float !== null && (
                        <>
                          {" "}· Float <span className="font-mono-numbers text-ink">{r.float} d</span>
                        </>
                      )}
                    </p>
                    <div className="mt-2">
                      <RiskCell row={r} tone={v.tone} />
                    </div>
                    {r.driver && <p className="mt-1 text-xs text-ink-2">Main driver: {r.driver}</p>}
                  </li>
                );
              })}
            </ol>
          </div>

          <div className="mt-5 grid gap-5 border-t border-rule pt-5 md:grid-cols-12">
            <div className="md:col-span-8">
              <h3 className="text-sm font-semibold text-ink">Remarks</h3>
              <p className="mt-1 max-w-[36rem] text-sm leading-relaxed text-ink-2">
                {summary ? `${summary}. ` : `${hold} of ${rows.length} tasks are on hold. `}
                Delay risk is the probability a task finishes later than its float allows. Verdicts are recommendations:
                every action they trigger is authorized or overridden by a named supervisor and logged.
              </p>
            </div>
            <div className="md:col-span-4">
              <div className="h-12 border-b border-ink" />
              <p className="mt-1 text-xs text-ink-3">Authorized by the responsible supervisor (name, role, date)</p>
              <Stamp
                key={`m-${stampKey}`}
                top="Validated on real data"
                center="AUC 0.78"
                bottom="51 held-out projects"
                size={116}
                className="mt-3 xl:hidden"
              />
            </div>
          </div>
        </section>

        {/* Method: one axis, four stations */}
        <section id="method" aria-labelledby="method-title" className="relative isolate overflow-hidden border-t border-rule-strong bg-paper px-5 py-12 sm:px-8">
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 opacity-60 motion-reduce:hidden">
            <Dither backgroundColor="#f3f5f1" waveColor="#c9d5cb" pixelSize={2} waveSpeed={0.04} dpr={1} />
          </div>
          <h2 id="method-title" className="font-display text-[34px] font-bold leading-tight text-ink">
            How a verdict is reached
          </h2>
          <p className="mt-2 max-w-[34rem] text-sm leading-relaxed text-ink-2">
            Trained on 4,149 real planned-versus-actual tasks from 251 public projects plus synthetic schedules.
            On 51 held-out real projects, MDIP ranks late tasks at ROC-AUC 0.78 versus 0.53 for rule-based scoring, tuned for early-warning coverage before downstream work cells stall.
          </p>
          <ol className="relative mt-10 grid gap-8 md:grid-cols-4 md:gap-6">
            {METHOD.map((step, index) => (
              <li key={step.title} className="relative pl-12 before:absolute before:bottom-[-2rem] before:left-4 before:top-4 before:border-l before:border-rule-strong last:before:hidden md:pl-0 md:before:bottom-auto md:before:left-4 md:before:right-[-1.5rem] md:before:border-l-0 md:before:border-t">
                <span aria-hidden="true" className="absolute left-0 top-0 grid size-8 place-items-center border border-ink bg-ink font-mono text-sm font-bold text-white md:relative">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <h3 className="min-h-8 content-center font-display text-xl font-bold text-ink md:mt-4">{step.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-2">{step.body}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* Roles */}
        <section id="roles" aria-labelledby="roles-title" className="border-t border-rule-strong px-5 py-12 sm:px-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 id="roles-title" className="font-display text-[34px] font-bold leading-tight text-ink">
                One certificate, six readers
              </h2>
              <p className="mt-2 max-w-[32rem] text-sm leading-relaxed text-ink-2">
                Each role opens the same project and sees the measurements it is accountable for.
              </p>
            </div>
            <LinkButton href="/login?mode=register" size="lg">
              Sign up as {activeRole}
            </LinkButton>
          </div>

          <div role="tablist" aria-label="Roles" className="mt-6 grid grid-cols-2 border-b border-rule-strong sm:flex sm:flex-wrap">
            {ROLES.map((r) => (
              <button
                key={r}
                role="tab"
                type="button"
                aria-selected={activeRole === r}
                onClick={() => setActiveRole(r)}
                className={`-mb-px cursor-pointer border-b-2 px-3 py-2.5 text-left text-sm font-medium transition-colors sm:px-4 ${
                  activeRole === r ? "border-stamp text-ink" : "border-transparent text-ink-2 hover:text-ink"
                }`}
              >
                {r}
              </button>
            ))}
          </div>

          <div ref={rolePanelRef} role="tabpanel" className="mt-6 grid gap-6 md:grid-cols-12 md:items-center">
            <div className="md:col-span-5">
              <h3 className="font-display text-2xl font-bold text-ink">{role.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-2">{role.sub}</p>
            </div>
            <div className="md:col-span-7">
              <p className="text-sm font-medium text-ink">Measurements on this role&apos;s certificate</p>
              <ul className="mt-2 divide-y divide-rule border-y border-rule">
                {role.kpis.map((k) => (
                  <li key={k.title} className="flex items-baseline justify-between gap-4 py-2.5 text-sm">
                    <span className="text-ink">{k.title}</span>
                    <span className="text-right text-xs text-ink-3">{k.subtle}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* Plans & Footer unified topographic backdrop */}
        <div className="relative isolate overflow-hidden border-t border-rule-strong bg-paper">
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0 motion-reduce:hidden">
            <Topography
              color="#2b3fbf"
              lightMode={true}
              lineCount={22}
              lineWidth={1.3}
              elevation={1.15}
              foreground={0.2}
              tilt={38}
              speed={0.25}
              direction="forward"
              glow={0}
              depthOfField={0}
              fog={0.3}
              hoverEffect="lift"
              clickEffect="none"
              majorLines={true}
              brightness={1.35}
              opacity={0.5}
              dpr={1}
            />
            <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-sheet to-transparent" />
          </div>

          {/* Plans & Pilot */}
          <section id="plans" aria-labelledby="plans-title" className="relative z-10 px-5 py-12 sm:px-8">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <h2 id="plans-title" className="font-display text-[34px] font-bold leading-tight text-ink">
                  Pilot &amp; plant plans
                </h2>
                <p className="mt-2 max-w-[34rem] text-sm leading-relaxed text-ink-2">
                  Validate MDIP on one active tooling or production schedule before rolling out across your facility.
                </p>
              </div>
              <p className="font-mono text-xs text-ink-3">Form MDIP-PL-03 · Cloud or VPC isolation</p>
            </div>

            <div className="mt-8 grid border border-rule-strong bg-sheet/80 backdrop-blur-[1px] divide-y divide-rule-strong md:grid-cols-3 md:divide-x md:divide-y-0">
              {PLANS.map((plan) => (
                <article
                  key={plan.eyebrow}
                  className={`flex flex-col justify-between p-6 ${
                    plan.recommended ? "bg-paper/80 border-t-2 border-t-stamp" : ""
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <p className={`font-mono text-xs uppercase tracking-[0.06em] ${plan.recommended ? "text-stamp" : "text-ink-3"}`}>
                        {plan.eyebrow}
                      </p>
                      {plan.recommended && <Verdict tone="info">Recommended</Verdict>}
                    </div>
                    <h3 className="mt-2 font-display text-2xl font-bold text-ink">{plan.title}</h3>
                    <p className="mt-1.5 text-sm text-ink-2">{plan.summary}</p>
                    <ul className="mt-5 divide-y divide-rule border-y border-rule text-sm text-ink-2 [&>li]:py-2.5">
                      {plan.features.map((feat) => (
                        <li key={feat}>{feat}</li>
                      ))}
                    </ul>
                  </div>
                  <LinkButton
                    href="/login?mode=register"
                    variant={plan.recommended ? "primary" : "secondary"}
                    size="md"
                    className="mt-6 w-full justify-center"
                  >
                    {plan.cta}
                  </LinkButton>
                </article>
              ))}
            </div>
          </section>

          <footer className="relative z-10 border-t border-rule-strong">
            <div
              className="guilloche border-b border-rule-strong px-5 py-4 sm:px-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
              style={{ backgroundColor: "rgb(251 252 250 / 0.72)" }}
            >
            <div className="flex items-center gap-2.5">
              <MdipLogo variant="color" size={26} />
              <div>
                <p className="font-display text-base font-bold text-ink leading-none">
                  MDIP · Certificate of Schedule Inspection
                </p>
                <p className="mt-0.5 font-mono text-[11px] text-ink-3">
                  Form MDIP-DR-0001 · Manufacturing Decision Intelligence Platform
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <LinkButton href="/login?mode=register" size="md">
                Start 30-day pilot
              </LinkButton>
              <LinkButton href="/dashboard" variant="secondary" size="md">
                Open live cockpit
              </LinkButton>
            </div>
          </div>

          <div className="relative z-10 grid grid-cols-1 border-b border-rule sm:grid-cols-2 lg:grid-cols-4 text-xs [&>*]:border-rule [&>*:not(:last-child)]:border-b sm:[&>*:nth-child(odd)]:border-r sm:[&>*:nth-child(n+3)]:border-b-0 lg:[&>*]:border-b-0 lg:[&>*:not(:last-child)]:border-r">
            <div className="bg-paper/45 p-5 sm:px-8 space-y-2">
              <p className="font-mono uppercase tracking-[0.06em] text-ink-3">Platform</p>
              <ul className="space-y-1 text-ink-2 [&_a]:inline-block [&_a]:py-0.5">
                <li><a href="#inspection-title" className="hover:text-ink hover:underline">Schedule Inspector</a></li>
                <li><Link href="/dashboard" className="hover:text-ink hover:underline">Operations Cockpit</Link></li>
                <li><Link href="/dashboard/scheduler" className="hover:text-ink hover:underline">Critical-Path Scheduler</Link></li>
                <li><Link href="/dashboard/iroom" className="hover:text-ink hover:underline">IRoom Streams</Link></li>
              </ul>
            </div>

            <div className="bg-paper/45 p-5 sm:px-8 space-y-2">
              <p className="font-mono uppercase tracking-[0.06em] text-ink-3">Intelligence &amp; Governance</p>
              <ul className="space-y-1 text-ink-2 [&_a]:inline-block [&_a]:py-0.5">
                <li><Link href="/dashboard/copilot" className="hover:text-ink hover:underline">Cited SOP Copilot</Link></li>
                <li><Link href="/dashboard/knowledge" className="hover:text-ink hover:underline">Plant Knowledge Base</Link></li>
                <li><a href="#method" className="hover:text-ink hover:underline">Method &amp; Validation</a></li>
                <li><a href="#roles" className="hover:text-ink hover:underline">Role Certificates</a></li>
              </ul>
            </div>

            <div className="bg-paper/45 p-5 sm:px-8 space-y-2">
              <p className="font-mono uppercase tracking-[0.06em] text-ink-3">Standards &amp; Exports</p>
              <ul className="space-y-1.5 text-ink-2">
                <li>ISO 9001 Cl. 7.5 Audit Trail</li>
                <li>ROC-AUC 0.78 (51 Held-Out Projects)</li>
                <li>SAP PS · Primavera P6 · MS Project</li>
                <li>CSV / Excel Headers (EN &amp; ID)</li>
              </ul>
            </div>

            <div className="bg-paper/45 p-5 sm:px-8 space-y-2">
              <p className="font-mono uppercase tracking-[0.06em] text-ink-3">Access &amp; Deployment</p>
              <ul className="space-y-1 text-ink-2 [&_a]:inline-block [&_a]:py-0.5">
                <li><a href="#plans" className="hover:text-ink hover:underline">Pilot &amp; Plant Plans</a></li>
                <li><Link href="/login" className="hover:text-ink hover:underline">Operator Sign In</Link></li>
                <li><Link href="/login?mode=register" className="hover:text-ink hover:underline">Create Plant Account</Link></li>
                <li className="py-0.5">Cloud SaaS &amp; On-Premises VPC</li>
              </ul>
            </div>
          </div>

          <div className="relative z-10 bg-paper/55 px-5 py-3.5 sm:px-8 flex flex-col items-center justify-between gap-2 text-center sm:text-left text-xs text-ink-3 sm:flex-row">
            <span>MDIP · Manufacturing Decision Intelligence Platform</span>
            <span className="font-mono-numbers">
              XGBoost + 2,000-run Monte Carlo · Human-in-the-loop sign-off required
            </span>
          </div>
        </footer>
        </div>
      </div>
    </div>
  );
}
