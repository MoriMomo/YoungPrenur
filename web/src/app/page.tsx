"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { ManufacturingRole } from "@/types";
import { ROLES, ROLE_PRESETS } from "@/lib/mock-data";
import { Navbar } from "@/components/layout/Navbar";
import { ArrowRight, ArrowUpRight, ArrowDownRight } from "lucide-react";
import gsap from "gsap";

const TELEMETRY_ITEMS = [
  { label: "Plant Output", value: "94.8%", dot: "bg-[#16a34a]", note: "vs 95.0% target" },
  { label: "Delay Risk", value: "59.9% (+5.1d)", dot: "bg-[#dc2626]", note: "" },
  { label: "Press P-07", value: "+18% vibration", dot: "bg-[#d97706]", note: "SOP-PRS-04" },
  { label: "Alloy M-204", value: "36h cover", dot: "bg-[#dc2626]", note: "" },
];

const HERO_WBS_PREVIEW = [
  {
    code: "WBS-1.2",
    task: "Raw Alloy M-204 Air Freight",
    leftPct: 12,
    widthPct: 32,
    barColor: "bg-[#e5484d]",
    delta: "+2d slip",
    deltaColor: "text-[#e5484d]",
  },
  {
    code: "WBS-2.1",
    task: "CNC 5-Axis Milling Cell 01",
    leftPct: 30,
    widthPct: 44,
    barColor: "bg-[#15a87d]",
    delta: "On track",
    deltaColor: "text-[#a3a9b8]",
  },
  {
    code: "WBS-3.1",
    task: "Cell 02 Sub-Assembly Integration",
    leftPct: 54,
    widthPct: 36,
    barColor: "bg-[#f59e0b]",
    delta: "+2d slip",
    deltaColor: "text-[#f59e0b]",
  },
];

const HERO_DECISIONS = [
  {
    dot: "bg-[#e5484d]",
    title: "Prevent M-204 Shortage",
    meta: "Supply Chain · SOP-SCM-12",
    impact: "Rp 480M protected",
  },
  {
    dot: "bg-[#f59e0b]",
    title: "Rebalance Cell 02 Schedule",
    meta: "Production · SOP-LINE2-OPT",
    impact: "+120 units/shift",
  },
  {
    dot: "bg-[#15a87d]",
    title: "Inspect Press P-07 Vibration",
    meta: "Maintenance · SOP-PRS-04",
    impact: "Seal check pre-cycle",
  },
];

function getStatusDot(status: "normal" | "warn" | "alert") {
  if (status === "alert") return "bg-[#dc2626]";
  if (status === "warn") return "bg-[#d97706]";
  return "bg-[#16a34a]";
}

function getTrendColor(status: "normal" | "warn" | "alert") {
  if (status === "alert") return "text-[#dc2626]";
  if (status === "warn") return "text-[#d97706]";
  return "text-[#16a34a]";
}

