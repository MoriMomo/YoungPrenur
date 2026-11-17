"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { ManufacturingRole } from "@/types";
import { ROLES, ROLE_PRESETS } from "@/lib/mock-data";
import { ArrowRight, ArrowUpRight, ArrowDownRight } from "lucide-react";
import gsap from "gsap";

const NAV_LINKS = [
  { href: "#features", label: "Capabilities" },
  { href: "#role-matrix", label: "Personas" },
  { href: "#research", label: "Research" },
];

const TELEMETRY_ITEMS = [
  { label: "Plant Output", value: "94.8%", dot: "bg-[#4cc38a]", note: "vs 95.0% target" },
  { label: "Delay Risk", value: "65.2% (+3.5d)", dot: "bg-[#e5484d]", note: "" },
  { label: "Press P-07", value: "+18% vibration", dot: "bg-[#f59e0b]", note: "SOP-PRS-04" },
  { label: "Alloy M-204", value: "36h cover", dot: "bg-[#e5484d]", note: "" },
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
    barColor: "bg-[#2563eb]",
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
    dot: "bg-[#2563eb]",
    title: "Inspect Press P-07 Vibration",
    meta: "Maintenance · SOP-PRS-04",
    impact: "Seal check pre-cycle",
  },
];

function getStatusDot(status: "normal" | "warn" | "alert") {
  if (status === "alert") return "bg-[#e5484d]";
  if (status === "warn") return "bg-[#f59e0b]";
  return "bg-[#4cc38a]";
}

