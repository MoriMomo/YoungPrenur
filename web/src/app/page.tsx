"use client";

import React, { useLayoutEffect, useRef, useState } from "react";
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
import GradientWaves from "@/components/landing/GradientWaves";
import { Button, LinkButton } from "@/components/ui/Button";
import { MdipLogo } from "@/components/ui/MdipLogo";
import { FileDrop } from "@/components/ui/FileDrop";
import { Verdict, VerdictTone } from "@/components/ui/Verdict";
import { Stamp } from "@/components/ui/Stamp";
import { InspectionRow, SAMPLE_ROWS, TONE_BAR, verdictFor } from "@/components/landing/inspection";
import { InspectionDetail } from "@/components/landing/InspectionDetail";
import { CockpitPreview } from "@/components/landing/CockpitPreview";
import { PilotAndFaq } from "@/components/landing/PilotAndFaq";
import { Words } from "@/components/landing/Words";
import { useT } from "@/lib/i18n";

type Pair = [string, string];

// shortcut: dummy sales inbox until a real one exists; replace before launch.
const SALES_EMAIL = "sales@mdip.example";

const PLANS: { tag: Pair; name: Pair; price: string | null; desc: Pair; items: Pair[]; cta: Pair; href: string; featured?: boolean }[] = [
  {
    tag: ["Starts with a 30-day pilot", "Dimulai dengan pilot 30 hari"],
    name: ["Starter", "Starter"],
    price: "Rp 3,5 juta",
    desc: ["Core scheduling, project visibility and basic reporting.", "Penjadwalan inti, visibilitas proyek, dan pelaporan dasar."],
    items: [
      ["Schedule upload from CSV, Excel, PDF or Word", "Unggah jadwal dari CSV, Excel, PDF, atau Word"],
      ["Critical-path timeline and project visibility", "Linimasa jalur kritis dan visibilitas proyek"],
      ["Basic reporting and exportable brief", "Pelaporan dasar dan ringkasan yang bisa diekspor"],
      ["Guided 30-day pilot on one active schedule", "Pilot terpandu 30 hari pada satu jadwal aktif"],
    ],
    cta: ["Start with a 30-day pilot", "Mulai dengan pilot 30 hari"],
    href: "/login?mode=register",
  },
  {
    tag: ["Recommended", "Disarankan"],
    name: ["Pro", "Pro"],
    price: "Rp 7,5 juta",
    desc: ["Advanced planning, delay-risk detection and AI Copilot access.", "Perencanaan lanjutan, deteksi risiko keterlambatan, dan akses Copilot AI."],
    items: [
      ["Everything in Starter", "Semua fitur Starter"],
      ["Delay-risk scores with the reasons behind them", "Skor risiko keterlambatan beserta alasannya"],
      ["2,000-run Monte Carlo slip forecast", "Prakiraan kemunduran 2.000 simulasi Monte Carlo"],
      ["AI Copilot with cited SOP clauses", "Copilot AI dengan kutipan klausul SOP"],
      ["Supervisor sign-off and audit log", "Pengesahan supervisor dan log audit"],
    ],
    cta: ["Choose Pro", "Pilih Pro"],
    href: "/login?mode=register",
    featured: true,
  },
  {
    tag: ["Multi-site", "Multi-lokasi"],
    name: ["Industrial Enterprise", "Industrial Enterprise"],
    price: null,
    desc: ["Full features across sites, integrations and dedicated support.", "Fitur lengkap lintas lokasi, integrasi, dan dukungan khusus."],
    items: [
      ["Everything in Pro", "Semua fitur Pro"],
      ["Multi-site portfolio and executive rollups", "Portofolio multi-lokasi dan ringkasan eksekutif"],
      ["Integrations with your ERP and planning tools", "Integrasi dengan ERP dan alat perencanaan Anda"],
      ["Dedicated support, SSO and custom retention", "Dukungan khusus, SSO, dan retensi khusus"],
    ],
    cta: ["Contact sales", "Hubungi sales"],
    href: `mailto:${SALES_EMAIL}?subject=MDIP%20Industrial%20Enterprise`,
  },
];

const INCLUDED: Pair[] = [
  ["Monthly or annual subscription", "Langganan bulanan atau tahunan"],
  ["Onboarding with Excel/PDF migration", "Onboarding dengan migrasi Excel/PDF"],
  ["Quarterly performance reviews", "Tinjauan kinerja per kuartal"],
  ["Technical helpdesk", "Helpdesk teknis"],
];

const ADD_ONS: { name: Pair; body: Pair }[] = [
  {
    name: ["ERP connector implementation", "Implementasi konektor ERP"],
    body: ["One-time integration with SAP PS, Primavera P6, MS Project or your ERP.", "Integrasi satu kali dengan SAP PS, Primavera P6, MS Project, atau ERP Anda."],
  },
  {
    name: ["On-premise / private VPC licensing", "Lisensi on-premise / VPC privat"],
    body: ["Deployment inside your network for security or compliance needs.", "Deployment di dalam jaringan Anda untuk kebutuhan keamanan atau kepatuhan."],
  },
  {
    name: ["Operator training", "Pelatihan operator"],
    body: ["For project managers, planners and shop-floor teams.", "Untuk manajer proyek, perencana, dan tim lantai produksi."],
  },
];