export default function LandingPage() {
  const [activeRoleTab, setActiveRoleTab] = useState<ManufacturingRole>("Operations Manager");
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (heroRef.current) {
      gsap.fromTo(
        heroRef.current,
        { opacity: 0, y: 10 },
        { opacity: 1, y: 0, duration: 0.35, ease: "power2.out" }
      );
    }
  }, []);

  const roleData = ROLE_PRESETS[activeRoleTab];

  return (
    <div className="min-h-screen bg-white text-[#111827] selection:bg-[#0d556e] selection:text-white flex flex-col justify-between">
      <Navbar />

      {/* Quiet Telemetry Reference Strip */}
      <div className="bg-[#f8fafc] border-b border-[#e5e7eb] py-2 px-6 sm:px-10">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-x-6 gap-y-1.5 text-xs font-mono-numbers text-[#64748b]">
          <span className="inline-flex items-center gap-2 text-[#111827] font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-[#15a87d]" />
            <span>Shift 01 · Live Telemetry Stream</span>
          </span>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-1">
            {TELEMETRY_ITEMS.map((item) => (
              <span key={item.label} className="inline-flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full ${item.dot}`} />
                <span>{item.label}:</span>
                <span className="text-[#111827] font-medium">{item.value}</span>
                {item.note && <span className="text-[#64748b]">({item.note})</span>}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Asymmetric Split Hero */}
      <section className="px-6 sm:px-10 py-14 lg:py-20 w-full bg-white">
        <div
          ref={heroRef}
          className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center"
        >
          {/* Left Copy Column */}
          <div className="lg:col-span-5 space-y-5 text-left">
            <div className="inline-flex items-center gap-2 text-xs font-mono-numbers text-[#0d556e] bg-[#edf7f5] px-2.5 py-1 rounded-md">
              <span className="w-1.5 h-1.5 rounded-full bg-[#15a87d]" />
              <span>BINUS RTT D1521 · PT IMAJIN</span>
            </div>

            <h1 className="text-3xl sm:text-[42px] font-medium text-[#0a0a0a] tracking-[-0.025em] leading-[1.08]">
              Predict WBS schedule slippage before a work cell stalls
            </h1>

            <p className="text-sm sm:text-base text-[#4b5565] leading-relaxed max-w-xl">
              Consolidate factory schedules into normalized work packages, score delay risk with CPM and an XGBoost model validated on 251 real projects, ground recommendations in SOP clauses, and log supervisor approvals.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Link
                href="/login?mode=register"
                className="h-11 px-6 inline-flex items-center gap-2 bg-[#0a0a0a] hover:bg-[#1f2937] text-white font-medium text-sm rounded-full transition-colors"
              >
                <span>Start Free Account</span>
                <ArrowRight className="w-4 h-4" strokeWidth={1.5} />
              </Link>

              <Link
                href="/login"
                className="h-11 px-5 inline-flex items-center bg-white hover:bg-[#f9fafb] text-[#111827] font-medium text-sm rounded-full border border-[#e5e7eb] transition-colors"
              >
                Sign in with Google
              </Link>
            </div>
          </div>

          {/* Right Coded MDIP Cockpit Moment (Framed Dark Instrument Panel on Light Hero) */}
          <div className="lg:col-span-7">
            <div className="rounded-2xl bg-[#0d131c] text-[#eef0f5] border border-[#1f2937] overflow-hidden">
              {/* Cockpit Window Bar */}
              <div className="px-5 py-3 bg-[#07080d] border-b border-white/8 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs font-mono-numbers text-[#eef0f5]">
                  <span className="w-2 h-2 rounded-full bg-[#15a87d]" />
                  <span>MDIP / Operations Delivery Cockpit</span>
                </div>
                <div className="flex items-center gap-3 text-[11px] font-mono-numbers text-[#8f98ab]">
                  <span>251 Real Projects</span>
                  <Link href="/login" className="text-[#4cc38a] hover:underline">
                    Sign in to open →
                  </Link>
                </div>
              </div>

              <div className="p-5 space-y-5">
                {/* 3 Pure-Number Stat Cells */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3.5 rounded-xl bg-[#0b0d14] border border-white/8">
                    <div className="flex items-center justify-between text-xs text-[#a3a9b8]">
                      <span>Schedule Attainment</span>
                      <span className="w-1.5 h-1.5 rounded-full bg-[#f59e0b]" />
                    </div>
                    <div className="text-2xl font-medium text-[#eef0f5] font-mono-numbers mt-2">
                      91.5%
                    </div>
                    <div className="text-[11px] text-[#f59e0b] font-mono-numbers mt-1">
                      -2.5% vs baseline
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-[#0b0d14] border border-white/8">
                    <div className="flex items-center justify-between text-xs text-[#a3a9b8]">
                      <span>Critical Path Risk</span>
                      <span className="w-1.5 h-1.5 rounded-full bg-[#e5484d]" />
                    </div>
                    <div className="text-2xl font-medium text-[#eef0f5] font-mono-numbers mt-2">
                      59.9%
                    </div>
                    <div className="text-[11px] text-[#e5484d] font-mono-numbers mt-1">
                      +5.1d slippage exposed
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-[#0b0d14] border border-white/8">
                    <div className="flex items-center justify-between text-xs text-[#a3a9b8]">
                      <span>Contract Exposure</span>
                      <span className="w-1.5 h-1.5 rounded-full bg-[#4cc38a]" />
                    </div>
                    <div className="text-2xl font-medium text-[#eef0f5] font-mono-numbers mt-2">
                      Rp 480M
                    </div>
                    <div className="text-[11px] text-[#8f98ab] font-mono-numbers mt-1">
                      PO-089 &amp; PO-092
                    </div>
                  </div>
                </div>

                {/* Staggered WBS Critical Path Preview */}
                <div className="p-4 rounded-xl bg-[#0b0d14] border border-white/8 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-[#eef0f5]">WBS Critical Path Forecast</span>
                    <span className="text-[11px] font-mono-numbers text-[#8f98ab]">
                      Weeks 1 to 4 · CPM + XGBoost
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    {HERO_WBS_PREVIEW.map((row) => (
                      <div key={row.code} className="grid grid-cols-12 items-center gap-2 text-xs">
                        <div className="col-span-5 flex items-center gap-2 min-w-0">
                          <span className="px-1.5 py-0.5 rounded bg-[#1a1e28] text-[#eef0f5] font-mono-numbers text-[11px] shrink-0">
                            {row.code}
                          </span>
                          <span className="text-[#a3a9b8] truncate">{row.task}</span>
                        </div>
                        <div className="col-span-5 h-2.5 rounded bg-[#1a1e28] relative overflow-hidden">
                          <div
                            className={`absolute top-0 bottom-0 rounded ${row.barColor}`}
                            style={{ left: `${row.leftPct}%`, width: `${row.widthPct}%` }}
                          />
                        </div>
                        <div
                          className={`col-span-2 text-right font-mono-numbers text-[11px] ${row.deltaColor}`}
                        >
                          {row.delta}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Grounded HITL Decision Rows */}
                <div className="divide-y divide-white/8 rounded-xl bg-[#0b0d14] border border-white/8 px-4">
                  {HERO_DECISIONS.map((item) => (
                    <div
                      key={item.title}
                      className="py-2.5 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${item.dot}`} />
                        <span className="font-medium text-[#eef0f5] truncate">{item.title}</span>
                        <span className="hidden sm:inline font-mono-numbers text-[11px] text-[#8f98ab]">
                          {item.meta}
                        </span>
                      </div>
                      <span className="font-mono-numbers text-[11px] text-[#a3a9b8] shrink-0">
                        {item.impact}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Platform Section (D1 to D6) */}
      <section id="features" className="py-16 bg-[#f8fafc] border-y border-[#e5e7eb] px-6 sm:px-10">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="space-y-2 max-w-2xl">
            <div className="text-xs font-mono-numbers text-[#0d556e]">
              Platform · Capability Dimensions D1 to D6
            </div>
            <h2 className="text-2xl sm:text-3xl font-medium text-[#0a0a0a] tracking-tight">
              Four interlocking decision layers
            </h2>
            <p className="text-sm text-[#4b5565]">
              Schedule consolidation, ML delay-risk scoring, grounded SOP citations, and supervisor approval control in one workspace.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Wide Card: D1 & D2 */}
            <div className="lg:col-span-7 p-6 rounded-xl bg-white border border-[#e5e7eb] flex flex-col justify-between gap-5">
              <div className="space-y-2">
                <div className="text-xs font-mono-numbers text-[#64748b]">D1 &amp; D2 · Schedule Engine</div>
                <h3 className="text-base font-medium text-[#111827]">AI Project Scheduler &amp; ML Delay Risk</h3>
                <p className="text-xs sm:text-sm text-[#4b5565] leading-relaxed">
                  Parses non-standard CSV and Excel schedules into normalized WBS work packages, computes Critical Path Method float, and scores each activity&apos;s delay risk with an XGBoost hurdle model plus 2,000-run Monte Carlo forecasting.
                </p>
              </div>
              <div className="grid grid-cols-3 gap-3 pt-4 border-t border-[#f1f5f9] font-mono-numbers text-xs">
                <div>
                  <div className="text-[#64748b] text-[11px]">Real Held-Out AUC</div>
                  <div className="text-[#16a34a] font-medium mt-0.5">0.78 ROC-AUC</div>
                </div>
                <div>
                  <div className="text-[#64748b] text-[11px]">Project P50 Slip</div>
                  <div className="text-[#dc2626] font-medium mt-0.5">+5.1 days</div>
                </div>
                <div>
                  <div className="text-[#64748b] text-[11px]">SLA Penalty Rate</div>
                  <div className="text-[#111827] font-medium mt-0.5">Rp 15M/day</div>
                </div>
              </div>
            </div>

            {/* Compact Card: D3 */}
            <div className="lg:col-span-5 p-6 rounded-xl bg-white border border-[#e5e7eb] flex flex-col justify-between gap-5">
              <div className="space-y-2">
                <div className="text-xs font-mono-numbers text-[#64748b]">D3 · Traceable Guidance</div>
                <h3 className="text-base font-medium text-[#111827]">Grounded RAG Copilot</h3>
                <p className="text-xs sm:text-sm text-[#4b5565] leading-relaxed">
                  Indexed repository of verified factory SOP documents returning clickable clause citations with every operational answer.
                </p>
              </div>
              <div className="flex flex-wrap gap-2 pt-4 border-t border-[#f1f5f9] font-mono-numbers text-[11px]">
                {["SOP-PRS-04", "SOP-SCM-12", "SOP-LINE2-OPT", "SOP-ENG-02"].map((code) => (
                  <span
                    key={code}
                    className="px-2 py-1 rounded bg-[#f8fafc] border border-[#e5e7eb] text-[#374151]"
                  >
                    {code}
                  </span>
                ))}
              </div>
            </div>

            {/* Compact Card: D4 */}
            <div className="lg:col-span-5 p-6 rounded-xl bg-white border border-[#e5e7eb] flex flex-col justify-between gap-5">
              <div className="space-y-2">
                <div className="text-xs font-mono-numbers text-[#64748b]">D4 · Plant Telemetry</div>
                <h3 className="text-base font-medium text-[#111827]">IRoom 5-Stream Connectors</h3>
                <p className="text-xs sm:text-sm text-[#4b5565] leading-relaxed">
                  Live connectors linking Material Delivery, Project Progress, CAD Drawing Approval, Quotation &amp; PO, and Operation Tracker telemetry.
                </p>
              </div>
              <div className="flex items-center justify-between pt-4 border-t border-[#f1f5f9] text-xs font-mono-numbers">
                <span className="text-[#64748b]">Active streams</span>
                <span className="text-[#111827] font-medium">5 modules synced</span>
              </div>
            </div>

            {/* Wide Card: D5 & D6 */}
            <div className="lg:col-span-7 p-6 rounded-xl bg-white border border-[#e5e7eb] flex flex-col justify-between gap-5">
              <div className="space-y-2">
                <div className="text-xs font-mono-numbers text-[#64748b]">D5 &amp; D6 · Compliance &amp; Privacy</div>
                <h3 className="text-base font-medium text-[#111827]">Human-in-the-Loop Audit Governance</h3>
                <p className="text-xs sm:text-sm text-[#4b5565] leading-relaxed">
                  Supervisors authorize or override recommendations using pre-execution verification checklists recorded under ISO 9001 Cl. 7.5, backed by Supabase Postgres &amp; SQLite persistence.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-6 pt-4 border-t border-[#f1f5f9] text-xs font-mono-numbers">
                <span className="inline-flex items-center gap-2 text-[#111827]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#16a34a]" />
                  <span>Authorize / Override Audit Log</span>
                </span>
                <span className="inline-flex items-center gap-2 text-[#4b5565]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#0d556e]" />
                  <span>On-Prem VPC Option</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Solutions / Role Matrix */}
      <section id="role-matrix" className="py-16 px-6 sm:px-10 w-full bg-white">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="space-y-2 max-w-2xl">
            <div className="text-xs font-mono-numbers text-[#0d556e]">
              Solutions · Role-Based Decision Intelligence
            </div>
            <h2 className="text-2xl sm:text-3xl font-medium text-[#0a0a0a] tracking-tight">
              Six manufacturing personas &amp; Buying Center views
            </h2>
            <p className="text-sm text-[#4b5565]">
              Select a persona to preview its Buying Center perspective before signing in to your cockpit.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {ROLES.map((role) => (
              <button
                key={role}
                type="button"
                onClick={() => setActiveRoleTab(role)}
                className={`h-9 px-4 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                  activeRoleTab === role
                    ? "bg-[#0a0a0a] text-white"
                    : "bg-[#f8fafc] text-[#4b5565] border border-[#e5e7eb] hover:bg-[#edf7f5] hover:text-[#111827]"
                }`}
              >
                {role}
              </button>
            ))}
          </div>

          <div className="bg-[#f8fafc] border border-[#e5e7eb] rounded-xl p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#e5e7eb]">
              <div>
                <div className="text-xs font-mono-numbers text-[#64748b]">
                  {activeRoleTab} · {roleData.buyingCenterRole}
                </div>
                <h3 className="text-lg sm:text-xl font-medium text-[#111827] mt-1">
                  {roleData.title}
                </h3>
                <p className="text-xs sm:text-sm text-[#4b5565] mt-0.5">{roleData.sub}</p>
              </div>

              <Link
                href="/login?mode=register"
                className="h-9 px-5 bg-[#0a0a0a] hover:bg-[#1f2937] text-white text-xs font-medium rounded-full transition-colors inline-flex items-center gap-1.5 self-start sm:self-auto shrink-0"
              >
                <span>Sign up as {activeRoleTab}</span>
                <ArrowRight className="w-3.5 h-3.5" strokeWidth={1.5} />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {roleData.kpis.map((k, idx) => {
                const isUp = k.trend.includes("↑");
                const isDown = k.trend.includes("↓");
                const cleanTrend = k.trend.replace(/^[↑↓]\s*/, "");

                return (
                  <div
                    key={idx}
                    className="p-4 rounded-xl bg-white border border-[#e5e7eb] space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-[#4b5565] truncate">{k.title}</span>
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${getStatusDot(k.status)}`} />
                    </div>
                    <div className="text-[28px] leading-none font-medium text-[#111827] font-mono-numbers">
                      {k.value}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs">
                      <span className={`font-medium inline-flex items-center gap-0.5 ${getTrendColor(k.status)}`}>
                        {isUp && <ArrowUpRight className="w-3.5 h-3.5" strokeWidth={1.5} />}
                        {isDown && <ArrowDownRight className="w-3.5 h-3.5" strokeWidth={1.5} />}
                        <span>{cleanTrend}</span>
                      </span>
                      {k.subtle && (
                        <span className="text-[#64748b] truncate">{k.subtle}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* How We Work / Research & Integrity Disclosure */}
      <section id="research" className="py-14 bg-[#f8fafc] border-t border-[#e5e7eb] px-6 sm:px-10">
        <div className="max-w-7xl mx-auto space-y-5">
          <div className="p-6 sm:p-8 rounded-xl bg-white border border-[#e5e7eb] flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-2.5 max-w-2xl">
              <div className="text-xs font-mono-numbers text-[#0d556e]">
                How We Work · BINUS RTT D1521
              </div>
              <h3 className="text-lg sm:text-xl font-medium text-[#111827]">
                Bina Nusantara University &amp; PT Imajinasi Karya Bangsa (IMAJIN)
              </h3>
              <p className="text-xs sm:text-sm text-[#4b5565] leading-relaxed">
                Lead Researcher: <span className="text-[#111827] font-medium">Dr. Ir. Indrajani, S.Kom., M.M.</span> · &quot;Sistem Inteligensi Penjadwalan dan Pendukung Keputusan Berbasis AI untuk Mitigasi Risiko Keterlambatan pada Manufaktur Berbasis Proyek&quot;
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              <Link
                href="/login?mode=register"
                className="h-9 px-5 inline-flex items-center bg-[#0a0a0a] hover:bg-[#1f2937] text-white text-xs font-medium rounded-full transition-colors"
              >
                Create Account
              </Link>
              <Link
                href="/login"
                className="h-9 px-5 inline-flex items-center bg-white hover:bg-[#f9fafb] text-[#111827] text-xs font-medium rounded-full border border-[#e5e7eb] transition-colors"
              >
                Sign in to Cockpit
              </Link>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-white border border-[#e5e7eb] text-xs text-[#4b5565] leading-relaxed">
            <span className="text-[#111827] font-medium">Model &amp; Data Integrity:</span>{" "}
            MDIP&apos;s delay-risk engine combines 4,149 real empirical project &amp; CNC routing tasks (251 projects from DSLIB v3.4 and 4TU Production_Data, achieving 0.78 held-out ROC-AUC vs 0.53 heuristic) with 7,855 synthetic WBS tasks. User accounts and audit logs persist in Supabase Postgres with local SQLite fallback.
          </div>
        </div>
      </section>

      <footer className="h-14 bg-white border-t border-[#e5e7eb] px-6 sm:px-10 text-xs text-[#64748b]">
        <div className="max-w-7xl mx-auto h-full flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>MDIP: Manufacturing Decision Intelligence Platform</div>
          <div className="flex items-center gap-6">
            <Link href="/login" className="hover:text-[#111827] transition-colors">
              Log in
            </Link>
            <Link href="/login?mode=register" className="text-[#111827] hover:underline font-medium">
              Sign up
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