function getTrendColor(status: "normal" | "warn" | "alert") {
  if (status === "alert") return "text-[#e5484d]";
  if (status === "warn") return "text-[#f59e0b]";
  return "text-[#4cc38a]";
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
    <div className="min-h-screen bg-[#0b0d14] text-[#eef0f5] selection:bg-[#2563eb] selection:text-white flex flex-col justify-between">
      {/* Quiet Global Navigation */}
      <header className="sticky top-0 z-50 h-14 bg-[#0b0d14]/95 border-b border-white/8 px-6 sm:px-10">
        <div className="max-w-7xl mx-auto h-full flex items-center justify-between gap-6">
          <div className="flex items-center gap-8 min-w-0">
            <Link href="/" className="flex items-center gap-2.5 shrink-0">
              <div className="w-8 h-8 rounded-lg bg-[#2563eb] flex items-center justify-center font-semibold text-white text-sm">
                M
              </div>
              <div className="leading-tight">
                <div className="font-medium text-[#eef0f5] text-[15px] flex items-center gap-1.5">
                  <span>MDIP</span>
                  <span className="text-[#8f98ab] font-normal text-xs">Copilot</span>
                </div>
                <div className="text-[11px] text-[#8f98ab] font-mono-numbers">
                  BINUS RTT D1521 · IMAJIN
                </div>
              </div>
            </Link>

            <nav aria-label="Primary navigation" className="hidden md:flex items-center gap-6">
              {NAV_LINKS.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="text-xs font-medium text-[#a3a9b8] hover:text-[#eef0f5] transition-colors"
                >
                  {link.label}
                </a>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-4 shrink-0">
            <Link
              href="/login"
              className="text-xs font-medium text-[#a3a9b8] hover:text-[#eef0f5] transition-colors"
            >
              Sign in
            </Link>
            <Link
              href="/dashboard"
              className="h-9 px-4 inline-flex items-center gap-1.5 bg-[#eef0f5] hover:bg-white text-[#0b0d14] text-xs font-medium rounded-lg transition-colors"
            >
              <span>Open Cockpit</span>
              <ArrowRight className="w-3.5 h-3.5" strokeWidth={1.5} />
            </Link>
          </div>
        </div>
      </header>

      {/* Static Telemetry Reference Strip */}
      <div className="bg-[#07080d] border-b border-white/8 py-2 px-6 sm:px-10">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-x-6 gap-y-1.5 text-xs font-mono-numbers text-[#8f98ab]">
          <span className="inline-flex items-center gap-2 text-[#a3a9b8]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#2563eb]" />
            <span>TRL 4 Simulated Stream</span>
          </span>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-1">
            {TELEMETRY_ITEMS.map((item) => (
              <span key={item.label} className="inline-flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full ${item.dot}`} />
                <span>{item.label}:</span>
                <span className="text-[#eef0f5] font-medium">{item.value}</span>
                {item.note && <span className="text-[#8f98ab]">({item.note})</span>}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Asymmetric Split Hero */}
      <section className="px-6 sm:px-10 py-14 lg:py-20 w-full">
        <div
          ref={heroRef}
          className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center"
        >
          {/* Left Copy Column */}
          <div className="lg:col-span-5 space-y-5 text-left">
            <div className="inline-flex items-center gap-2 text-xs font-mono-numbers text-[#8f98ab]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#2563eb]" />
              <span>BINUS RTT D1521 · PT IMAJIN · TRL 4 Prototype</span>
            </div>

            <h1 className="text-3xl sm:text-[42px] font-medium text-[#eef0f5] tracking-[-0.025em] leading-[1.08]">
              Predict WBS schedule slippage before a work cell stalls
            </h1>

            <p className="text-sm sm:text-base text-[#a3a9b8] leading-relaxed max-w-xl">
              Consolidate factory schedules into normalized work packages, flag delay drivers via Rule-Based CPM heuristics (XGBoost roadmap), ground recommendations in SOP clauses, and log supervisor approvals.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Link
                href="/dashboard"
                className="h-11 px-5 inline-flex items-center gap-2 bg-[#eef0f5] hover:bg-white text-[#0b0d14] font-medium text-sm rounded-lg transition-colors"
              >
                <span>Launch Simulation Cockpit</span>
                <ArrowRight className="w-4 h-4" strokeWidth={1.5} />
              </Link>

              <Link
                href="/login"
                className="h-11 px-5 inline-flex items-center bg-[#1a1e28] hover:bg-[#232836] text-[#eef0f5] font-medium text-sm rounded-lg border border-white/8 transition-colors"
              >
                Select role persona
              </Link>
            </div>
          </div>

          {/* Right Coded MDIP Cockpit Moment */}
          <div className="lg:col-span-7">
            <div className="rounded-2xl bg-[#11141c] border border-white/8 shadow-[0_16px_48px_rgba(0,0,0,0.45)] overflow-hidden">
              {/* Cockpit Window Bar */}
              <div className="px-5 py-3 bg-[#07080d] border-b border-white/8 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs font-mono-numbers text-[#eef0f5]">
                  <span className="w-2 h-2 rounded-full bg-[#2563eb]" />
                  <span>MDIP / Operations Delivery Cockpit</span>
                </div>
                <div className="flex items-center gap-3 text-[11px] font-mono-numbers text-[#8f98ab]">
                  <span>TRL 4 Sandbox</span>
                  <Link href="/dashboard" className="text-[#60a5fa] hover:underline">
                    Open live view →
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
                      65.2%
                    </div>
                    <div className="text-[11px] text-[#e5484d] font-mono-numbers mt-1">
                      +3.5d slippage exposed
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
                      Weeks 1 to 4 · Heuristic CPM
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

      {/* Core Pillars (Asymmetric 12-Column Grid) */}
      <section id="features" className="py-16 bg-[#07080d] border-y border-white/8 px-6 sm:px-10">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="space-y-2 max-w-2xl">
            <div className="text-xs font-mono-numbers text-[#60a5fa]">
              Capability Dimensions D1 to D6
            </div>
            <h2 className="text-2xl sm:text-3xl font-medium text-[#eef0f5] tracking-tight">
              Four interlocking decision layers
            </h2>
            <p className="text-sm text-[#a3a9b8]">
              Schedule consolidation, heuristic delay scoring, grounded SOP citations, and supervisor approval control in one workspace.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Wide Card: D1 & D2 */}
            <div className="lg:col-span-7 p-6 rounded-xl bg-[#11141c] border border-white/8 flex flex-col justify-between gap-5">
              <div className="space-y-2">
                <div className="text-xs font-mono-numbers text-[#8f98ab]">D1 &amp; D2 · Schedule Engine</div>
                <h3 className="text-base font-medium text-[#eef0f5]">AI Project Scheduler &amp; Heuristic Risk</h3>
                <p className="text-xs sm:text-sm text-[#a3a9b8] leading-relaxed">
                  Parses non-standard CSV and Excel schedules into normalized WBS work packages, computes Critical Path Method slippage, and flags upstream vendor risks (XGBoost model on roadmap).
                </p>
              </div>
              <div className="grid grid-cols-3 gap-3 pt-4 border-t border-white/8 font-mono-numbers text-xs">
                <div>
                  <div className="text-[#8f98ab] text-[11px]">Critical Tasks</div>
                  <div className="text-[#eef0f5] font-medium mt-0.5">4 packages</div>
                </div>
                <div>
                  <div className="text-[#8f98ab] text-[11px]">Peak Variance</div>
                  <div className="text-[#e5484d] font-medium mt-0.5">+3.5 days</div>
                </div>
                <div>
                  <div className="text-[#8f98ab] text-[11px]">SLA Penalty Rate</div>
                  <div className="text-[#eef0f5] font-medium mt-0.5">Rp 15M/day</div>
                </div>
              </div>
            </div>

            {/* Compact Card: D3 */}
            <div className="lg:col-span-5 p-6 rounded-xl bg-[#11141c] border border-white/8 flex flex-col justify-between gap-5">
              <div className="space-y-2">
                <div className="text-xs font-mono-numbers text-[#8f98ab]">D3 · Traceable Guidance</div>
                <h3 className="text-base font-medium text-[#eef0f5]">Grounded RAG Copilot</h3>
                <p className="text-xs sm:text-sm text-[#a3a9b8] leading-relaxed">
                  Indexed repository of verified factory SOP documents returning clickable clause citations with every operational answer.
                </p>
              </div>
              <div className="flex flex-wrap gap-2 pt-4 border-t border-white/8 font-mono-numbers text-[11px]">
                {["SOP-PRS-04", "SOP-SCM-12", "SOP-LINE2-OPT", "SOP-ENG-02"].map((code) => (
                  <span
                    key={code}
                    className="px-2 py-1 rounded bg-[#1a1e28] border border-white/8 text-[#a3a9b8]"
                  >
                    {code}
                  </span>
                ))}
              </div>
            </div>

            {/* Compact Card: D4 */}
            <div className="lg:col-span-5 p-6 rounded-xl bg-[#11141c] border border-white/8 flex flex-col justify-between gap-5">
              <div className="space-y-2">
                <div className="text-xs font-mono-numbers text-[#8f98ab]">D4 · Pilot Telemetry</div>
                <h3 className="text-base font-medium text-[#eef0f5]">IRoom 5-Stream Connectors</h3>
                <p className="text-xs sm:text-sm text-[#a3a9b8] leading-relaxed">
                  Simulated connectors linking Material Delivery, Project Progress, CAD Drawing Approval, Quotation &amp; PO, and Operation Tracker telemetry.
                </p>
              </div>
              <div className="flex items-center justify-between pt-4 border-t border-white/8 text-xs font-mono-numbers">
                <span className="text-[#8f98ab]">Active streams</span>
                <span className="text-[#eef0f5] font-medium">5 modules synced</span>
              </div>
            </div>

            {/* Wide Card: D5 & D6 */}
            <div className="lg:col-span-7 p-6 rounded-xl bg-[#11141c] border border-white/8 flex flex-col justify-between gap-5">
              <div className="space-y-2">
                <div className="text-xs font-mono-numbers text-[#8f98ab]">D5 &amp; D6 · Compliance &amp; Privacy</div>
                <h3 className="text-base font-medium text-[#eef0f5]">Human-in-the-Loop Audit Governance</h3>
                <p className="text-xs sm:text-sm text-[#a3a9b8] leading-relaxed">
                  Supervisors authorize or override recommendations using pre-execution verification checklists recorded under ISO 9001 Cl. 7.5, with SaaS and On-Premise VPC deployment modes for CAD IP isolation.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-6 pt-4 border-t border-white/8 text-xs font-mono-numbers">
                <span className="inline-flex items-center gap-2 text-[#eef0f5]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#4cc38a]" />
                  <span>Authorize / Override Audit Log</span>
                </span>
                <span className="inline-flex items-center gap-2 text-[#a3a9b8]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#2563eb]" />
                  <span>On-Prem VPC Option</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Role Matrix */}
      <section id="role-matrix" className="py-16 px-6 sm:px-10 w-full">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="space-y-2 max-w-2xl">
            <div className="text-xs font-mono-numbers text-[#60a5fa]">
              Role-Based Decision Intelligence
            </div>
            <h2 className="text-2xl sm:text-3xl font-medium text-[#eef0f5] tracking-tight">
              Six manufacturing personas &amp; Buying Center views
            </h2>
            <p className="text-sm text-[#a3a9b8]">
              Select a persona to inspect its Buying Center perspective and live operational KPIs.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {ROLES.map((role) => (
              <button
                key={role}
                type="button"
                onClick={() => setActiveRoleTab(role)}
                className={`h-9 px-3.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  activeRoleTab === role
                    ? "bg-[#eef0f5] text-[#0b0d14]"
                    : "bg-[#11141c] text-[#a3a9b8] border border-white/8 hover:bg-[#1a1e28] hover:text-[#eef0f5]"
                }`}
              >
                {role}
              </button>
            ))}
          </div>

          <div className="bg-[#11141c] border border-white/8 rounded-xl p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-white/8">
              <div>
                <div className="text-xs font-mono-numbers text-[#8f98ab]">
                  {activeRoleTab} · {roleData.buyingCenterRole}
                </div>
                <h3 className="text-lg sm:text-xl font-medium text-[#eef0f5] mt-1">
                  {roleData.title}
                </h3>
                <p className="text-xs sm:text-sm text-[#a3a9b8] mt-0.5">{roleData.sub}</p>
              </div>

              <Link
                href={`/dashboard?role=${encodeURIComponent(activeRoleTab)}`}
                className="h-9 px-4 bg-[#eef0f5] hover:bg-white text-[#0b0d14] text-xs font-medium rounded-lg transition-colors inline-flex items-center gap-1.5 self-start sm:self-auto shrink-0"
              >
                <span>Launch {activeRoleTab} View</span>
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
                    className="p-4 rounded-xl bg-[#0b0d14] border border-white/8 space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-[#a3a9b8] truncate">{k.title}</span>
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${getStatusDot(k.status)}`} />
                    </div>
                    <div className="text-[28px] leading-none font-medium text-[#eef0f5] font-mono-numbers">
                      {k.value}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs">
                      <span className={`font-medium inline-flex items-center gap-0.5 ${getTrendColor(k.status)}`}>
                        {isUp && <ArrowUpRight className="w-3.5 h-3.5" strokeWidth={1.5} />}
                        {isDown && <ArrowDownRight className="w-3.5 h-3.5" strokeWidth={1.5} />}
                        <span>{cleanTrend}</span>
                      </span>
                      {k.subtle && (
                        <span className="text-[#8f98ab] truncate">{k.subtle}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Academic Research & Honesty Disclosure */}
      <section id="research" className="py-14 bg-[#07080d] border-t border-white/8 px-6 sm:px-10">
        <div className="max-w-7xl mx-auto space-y-5">
          <div className="p-6 sm:p-8 rounded-xl bg-[#11141c] border border-white/8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-2.5 max-w-2xl">
              <div className="text-xs font-mono-numbers text-[#8f98ab]">
                BINUS RTT D1521 · TRL 4 Prototype
              </div>
              <h3 className="text-lg sm:text-xl font-medium text-[#eef0f5]">
                Bina Nusantara University &amp; PT Imajinasi Karya Bangsa (IMAJIN)
              </h3>
              <p className="text-xs sm:text-sm text-[#a3a9b8] leading-relaxed">
                Lead Researcher: <span className="text-[#eef0f5] font-medium">Dr. Ir. Indrajani, S.Kom., M.M.</span> · &quot;Sistem Inteligensi Penjadwalan dan Pendukung Keputusan Berbasis AI untuk Mitigasi Risiko Keterlambatan pada Manufaktur Berbasis Proyek&quot;
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              <Link
                href="/dashboard/scheduler"
                className="h-9 px-4 inline-flex items-center bg-[#eef0f5] hover:bg-white text-[#0b0d14] text-xs font-medium rounded-lg transition-colors"
              >
                Inspect AI Scheduler
              </Link>
              <Link
                href="/login"
                className="h-9 px-4 inline-flex items-center bg-[#1a1e28] hover:bg-[#232836] text-[#eef0f5] text-xs font-medium rounded-lg border border-white/8 transition-colors"
              >
                Sign in to Sandbox
              </Link>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#0b0d14] border border-white/8 text-xs text-[#8f98ab] leading-relaxed">
            <span className="text-[#eef0f5] font-medium">Prototype Integrity Disclosure:</span>{" "}
            All metrics, predictions, and IRoom feeds shown in this TRL 4 sandbox are simulated demonstration data. Delay-risk scoring currently uses rule-based CPM heuristics; supervised XGBoost training and partner n=15 field testing are scheduled for the Year-1 pilot with PT IMAJIN.
          </div>
        </div>
      </section>

      <footer className="h-14 border-t border-white/8 px-6 sm:px-10 text-xs text-[#8f98ab]">
        <div className="max-w-7xl mx-auto h-full flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>MDIP: Manufacturing Decision Intelligence Platform (TRL 4 Prototype)</div>
          <div className="flex items-center gap-6">
            <Link href="/login" className="hover:text-[#eef0f5] transition-colors">
              Enterprise Login
            </Link>
            <Link href="/dashboard" className="text-[#eef0f5] hover:underline font-medium">
              Simulation Cockpit
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