const METHOD: { title: [string, string]; body: [string, string] }[] = [
  {
    title: ["Ingest the schedule", "Masukkan jadwal"],
    body: [
      "CSV or Excel exports with planned and forecast durations. Column names in English or Indonesian are recognised and normalised into WBS work packages.",
      "Ekspor CSV atau Excel berisi durasi rencana dan prakiraan. Nama kolom berbahasa Inggris atau Indonesia dikenali dan dinormalkan menjadi paket kerja WBS.",
    ],
  },
  {
    title: ["Trace the critical path", "Telusuri jalur kritis"],
    body: [
      "A forward and backward pass computes start days, float and the critical path, and carries slip from late predecessors to the tasks that depend on them.",
      "Perhitungan maju dan mundur menghasilkan hari mulai, float, dan jalur kritis, lalu meneruskan keterlambatan pendahulu ke tugas yang bergantung padanya.",
    ],
  },
  {
    title: ["Score and explain", "Nilai dan jelaskan"],
    body: [
      "An XGBoost model scores each task's chance of finishing beyond its float and names the drivers behind it. 2,000 Monte Carlo runs turn task risk into project risk.",
      "Model XGBoost menilai peluang tiap tugas selesai melewati float-nya dan menyebut pemicunya. 2.000 simulasi Monte Carlo mengubah risiko tugas menjadi risiko proyek.",
    ],
  },
  {
    title: ["Sign off", "Pengesahan"],
    body: [
      "Recommended actions cite the SOP clause they rely on. A named supervisor authorizes or overrides each one, and every decision lands in the audit log.",
      "Tindakan yang disarankan mengutip klausul SOP yang menjadi dasarnya. Supervisor bernama menyetujui atau membatalkan tiap tindakan, dan semua keputusan tercatat di log audit.",
    ],
  },
];

