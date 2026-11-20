"use client";

import React, { useRef, useState } from "react";
import { FileSpreadsheet, Loader2, Upload } from "lucide-react";
import { ManufacturingRole } from "@/types";
import { ROLES, ROLE_PRESETS } from "@/lib/mock-data";
import { uploadScheduleFile, ScheduleUploadError } from "@/lib/api";
import { Navbar } from "@/components/layout/Navbar";
import { Button, LinkButton } from "@/components/ui/Button";
import { Verdict, VerdictTone } from "@/components/ui/Verdict";
import { Stamp } from "@/components/ui/Stamp";
import { usePageMotion } from "@/lib/usePageMotion";

type InspectionRow = {
  code: string;
  task: string;
  planned: number;
  forecast: number;
  float: number | null;
  risk: number | null;
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
  const fileRef = useRef<HTMLInputElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);
  const rolePanelRef = useRef<HTMLDivElement>(null);
  const role = ROLE_PRESETS[activeRole];

  usePageMotion(pageRef, { scroll: true });
  usePageMotion(rolePanelRef, {
    triggerKey: activeRole,
    selector: '[data-gsap="role-panel"]',
    y: 6,
    skipInitial: true,
  });

  const inspect = async (blob: Blob, name: string) => {
    setBusy(true);
    setNotice(null);
    try {
      const result = await uploadScheduleFile(blob, name);
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
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void inspect(file, file.name);
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
    <div ref={pageRef} className="min-h-screen bg-paper px-3 py-4 sm:px-6 sm:py-8">
      <div className="cert-frame mx-auto max-w-[1240px] bg-sheet">
        <Navbar />

        {/* Subject and action */}
        <section className="grid gap-8 border-b border-rule-strong px-5 py-10 sm:px-8 lg:grid-cols-12 lg:py-14">
          <div data-gsap="reveal" className="lg:col-span-7">
            <h1 className="font-display text-[44px] font-extrabold uppercase leading-[0.95] tracking-[-0.01em] text-ink sm:text-[56px] lg:text-[60px] xl:text-[76px]">
              Know which tasks will slip before the work cell stalls
            </h1>
            <p className="mt-5 max-w-[34rem] text-base leading-relaxed text-ink-2">
              MDIP inspects a project schedule the way your plant inspects a steel bar: every task&apos;s forecast measured
              against its plan, a delay-risk verdict with the reasons behind it, and a named supervisor who signs off the fix.
            </p>
          </div>

          <div data-gsap="reveal" className="lg:col-span-5 lg:self-end">
            <div className="border border-rule-strong bg-paper p-5">
              <label htmlFor="schedule-file" className="font-display text-xl font-bold text-ink">
                Submit a schedule for inspection
              </label>
              <p className="mt-1 text-sm text-ink-2">CSV or Excel with tasks, planned days and, if you have them, forecast days and dependencies.</p>
              <input
                id="schedule-file"
                ref={fileRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={onFile}
                className="sr-only"
              />
              <div className="mt-4 flex flex-wrap gap-2">
                <Button size="lg" onClick={() => fileRef.current?.click()} disabled={busy}>
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
            </div>
          </div>
        </section>

        {/* Inspection table */}
        <section aria-labelledby="inspection-title" className="px-5 pb-8 pt-7 sm:px-8">
          <div data-gsap="reveal">
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
            <div data-gsap="reveal" className="relative hidden overflow-x-auto border border-rule-strong md:block">
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
                          {r.driver ?? <span className="text-ink-3">{r.done ? "Finished" : "None reported"}</span>}
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
            <ol data-gsap="reveal" className="divide-y divide-rule border border-rule-strong md:hidden">
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
            <div data-gsap="reveal" className="md:col-span-8">
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
        <section id="method" data-gsap="scroll" aria-labelledby="method-title" className="border-t border-rule-strong bg-paper px-5 py-12 sm:px-8">
          <h2 id="method-title" className="font-display text-[34px] font-bold leading-tight text-ink">
            How a verdict is reached
          </h2>
          <p className="mt-2 max-w-[32rem] text-sm leading-relaxed text-ink-2">
            The model was trained on 4,149 real planned-versus-actual tasks from 251 public projects plus synthetic schedules.
            On 51 real projects it never saw, it ranks late tasks with a ROC-AUC of 0.78, against 0.53 for rule-based scoring.
          </p>
          <div className="relative mt-10">
          <div aria-hidden="true" className="absolute left-0 right-0 top-[7px] hidden h-px bg-ink md:block" />
          <ol className="relative grid gap-8 md:grid-cols-4 md:gap-6">
            {METHOD.map((step) => (
              <li key={step.title} data-gsap="scroll-item" className="relative">
                <span aria-hidden="true" className="relative z-10 block h-[15px] w-[15px] border-2 border-ink bg-sheet" />
                <h3 className="mt-4 font-display text-xl font-bold text-ink">{step.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-2">{step.body}</p>
              </li>
            ))}
          </ol>
          </div>
        </section>

        {/* Roles */}
        <section id="roles" data-gsap="scroll" aria-labelledby="roles-title" className="border-t border-rule-strong px-5 py-12 sm:px-8">
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

          <div role="tablist" aria-label="Roles" className="mt-6 flex flex-wrap gap-0 border-b border-rule-strong">
            {ROLES.map((r) => (
              <button
                key={r}
                role="tab"
                type="button"
                aria-selected={activeRole === r}
                onClick={() => setActiveRole(r)}
                className={`-mb-px cursor-pointer border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                  activeRole === r ? "border-stamp text-ink" : "border-transparent text-ink-2 hover:text-ink"
                }`}
              >
                {r}
              </button>
            ))}
          </div>

          <div ref={rolePanelRef} role="tabpanel" className="mt-6 grid gap-6 md:grid-cols-12">
            <div data-gsap="role-panel" className="md:col-span-5">
              <h3 className="font-display text-2xl font-bold text-ink">{role.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-2">{role.sub}</p>
            </div>
            <div data-gsap="role-panel" className="md:col-span-7">
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

        <footer className="flex flex-col items-center justify-between gap-3 border-t border-rule-strong px-5 py-5 text-xs text-ink-3 sm:flex-row sm:px-8">
          <span>MDIP · Manufacturing Decision Intelligence Platform</span>
          <div className="flex items-center gap-5">
            <a href="#method" className="hover:text-ink">
              Method
            </a>
            <a href="#roles" className="hover:text-ink">
              Roles
            </a>
            <a href="/login" className="font-medium text-ink hover:underline">
              Sign in
            </a>
          </div>
        </footer>
      </div>
    </div>
  );
}