function RiskCell({ row, tone }: { row: InspectionRow; tone: VerdictTone }) {
  const t = useT();
  if (row.risk === null) {
    return <span className="text-xs text-ink-3">{row.done ? t("Finished", "Selesai") : t("Not scored", "Belum dinilai")}</span>;
  }
  const pct = Math.round(row.risk * 100);
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-24 bg-sheet-sunk" aria-hidden="true">
        <div data-risk-fill className={`h-full origin-left ${TONE_BAR[tone]}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="font-mono-numbers text-xs text-ink">{pct}%</span>
    </div>
  );
}

export default function LandingPage() {
  const [rows, setRows] = useState<InspectionRow[]>(SAMPLE_ROWS);
  const [subject, setSubject] = useState("Sample project · precision stamping die set");
  const [isSample, setIsSample] = useState(true);
  const [summary, setSummary] = useState<{ prob: number; slip: number } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [stampKey, setStampKey] = useState(0);
  const [activeRole, setActiveRole] = useState<ManufacturingRole>("Operations Manager");
  const deskRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLElement>(null);
  const rolePanelRef = useRef<HTMLDivElement>(null);
  const tabIndicatorRef = useRef<HTMLSpanElement>(null);
  const [openCode, setOpenCode] = useState<string | null>(null);
  const role = ROLE_PRESETS[activeRole];
  const t = useT();

  const toggleRow = (code: string) => setOpenCode((c) => (c === code ? null : code));
  const selectFromCockpit = (code: string) => {
    setOpenCode(code);
    // The table (md+) and the stacked list (phones) both carry the row; scroll to whichever is shown.
    const target = [document.getElementById(`row-${code}`), document.getElementById(`card-${code}`)].find(
      (el) => el && el.offsetParent !== null
    );
    target?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  // Sliding underline under the active role tab: measured, so it follows the two-column grid on phones too.
  useLayoutEffect(() => {
    const place = () => {
      const bar = tabIndicatorRef.current;
      const tab = bar?.parentElement?.querySelector<HTMLElement>('[role="tab"][aria-selected="true"]');
      if (!bar || !tab) return;
      bar.style.width = `${tab.offsetWidth}px`;
      bar.style.transform = `translate(${tab.offsetLeft}px, ${tab.offsetTop + tab.offsetHeight - 2}px)`;
    };
    place();
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  }, [activeRole]);

  // Risk bars fill from zero once they scroll into view, and again after each new inspection.
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const visibleRiskBars = gsap.utils
          .toArray<HTMLElement>("[data-risk-fill]")
          .filter((el) => el.offsetParent !== null);
        if (!visibleRiskBars.length) return;
        gsap.from(visibleRiskBars, {
          scaleX: 0,
          transformOrigin: "0% 50%",
          duration: 0.55,
          stagger: 0.04,
          ease: "power2.out",
          overwrite: "auto",
          clearProps: "transform",
          scrollTrigger: { trigger: "#inspection-title", start: "top 88%", once: true },
        });
      });
      return () => mm.revert();
    },
    { scope: deskRef, dependencies: [rows], revertOnUpdate: true }
  );

  // Cockpit preview Gantt bars fill smoothly once when scrolled into view.
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.from("[data-gantt-bar]", {
          scaleX: 0,
          transformOrigin: "0% 50%",
          duration: 0.55,
          stagger: 0.045,
          ease: "power2.out",
          clearProps: "transform",
          scrollTrigger: { trigger: "#cockpit-title", start: "top 85%", once: true },
        });
      });
      return () => mm.revert();
    },
    { scope: deskRef }
  );

  // The validation stamp presses in like ink only when the visible stamp enters view.
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.utils
          .toArray<HTMLElement>("[data-stamp-press]")
          .filter((el) => el.offsetParent !== null)
          .forEach((el) => {
            gsap.fromTo(
              el,
              { scale: 1.12, autoAlpha: 0 },
              {
                scale: 1,
                autoAlpha: 1,
                duration: 0.38,
                ease: "back.out(1.4)",
                clearProps: "transform,opacity,visibility",
                scrollTrigger: { trigger: el, start: "top 88%", once: true },
              }
            );
          });
      });
      return () => mm.revert();
    },
    { scope: deskRef }
  );

  useGSAP(
    () => {
      if (!deskRef.current) return;
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: deskRef.current,
            start: "top top",
            end: "bottom bottom",
            scrub: 0.8,
          },
        });
        tl.fromTo(
          "[data-scribble-path]",
          { strokeDasharray: 1.05, strokeDashoffset: 1.05, autoAlpha: 0 },
          { strokeDashoffset: 0, autoAlpha: 1, duration: 1, stagger: 0.18, ease: "none" },
          0
        ).fromTo(
          "[data-scribble-label]",
          { autoAlpha: 0, y: 4 },
          { autoAlpha: 1, y: 0, duration: 0.8, stagger: 0.18, ease: "none" },
          0.08
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
        const tl = gsap.timeline({ defaults: { ease: "power3.out", force3D: true } });
        tl.from("[data-hero-eyebrow]", {
          y: 8,
          autoAlpha: 0,
          duration: 0.4,
          clearProps: "transform,opacity,visibility",
        })
          .from(
            "h1 [data-word]",
            {
              y: 14,
              opacity: 0,
              duration: 0.48,
              stagger: 0.026,
              clearProps: "transform,opacity",
            },
            0.05
          )
          .from(
            "[data-hero-card]",
            {
              y: 12,
              autoAlpha: 0,
              duration: 0.5,
              clearProps: "transform,opacity,visibility",
            },
            0.12
          )
          .from(
            ["[data-hero-lead]", "[data-hero-cta]"],
            {
              y: 10,
              autoAlpha: 0,
              duration: 0.45,
              stagger: 0.07,
              clearProps: "transform,opacity,visibility",
            },
            0.22
          );
      });
      return () => mm.revert();
    },
    { scope: heroRef }
  );

  // Section titles: words rise smoothly in a fast stagger as they scroll into view, followed by the lead line.
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.utils.toArray<HTMLElement>('h2[id$="-title"]').forEach((title) => {
          const tl = gsap.timeline({
            scrollTrigger: { trigger: title, start: "top 90%", once: true, fastScrollEnd: true },
          });
          tl.from(title.querySelectorAll("[data-word]"), {
            y: 12,
            autoAlpha: 0,
            duration: 0.42,
            stagger: 0.024,
            ease: "power2.out",
            force3D: true,
            clearProps: "transform,opacity,visibility",
          });
          const lead = title.nextElementSibling;
          if (lead?.tagName === "P") {
            tl.from(
              lead,
              {
                y: 8,
                autoAlpha: 0,
                duration: 0.42,
                ease: "power2.out",
                force3D: true,
                clearProps: "transform,opacity,visibility",
              },
              0.1
            );
          }
        });
      });
      return () => mm.revert();
    },
    { scope: deskRef }
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
        setNotice(
          t(
            "The inspection service is not reachable from this site, so the sample certificate stays in place.",
            "Layanan inspeksi tidak dapat dijangkau dari situs ini, jadi sertifikat contoh tetap ditampilkan."
          )
        );
        return;
      }
      setRows(
        result.tasks.map((t) => ({
          code: t.code,
          task: t.task,
          start: t.startDay,
          planned: t.plannedDays,
          forecast: t.actualDays,
          float: typeof t.floatDays === "number" ? t.floatDays : null,
          risk: /complete|done|selesai/i.test(t.status) ? null : t.delayRisk,
          level: t.riskLevel,
          critical: t.critical,
          drivers: t.drivers,
          workCenter: t.workCenter,
          done: /complete|done|selesai/i.test(t.status),
        }))
      );
      setSubject(name.replace(/\.(csv|xlsx|xlsm|xls|xer|xml)$/i, ""));
      setIsSample(false);
      setOpenCode(null);
      if (typeof result.overall_delay_probability === "number") {
        const p50 = result.estimated_project_slippage_days ?? 0;
        setSummary({ prob: result.overall_delay_probability, slip: p50 });
      }
      setStampKey((k) => k + 1);
    } catch (err) {
      setNotice(err instanceof ScheduleUploadError ? err.message : t(`Could not inspect ${name}.`, `Tidak dapat memeriksa ${name}.`));
    } finally {
      setBusy(false);
    }
  };

  const useSample = async () => {
    const base = process.env.NEXT_PUBLIC_BASE_PATH || "";
    const res = await fetch(`${base}/sample_master_schedule_wbs.csv`);
    if (!res.ok) {
      setNotice(t("The sample schedule could not be loaded.", "Jadwal contoh tidak dapat dimuat."));
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
      <div className="cert-frame relative z-10 mx-auto max-w-360 bg-sheet shadow-[0_24px_60px_-24px_rgb(20_24_28/0.18)]">
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
          <div className="lg:col-span-7">
            <p data-hero-eyebrow className="font-mono text-xs uppercase tracking-[0.08em] text-ink-3">
              {t("Schedule Delay-Risk Inspection · B2B Manufacturing SaaS", "Inspeksi Risiko Keterlambatan Jadwal · SaaS Manufaktur B2B")}
            </p>
            <h1 className="mt-3 font-display text-[44px] font-extrabold uppercase leading-[0.95] tracking-[-0.01em] text-ink sm:text-[56px] lg:text-[60px] xl:text-[72px]">
              <Words>{t("Know which tasks will slip before the work cell stalls", "Ketahui tugas yang akan mundur sebelum sel kerja berhenti")}</Words>
            </h1>
            <p data-hero-lead className="mt-5 max-w-136 text-base leading-relaxed text-ink-2">
              {t(
                "MDIP inspects a project schedule the way your plant inspects a steel bar: every task's forecast measured against its plan, a delay-risk verdict with the reasons behind it, and a named supervisor who signs off the fix.",
                "MDIP memeriksa jadwal proyek seperti pabrik Anda memeriksa batang baja: prakiraan tiap tugas diukur terhadap rencananya, putusan risiko keterlambatan beserta alasannya, dan supervisor bernama yang mengesahkan perbaikannya."
              )}
            </p>
            <div data-hero-cta className="mt-6 flex flex-wrap gap-2.5">
              <LinkButton href="/login?mode=register" size="lg">
                {t("Start 30-day pilot", "Mulai pilot 30 hari")}
              </LinkButton>
              <LinkButton href="/dashboard" variant="secondary" size="lg">
                {t("Open live cockpit", "Buka kokpit langsung")}
              </LinkButton>
            </div>
          </div>

          <div data-hero-card className="lg:col-span-5 lg:self-center">
            <FileDrop
              accept=".csv,.xlsx,.xls,.xer,.xml"
              maxBytes={2 * 1024 * 1024}
              disabled={busy}
              onFile={(file) => void inspect(file, file.name)}
              onReject={setNotice}
              className="border border-rule-strong bg-sheet p-5"
            >
              {(open) => (
                <>
                  <h2 className="font-display text-xl font-bold text-ink">{t("Submit a schedule for inspection", "Kirim jadwal untuk diinspeksi")}</h2>
                  <p className="mt-1 text-sm text-ink-2">
                    {t(
                      "Drop a CSV, Excel, Primavera P6 (.xer), or MS Project (.xml) file here, or choose one to inspect tasks, critical path, and delay risk.",
                      "Letakkan file CSV, Excel, Primavera P6 (.xer), atau MS Project (.xml) di sini, atau pilih satu untuk memeriksa tugas, jalur kritis, dan risiko terlambat."
                    )}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button size="lg" onClick={open} disabled={busy}>
                      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" strokeWidth={1.75} />}
                      {busy ? t("Inspecting…", "Memeriksa…") : t("Choose schedule file", "Pilih file jadwal")}
                    </Button>
                    <Button size="lg" variant="secondary" onClick={useSample} disabled={busy}>
                      <FileSpreadsheet className="h-4 w-4" strokeWidth={1.75} />
                      {t("Use the sample schedule", "Pakai jadwal contoh")}
                    </Button>
                  </div>
                  {notice && (
                    <p role="alert" className="mt-3 border border-hold-line bg-hold-wash px-3 py-2 text-sm text-hold">
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
          aria-label={t("Supported exports and governance", "Ekspor yang didukung dan tata kelola")}
          className="grid gap-3 border-b border-rule-strong bg-sheet-sunk px-5 py-3.5 text-xs text-ink-2 sm:px-8 lg:grid-cols-2 lg:items-center"
        >
          <p>
            <span className="font-semibold text-ink">{t("Schedule exports:", "Ekspor jadwal:")}</span>{" "}
            SAP PS · MS Project · Primavera P6 · Excel / CSV {t("(English & Indonesian headers)", "(header bahasa Inggris & Indonesia)")}
          </p>
          <p className="lg:text-right">
            <span className="font-semibold text-ink">{t("Plant controls:", "Kontrol pabrik:")}</span>{" "}
            {t(
              "Isolated workspace · Zero public model training · Full HITL audit trail",
              "Workspace terisolasi · Tanpa pelatihan model publik · Jejak audit HITL lengkap"
            )}
          </p>
        </section>

        {/* Inspection table */}
        <section aria-labelledby="inspection-title" className="px-5 pb-8 pt-7 sm:px-8">
          <div>
            <h2 id="inspection-title" className="w-fit font-display text-2xl font-bold text-ink">
              <Words>{t("Inspection results", "Hasil inspeksi")}</Words>
            </h2>
            <p className="mt-1 w-fit max-w-[calc(100%-140px)] text-sm text-ink-2">
              {t("Item inspected:", "Objek inspeksi:")} <span className="font-medium text-ink">{t(subject)}</span>
              {isSample && <span className="ml-2 text-ink-3">{t("(illustrative sample data)", "(data contoh ilustratif)")}</span>}
            </p>
          </div>

          <div className="relative mt-5">
            <div data-stamp-press className="absolute -top-21 right-1.5 z-20 hidden xl:block">
              <Stamp
                key={stampKey}
                top={t("Validated on real data", "Divalidasi data nyata")}
                center="AUC 0.78"
                bottom={t("51 held-out projects", "51 proyek uji")}
                size={100}
                animate={stampKey > 0}
              />
            </div>

            {/* Desktop and tablet: the ruled inspection table */}
            <div className="relative hidden overflow-x-auto border border-rule-strong md:block">
              <table className="w-full min-w-205 border-collapse text-sm">
                <thead>
                  <tr className="bg-paper text-left text-xs text-ink-2">
                    <th scope="col" className="border-b border-rule-strong px-3 py-2.5 font-medium">WBS</th>
                    <th scope="col" className="border-b border-rule-strong px-3 py-2.5 font-medium">{t("Task", "Tugas")}</th>
                    <th scope="col" className="border-b border-rule-strong px-3 py-2.5 text-right font-medium">{t("Planned (d)", "Rencana (h)")}</th>
                    <th scope="col" className="border-b border-rule-strong px-3 py-2.5 text-right font-medium">{t("Forecast (d)", "Prakiraan (h)")}</th>
                    <th scope="col" className="border-b border-rule-strong px-3 py-2.5 text-right font-medium">{t("Float (d)", "Float (h)")}</th>
                    <th scope="col" className="border-b border-rule-strong px-3 py-2.5 font-medium">{t("Delay risk", "Risiko terlambat")}</th>
                    <th scope="col" className="border-b border-rule-strong px-3 py-2.5 font-medium">{t("Main driver", "Pemicu utama")}</th>
                    <th scope="col" className="border-b border-rule-strong px-3 py-2.5 font-medium xl:pr-28">{t("Verdict", "Putusan")}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => {
                    const v = verdictFor(r);
                    const over = r.forecast > r.planned;
                    const open = openCode === r.code;
                    return (
                      <React.Fragment key={r.code}>
                        <tr
                          id={`row-${r.code}`}
                          onClick={() => toggleRow(r.code)}
                          className={`group cursor-pointer border-b border-rule transition-colors ${open ? "bg-paper" : "hover:bg-paper/60"}`}
                        >
                          <td
                            className={`whitespace-nowrap px-3 py-2.5 font-mono-numbers text-xs text-ink-2 ${open ? "shadow-[inset_2px_0_0_var(--color-stamp)]" : "group-hover:shadow-[inset_1px_0_0_var(--color-stamp)]"
                              }`}
                          >
                            {r.code}
                          </td>
                          <td className="px-3 py-2.5 text-ink">
                            <button
                              type="button"
                              aria-expanded={open}
                              aria-controls={`detail-${r.code}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleRow(r.code);
                              }}
                              className="cursor-pointer text-left hover:text-stamp"
                            >
                              {t(r.task)}
                            </button>
                          </td>
                          <td className="px-3 py-2.5 text-right font-mono-numbers text-ink">{r.planned}</td>
                          <td className={`px-3 py-2.5 text-right font-mono-numbers ${over ? "font-semibold text-hold" : "text-ink"}`}>
                            {r.forecast}
                            {over && <span className="sr-only">{t(" (over plan)", " (melebihi rencana)")}</span>}
                          </td>
                          <td className="px-3 py-2.5 text-right font-mono-numbers text-ink">
                            {r.float === null ? <span className="text-ink-3">n/a</span> : r.float}
                          </td>
                          <td className="px-3 py-2.5">
                            <RiskCell row={r} tone={v.tone} />
                          </td>
                          <td className="px-3 py-2.5 text-xs text-ink-2">
                            {r.drivers?.[0] ? t(r.drivers[0]) : <span className="text-ink-3">{r.done ? "—" : t("None reported", "Tidak ada")}</span>}
                          </td>
                          <td className="px-3 py-2.5">
                            <Verdict tone={v.tone}>{t(v.label)}</Verdict>
                          </td>
                        </tr>
                        {open && (
                          <tr className="border-b border-rule">
                            <td colSpan={8} className="p-0">
                              <InspectionDetail row={r} id={`detail-${r.code}`} />
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Phones: one stacked record per task, verdict always visible */}
            <div className="border border-rule-strong md:hidden">
              <ol className="divide-y divide-rule">
              {rows.map((r) => {
                const v = verdictFor(r);
                const over = r.forecast > r.planned;
                const open = openCode === r.code;
                return (
                  <li key={r.code} id={`card-${r.code}`} className={open ? "bg-paper" : ""}>
                    <button
                      type="button"
                      aria-expanded={open}
                      aria-controls={`detail-m-${r.code}`}
                      onClick={() => toggleRow(r.code)}
                      className="block w-full cursor-pointer px-4 pt-3 text-left"
                    >
                      <span className="flex items-start justify-between gap-3">
                        <span className="min-w-0">
                          <span className="block font-mono-numbers text-xs text-ink-2">{r.code}</span>
                          <span className="block text-sm font-medium text-ink">{t(r.task)}</span>
                        </span>
                        <Verdict tone={v.tone}>{t(v.label)}</Verdict>
                      </span>
                    </button>
                    <div className="px-4 pb-3">
                      <p className="mt-1.5 text-xs text-ink-2">
                        {t("Planned", "Rencana")} <span className="font-mono-numbers text-ink">{r.planned} {t("d", "h")}</span> · {t("Forecast", "Prakiraan")}{" "}
                        <span className={`font-mono-numbers ${over ? "font-semibold text-hold" : "text-ink"}`}>{r.forecast} {t("d", "h")}</span>
                        {r.float !== null && (
                          <>
                            {" "}· Float <span className="font-mono-numbers text-ink">{r.float} {t("d", "h")}</span>
                          </>
                        )}
                      </p>
                      <div className="mt-2">
                        <RiskCell row={r} tone={v.tone} />
                      </div>
                      {r.drivers?.[0] && <p className="mt-1 text-xs text-ink-2">{t("Main driver:", "Pemicu utama:")} {t(r.drivers[0])}</p>}
                      <button
                        type="button"
                        onClick={() => toggleRow(r.code)}
                        className="mt-1 cursor-pointer py-2 text-xs font-medium text-stamp"
                      >
                        {open ? t("Hide the reasons", "Sembunyikan alasan") : t("Why this verdict", "Kenapa putusan ini")}
                      </button>
                    </div>
                    {open && <InspectionDetail row={r} id={`detail-m-${r.code}`} />}
                  </li>
                );
              })}
              </ol>
            </div>
          </div>

          <div className="mt-5 grid gap-5 border-t border-rule pt-5 md:grid-cols-12">
            <div className="md:col-span-8">
              <h3 className="text-sm font-semibold text-ink">{t("Remarks", "Catatan")}</h3>
              <p className="mt-1 max-w-xl text-sm leading-relaxed text-ink-2">
                {summary
                  ? t(
                    `${summary.prob.toFixed(1)}% chance the project misses its due date · median slip +${summary.slip.toFixed(1)} days. `,
                    `${summary.prob.toFixed(1).replace(".", ",")}% peluang proyek melewati tenggat · median mundur +${summary.slip.toFixed(1).replace(".", ",")} hari. `
                  )
                  : t(`${hold} of ${rows.length} tasks are on hold. `, `${hold} dari ${rows.length} tugas ditahan. `)}
                {t(
                  "Delay risk is the probability a task finishes later than its float allows. Verdicts are recommendations: every action they trigger is authorized or overridden by a named supervisor and logged.",
                  "Risiko keterlambatan adalah peluang tugas selesai melewati batas float-nya. Putusan adalah rekomendasi: setiap tindakan yang dipicunya disetujui atau dibatalkan oleh supervisor bernama dan dicatat."
                )}
              </p>
            </div>
            <div className="md:col-span-4">
              <div className="h-12 border-b border-ink" />
              <p className="mt-1 text-xs text-ink-3">{t("Authorized by the responsible supervisor (name, role, date)", "Disahkan oleh supervisor penanggung jawab (nama, peran, tanggal)")}</p>
              <div data-stamp-press className="mt-3 w-fit xl:hidden">
                <Stamp
                  key={`m-${stampKey}`}
                  top={t("Validated on real data", "Divalidasi data nyata")}
                  center="AUC 0.78"
                  bottom={t("51 held-out projects", "51 proyek uji")}
                  size={116}
                  animate={stampKey > 0}
                />
              </div>
            </div>
          </div>
        </section>

        <CockpitPreview rows={rows} selected={openCode} onSelect={selectFromCockpit} />

        {/* Method: one axis, four stations */}
        <section id="method" aria-labelledby="method-title" className="relative isolate overflow-hidden border-t border-rule-strong bg-paper px-5 py-12 sm:px-8">
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 opacity-60 motion-reduce:hidden">
            <Dither backgroundColor="#f3f5f1" waveColor="#c9d5cb" pixelSize={2} waveSpeed={0.04} dpr={1} />
          </div>
          <h2 id="method-title" className="font-display text-[34px] font-bold leading-tight text-ink">
            <Words>{t("How a verdict is reached", "Bagaimana putusan dibuat")}</Words>
          </h2>
          <p className="mt-2 max-w-136 text-sm leading-relaxed text-ink-2">
            {t(
              "Trained on 4,149 real planned-versus-actual tasks from 251 public projects plus synthetic schedules. On 51 held-out real projects, MDIP ranks late tasks at ROC-AUC 0.78 versus 0.53 for rule-based scoring, tuned for early-warning coverage before downstream work cells stall.",
              "Dilatih dengan 4.149 tugas nyata (rencana vs. aktual) dari 251 proyek publik ditambah jadwal sintetis. Pada 51 proyek nyata yang tidak dipakai saat pelatihan, MDIP mengurutkan tugas terlambat dengan ROC-AUC 0,78 dibanding 0,53 untuk penilaian berbasis aturan, diatur untuk peringatan dini sebelum sel kerja hilir berhenti."
            )}
          </p>
          <ol className="relative mt-10 grid gap-8 md:grid-cols-4 md:gap-6">
            {METHOD.map((step, index) => (
              <li key={step.title[0]} className="relative pl-12 before:absolute before:-bottom-8 before:left-4 before:top-4 before:border-l before:border-rule-strong last:before:hidden md:pl-0 md:before:bottom-auto md:before:left-4 md:before:-right-6 md:before:border-l-0 md:before:border-t">
                <span aria-hidden="true" className="absolute left-0 top-0 grid size-8 place-items-center border border-ink bg-ink font-mono text-sm font-bold text-white md:relative">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <h3 className="min-h-8 content-center font-display text-xl font-bold text-ink md:mt-4">{t(...step.title)}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-2">{t(...step.body)}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* Roles */}
        <section id="roles" aria-labelledby="roles-title" className="border-t border-rule-strong px-5 py-12 sm:px-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 id="roles-title" className="font-display text-[34px] font-bold leading-tight text-ink">
                <Words>{t("One certificate, six readers", "Satu sertifikat, enam pembaca")}</Words>
              </h2>
              <p className="mt-2 max-w-lg text-sm leading-relaxed text-ink-2">
                {t(
                  "Each role opens the same project and sees the measurements it is accountable for.",
                  "Setiap peran membuka proyek yang sama dan melihat ukuran yang menjadi tanggung jawabnya."
                )}
              </p>
            </div>
            <LinkButton href="/login?mode=register" size="lg">
              {t(`Sign up as ${activeRole}`, `Daftar sebagai ${t(activeRole)}`)}
            </LinkButton>
          </div>

          <div role="tablist" aria-label={t("Roles", "Peran")} className="relative mt-6 grid grid-cols-2 border-b border-rule-strong sm:flex sm:flex-wrap">
            {ROLES.map((r) => (
              <button
                key={r}
                role="tab"
                type="button"
                aria-selected={activeRole === r}
                onClick={() => setActiveRole(r)}
                className={`-mb-px cursor-pointer border-b-2 px-3 py-2.5 text-left text-sm font-medium transition-colors sm:px-4 ${activeRole === r ? "border-transparent text-ink" : "border-transparent text-ink-2 hover:text-ink"
                  }`}
              >
                {t(r)}
              </button>
            ))}
            <span
              ref={tabIndicatorRef}
              aria-hidden="true"
              className="pointer-events-none absolute left-0 top-0 h-0.5 bg-stamp transition-[transform,width] duration-200 ease-out motion-reduce:transition-none"
            />
          </div>

          <div ref={rolePanelRef} role="tabpanel" className="mt-6 grid gap-6 md:grid-cols-12 md:items-center">
            <div className="md:col-span-5">
              <h3 className="font-display text-2xl font-bold text-ink">{t(role.title)}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-2">{t(role.sub)}</p>
            </div>
            <div className="md:col-span-7">
              <p className="text-sm font-medium text-ink">{t("Measurements on this role's certificate", "Ukuran pada sertifikat peran ini")}</p>
              <div className="mt-2 border-y border-rule">
                <ul className="divide-y divide-rule">
                  {role.kpis.map((k) => (
                    <li key={k.title} className="flex items-baseline justify-between gap-4 py-2.5 text-sm">
                      <span className="text-ink">{t(k.title)}</span>
                      <span className="text-right text-xs text-ink-3">{t(k.subtle)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        <PilotAndFaq />

        {/* Plans & footer: calm gradient waves behind, ink-light so the cards stay the focus */}
        <div className="relative isolate overflow-hidden border-t border-rule-strong bg-paper">
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0 motion-reduce:hidden">
            <GradientWaves
              horizonColor="#c2c9ef"
              waveColor="#2b3fbf"
              crestColor="#fbfcfa"
              lightMode
              speed={0.3}
              amplitude={2}
              relief={0.8}
              grain={0.}
              opacity={2}
              quality="low"
              dpr={1}
              swellOnClick={false}
            />
            <div className="absolute inset-x-0 top-0 h-28 bg-linear-to-b from-sheet to-transparent" />
          </div>

          {/* Plans & Pilot */}
          <section id="plans" aria-labelledby="plans-title" className="relative z-10 px-5 py-12 sm:px-8">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <h2 id="plans-title" className="font-display text-[34px] font-bold leading-tight text-ink">
                  <Words>{t("Plans & pricing", "Paket & harga")}</Words>
                </h2>
                <p className="mt-2 max-w-136 text-sm leading-relaxed text-ink-2">
                  {t(
                    "Every subscription starts with a guided 30-day pilot on one active schedule. Billed monthly or annually.",
                    "Setiap langganan dimulai dengan pilot terpandu 30 hari pada satu jadwal aktif. Ditagih bulanan atau tahunan."
                  )}
                </p>
              </div>
              <p className="font-mono text-xs text-ink-3">
                {t("Form MDIP-PL-03 · Cloud or hybrid (on-premise / private VPC)", "Formulir MDIP-PL-03 · Cloud atau hybrid (on-premise / VPC privat)")}
              </p>
            </div>

            <div className="mt-8 border border-rule-strong bg-sheet/80 backdrop-blur-[1px]">
              <div className="grid divide-y divide-rule-strong md:grid-cols-3 md:divide-x md:divide-y-0">
              {PLANS.map((plan) => (
                <article
                  key={plan.name[0]}
                  className={`flex flex-col justify-between p-6 ${plan.featured ? "border-t-2 border-t-stamp bg-paper/80" : ""}`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <p className={`font-mono text-xs uppercase tracking-[0.06em] ${plan.featured ? "text-stamp" : "text-ink-3"}`}>
                        {t(...plan.tag)}
                      </p>
                    </div>
                    <h3 className="mt-2 font-display text-2xl font-bold text-ink">{t(...plan.name)}</h3>
                    <p className="mt-3 flex items-baseline gap-1.5">
                      <span className="font-display text-3xl font-bold text-ink">{plan.price ?? t("Contact us", "Hubungi kami")}</span>
                      {plan.price && <span className="text-sm text-ink-3">{t("/ month", "/ bulan")}</span>}
                    </p>
                    <p className="mt-1.5 text-sm text-ink-2">{t(...plan.desc)}</p>
                    <div className="mt-5 border-y border-rule">
                      <ul className="divide-y divide-rule text-sm text-ink-2 [&>li]:py-2.5">
                        {plan.items.map((item) => (
                          <li key={item[0]}>{t(...item)}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  <LinkButton
                    href={plan.href}
                    variant={plan.featured ? "primary" : "secondary"}
                    size="md"
                    className="mt-6 w-full justify-center"
                  >
                    {t(...plan.cta)}
                  </LinkButton>
                </article>
              ))}
              </div>
            </div>

            <p className="mt-4 text-xs text-ink-2">
              <span className="font-semibold text-ink">{t("Included in every plan:", "Termasuk di setiap paket:")}</span>{" "}
              {INCLUDED.map((item) => t(...item)).join(" · ")}
            </p>

            <div className="mt-8">
              <h3 className="font-display text-xl font-bold text-ink">{t("Add-ons", "Layanan tambahan")}</h3>
              <div className="mt-3 border border-rule-strong bg-sheet/80">
                <ul className="grid divide-y divide-rule md:grid-cols-3 md:divide-x md:divide-y-0">
                  {ADD_ONS.map((addOn) => (
                    <li key={addOn.name[0]} className="p-5">
                      <p className="text-sm font-semibold text-ink">{t(...addOn.name)}</p>
                      <p className="mt-1 text-sm leading-relaxed text-ink-2">{t(...addOn.body)}</p>
                    </li>
                  ))}
                </ul>
              </div>
              <p className="mt-3 text-xs text-ink-3">
                {t("Priced on request:", "Harga sesuai permintaan:")}{" "}
                <a href={`mailto:${SALES_EMAIL}`} className="font-medium text-stamp hover:underline">
                  {SALES_EMAIL}
                </a>
              </p>
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
                    {t("MDIP · Certificate of Schedule Inspection", "MDIP · Sertifikat Inspeksi Jadwal")}
                  </p>
                  <p className="mt-0.5 font-mono text-[11px] text-ink-3">
                    {t("Form MDIP-DR-0001 · Manufacturing Decision Intelligence Platform", "Formulir MDIP-DR-0001 · Platform Intelijen Keputusan Manufaktur")}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <LinkButton href="/login?mode=register" size="md">
                  {t("Start 30-day pilot", "Mulai pilot 30 hari")}
                </LinkButton>
                <LinkButton href="/dashboard" variant="secondary" size="md">
                  {t("Open live cockpit", "Buka kokpit langsung")}
                </LinkButton>
              </div>
            </div>

            <div className="border-b border-rule">
              <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 text-xs *:border-rule [&>*:not(:last-child)]:border-b sm:[&>*:nth-child(odd)]:border-r sm:[&>*:nth-child(n+3)]:border-b-0 lg:*:border-b-0 lg:[&>*:not(:last-child)]:border-r">
              <div className="bg-paper/45 p-5 sm:px-8 space-y-2">
                <p className="font-mono uppercase tracking-[0.06em] text-ink-3">{t("Platform", "Platform")}</p>
                <ul className="space-y-1 text-ink-2 [&_a]:inline-block [&_a]:py-0.5">
                  <li><a href="#inspection-title" className="hover:text-ink hover:underline">{t("Schedule Inspector", "Inspektur Jadwal")}</a></li>
                  <li><Link href="/dashboard" className="hover:text-ink hover:underline">{t("Operations Cockpit", "Kokpit Operasional")}</Link></li>
                  <li><Link href="/dashboard/scheduler" className="hover:text-ink hover:underline">{t("Critical-Path Scheduler", "Penjadwal Jalur Kritis")}</Link></li>
                  <li><Link href="/dashboard/iroom" className="hover:text-ink hover:underline">{t("IRoom Streams", "Aliran IRoom")}</Link></li>
                </ul>
              </div>

              <div className="bg-paper/45 p-5 sm:px-8 space-y-2">
                <p className="font-mono uppercase tracking-[0.06em] text-ink-3">{t("Intelligence & Governance", "Intelijen & Tata Kelola")}</p>
                <ul className="space-y-1 text-ink-2 [&_a]:inline-block [&_a]:py-0.5">
                  <li><Link href="/dashboard/copilot" className="hover:text-ink hover:underline">{t("Cited SOP Copilot", "Copilot dengan Kutipan SOP")}</Link></li>
                  <li><Link href="/dashboard/knowledge" className="hover:text-ink hover:underline">{t("Plant Knowledge Base", "Basis Pengetahuan Pabrik")}</Link></li>
                  <li><a href="#method" className="hover:text-ink hover:underline">{t("Method & Validation", "Metode & Validasi")}</a></li>
                  <li><a href="#roles" className="hover:text-ink hover:underline">{t("Role Certificates", "Sertifikat Peran")}</a></li>
                </ul>
              </div>

              <div className="bg-paper/45 p-5 sm:px-8 space-y-2">
                <p className="font-mono uppercase tracking-[0.06em] text-ink-3">{t("Standards & Exports", "Standar & Ekspor")}</p>
                <ul className="space-y-1.5 text-ink-2">
                  <li>{t("ISO 9001 Cl. 7.5 Audit Trail", "Jejak Audit ISO 9001 Kl. 7.5")}</li>
                  <li>{t("ROC-AUC 0.78 (51 Held-Out Projects)", "ROC-AUC 0,78 (51 Proyek Uji)")}</li>
                  <li>SAP PS · Primavera P6 · MS Project</li>
                  <li>{t("CSV / Excel Headers (EN & ID)", "Header CSV / Excel (EN & ID)")}</li>
                </ul>
              </div>

              <div className="bg-paper/45 p-5 sm:px-8 space-y-2">
                <p className="font-mono uppercase tracking-[0.06em] text-ink-3">{t("Access & Deployment", "Akses & Deployment")}</p>
                <ul className="space-y-1 text-ink-2 [&_a]:inline-block [&_a]:py-0.5">
                  <li><a href="#plans" className="hover:text-ink hover:underline">{t("Plans & Pricing", "Paket & Harga")}</a></li>
                  <li><Link href="/login" className="hover:text-ink hover:underline">{t("Operator Sign In", "Masuk Operator")}</Link></li>
                  <li><Link href="/login?mode=register" className="hover:text-ink hover:underline">{t("Create Plant Account", "Buat Akun Pabrik")}</Link></li>
                  <li className="py-0.5">{t("Cloud SaaS & On-Premises VPC", "SaaS Cloud & VPC On-Premises")}</li>
                </ul>
              </div>
              </div>
            </div>

            <div className="relative z-10 bg-paper/55 px-5 py-3.5 sm:px-8 flex flex-col items-center justify-between gap-2 text-center sm:text-left text-xs text-ink-3 sm:flex-row">
              <span>© 2026 MDIP · {t("Manufacturing Decision Intelligence Platform", "Platform Intelijen Keputusan Manufaktur")}</span>
              <nav aria-label={t("Legal", "Hukum")} className="flex flex-wrap justify-center gap-x-4 [&>a]:py-2 sm:[&>a]:py-0">
                <Link href="/security" className="hover:text-ink hover:underline">{t("Security & data", "Keamanan & data")}</Link>
                <Link href="/privacy" className="hover:text-ink hover:underline">{t("Privacy", "Privasi")}</Link>
                <Link href="/terms" className="hover:text-ink hover:underline">{t("Terms", "Ketentuan")}</Link>
              </nav>
              <span className="hidden font-mono-numbers xl:inline">
                {t("XGBoost + 2,000-run Monte Carlo · Human-in-the-loop sign-off required", "XGBoost + 2.000 simulasi Monte Carlo · Wajib pengesahan manusia")}
              </span>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}
