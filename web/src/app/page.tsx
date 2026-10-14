"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { ManufacturingRole } from "@/types";
import { ROLES, ROLE_PRESETS } from "@/lib/mock-data";
import {
  Sparkles,
  ArrowRight,
  ShieldCheck,
  BookOpen,
  CalendarClock,
  Activity,
  AlertTriangle,
  Flame,
  Network
} from "lucide-react";
import gsap from "gsap";

const NAV_LINKS = [
  { href: "#features", label: "Core Pillars" },
  { href: "#role-matrix", label: "Role Matrix" },
  { href: "#research", label: "Research & Grounding" },
];

const TELEMETRY_ITEMS = [
  { label: "Plant Output", value: "94.8%", tone: "text-white", note: "(Target: 95.0%)" },
  { label: "Delay Risk", value: "65.2% (+3.5d Slippage)", tone: "text-[#f87171]", note: "" },
  { label: "Press P-07", value: "Vibration +18% (SOP-PRS-04)", tone: "text-[#fbbf24]", note: "" },
  { label: "Component M-204", value: "36h Buffer Cover", tone: "text-[#f87171]", note: "" },
  { label: "Line 2 Rebalance", value: "+120 units/shift potential", tone: "text-[#34d399]", note: "" },
];

function TelemetryFeed() {
  return (
    <div className="flex items-center gap-8 pr-8 text-[11px] font-mono-numbers text-[#7994b2]">
      <span className="font-bold text-[#38bdf8] uppercase tracking-wider flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] pulsing-dot" />
        Live Telemetry Stream
      </span>
      {TELEMETRY_ITEMS.map((item) => (
        <span key={item.label} className="flex items-center gap-8">
          <span>
            {item.label}: <strong className={item.tone}>{item.value}</strong>
            {item.note && <span> {item.note}</span>}
          </span>
          <span className="text-[#2b4a6f]">•</span>
        </span>
      ))}
    </div>
  );
}

export default function LandingPage() {
  const [activeRoleTab, setActiveRoleTab] = useState<ManufacturingRole>("Operations Manager");
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (heroRef.current) {
      gsap.fromTo(
        heroRef.current.children,
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.6, stagger: 0.1, ease: "power2.out" }
      );
    }
  }, []);

  const roleData = ROLE_PRESETS[activeRoleTab];

  return (
    <div className="min-h-screen bg-[#0c1a2d] text-[#cad8e8] selection:bg-[#2563eb] selection:text-white flex flex-col justify-between">
      {/* 1. Global Navigation Bar */}
      <header className="sticky top-0 z-50 h-16 bg-[#0c1a2d]/90 backdrop-blur-md border-b border-[#1b3452] px-6 sm:px-12 flex items-center justify-between">
        <div className="flex items-center gap-10 min-w-0">
          <Link href="/" className="flex items-center gap-3 shrink-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#06b6d4] to-[#2563eb] flex items-center justify-center font-extrabold text-white text-base shadow-[0_2px_12px_rgba(37,99,235,0.4)]">
              M
            </div>
            <div className="leading-tight">
              <div className="font-extrabold text-white text-[15px] tracking-tight flex items-center gap-1.5">
                MDIP <span className="text-[#38bdf8] font-normal text-xs">· Copilot</span>
              </div>
              <div className="text-[10px] text-[#7994b2] font-mono-numbers">
                BINUS RTT &amp; IMAJIN
              </div>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-8">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-[13px] font-medium text-[#9cb5ce] hover:text-white transition-colors"
              >
                {link.label}
              </a>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <Link
            href="/login"
            className="h-9 px-4 flex items-center text-xs font-semibold text-[#cad8e8] hover:text-white border border-[#234267] hover:border-[#38bdf8] rounded-lg transition-colors"
          >
            Sign In
          </Link>
          <Link
            href="/dashboard"
            className="h-9 px-4 flex items-center gap-1.5 bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-xs font-bold rounded-lg shadow-[0_2px_12px_rgba(37,99,235,0.35)] transition-colors"
          >
            <span>Launch Workspace</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </header>

      {/* 2. Live Telemetry Ticker Banner */}
      <div className="bg-[#081220] border-b border-[#162a43] py-2 overflow-hidden">
        <div className="ticker-track flex w-max items-center whitespace-nowrap">
          <TelemetryFeed />
          <TelemetryFeed />
        </div>
      </div>

      {/* 3. Hero Section */}
      <section className="px-6 sm:px-12 py-16 sm:py-24 max-w-6xl mx-auto w-full">
        <div ref={heroRef} className="text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#142842] border border-[#234267] text-[#38bdf8] text-xs font-semibold tracking-wide">
            <span className="w-2 h-2 rounded-full bg-[#38bdf8]" />
            <span>Academic-Industry Joint Research · BINUS RTT & IMAJIN Enterprise</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight leading-[1.15]">
            Manufacturing Decision Intelligence Platform
          </h1>

          <p className="max-w-3xl mx-auto text-sm sm:text-base text-[#9cb5ce] leading-relaxed">
            AI-driven operational intelligence uniting <strong className="text-white">automated WBS task extraction</strong>, <strong className="text-white">supervised delay-risk ML</strong>, grounded <strong className="text-white">RAG SOP retrieval</strong>, and role-based execution cockpits across multi-station manufacturing.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Link
              href="/dashboard"
              className="px-6 py-3.5 bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-bold text-sm rounded-xl shadow-[0_4px_20px_rgba(37,99,235,0.4)] transition-all flex items-center gap-2 group"
            >
              <Sparkles className="w-4 h-4 text-[#93c5fd]" />
              <span>Enter Copilot Workspace Demo</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition" />
            </Link>

            <Link
              href="/login"
              className="px-6 py-3.5 bg-[#142842] hover:bg-[#1c385c] text-white font-semibold text-sm rounded-xl border border-[#25466f] transition"
            >
              Enterprise Sign In (1-Click Roles)
            </Link>
          </div>
        </div>

        {/* Live Cockpit Preview Teaser Card */}
        <div className="mt-12 sm:mt-16 bg-[#12233b] border border-[#234267] rounded-2xl p-5 sm:p-8 shadow-[0_20px_60px_rgba(4,12,24,0.6)]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#1d3758] gap-3">
            <div className="flex items-center gap-3">
              <span className="w-3 h-3 rounded-full bg-[#10b981] pulsing-dot" />
              <div className="text-sm font-bold text-white">Live Decision Brief Preview</div>
              <span className="text-[10px] font-mono-numbers px-2 py-0.5 rounded bg-[#1e3c63] text-[#38bdf8] uppercase">
                Role: Operations Manager
              </span>
            </div>
            <Link
              href="/dashboard"
              className="text-xs font-semibold text-[#38bdf8] hover:underline flex items-center gap-1 self-start sm:self-auto"
            >
              <span>Inspect Full Interactive Cockpit</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-5">
            <div className="p-4 rounded-xl bg-[#0e1d31] border border-[#1b3452]">
              <div className="text-[10px] font-bold text-[#f87171] uppercase tracking-wider mb-1 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Urgent Supply Chain Action</span>
              </div>
              <div className="text-sm font-bold text-white mb-1">Prevent M-204 Shortage</div>
              <p className="text-xs text-[#9cb5ce] leading-snug">
                Component buffer down to 36 hours. Authorize express air shipment to protect orders PO-089 & PO-092 from late delivery penalties.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[#0e1d31] border border-[#1b3452]">
              <div className="text-[10px] font-bold text-[#fbbf24] uppercase tracking-wider mb-1 flex items-center gap-1">
                <Flame className="w-3.5 h-3.5" />
                <span>Production Line Optimization</span>
              </div>
              <div className="text-sm font-bold text-white mb-1">Rebalance Line 2 Schedule</div>
              <p className="text-xs text-[#9cb5ce] leading-snug">
                Line 2 lagging by -11% (890 vs 1,000 units). Reallocate 1 cross-trained operator from Line 4 to recover 120 units per shift.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[#0e1d31] border border-[#1b3452]">
              <div className="text-[10px] font-bold text-[#38bdf8] uppercase tracking-wider mb-1 flex items-center gap-1">
                <Activity className="w-3.5 h-3.5" />
                <span>Predictive Maintenance Alarm</span>
              </div>
              <div className="text-sm font-bold text-white mb-1">Inspect Press P-07 Vibration</div>
              <p className="text-xs text-[#9cb5ce] leading-snug">
                Hydraulic stamping sensor shows +18% above normal baseline. Execute SOP-PRS-04 Rev.2 seal inspection before next stamping cycle.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Core Pillars Section */}
      <section id="features" className="py-16 bg-[#0a1627] border-y border-[#182f4b] px-6 sm:px-12">
        <div className="max-w-6xl mx-auto space-y-12">
          <div className="text-center space-y-2">
            <span className="text-[11px] font-bold text-[#38bdf8] uppercase tracking-widest font-mono-numbers">
              Decision Intelligence Architecture
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Four Interlocking Intelligence Pillars
            </h2>
            <p className="text-xs sm:text-sm text-[#7994b2] max-w-xl mx-auto">
              Engineered specifically for project-based manufacturing with non-standard work schedules.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="p-6 rounded-2xl bg-[#0f2036] border border-[#1c3759] space-y-3">
              <div className="w-10 h-10 rounded-xl bg-[#1a385c] text-[#38bdf8] flex items-center justify-center">
                <CalendarClock className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white">AI Project Scheduler</h3>
              <p className="text-xs text-[#9cb5ce] leading-relaxed">
                Automated extraction of non-standard WBS schedules from Excel/PDF documents, Critical Path Method (CPM) calculation, and ML delay-risk scoring.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#0f2036] border border-[#1c3759] space-y-3">
              <div className="w-10 h-10 rounded-xl bg-[#1a385c] text-[#10b981] flex items-center justify-center">
                <BookOpen className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white">Grounded RAG Copilot</h3>
              <p className="text-xs text-[#9cb5ce] leading-relaxed">
                Indexed repository of official manufacturing standard operating procedures (SOP-PRS-04, SOP-SCM-12) with explicit clause citations on every answer.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#0f2036] border border-[#1c3759] space-y-3">
              <div className="w-10 h-10 rounded-xl bg-[#1a385c] text-[#f59e0b] flex items-center justify-center">
                <Network className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white">IRoom Multi-Module Data</h3>
              <p className="text-xs text-[#9cb5ce] leading-relaxed">
                Ingests 5 core enterprise streams: Material Delivery, Quotation & PO, Project Progress, Drawing Approval, and Operation Tracker telemetry.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#0f2036] border border-[#1c3759] space-y-3">
              <div className="w-10 h-10 rounded-xl bg-[#1a385c] text-[#ec4899] flex items-center justify-center">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white">HITL Governance</h3>
              <p className="text-xs text-[#9cb5ce] leading-relaxed">
                Human-in-the-Loop decision review ensures that physical plant rebalances and expedited freight authorisations require verified human approval.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Role Matrix Explorer */}
      <section id="role-matrix" className="py-16 sm:py-20 px-6 sm:px-12 max-w-6xl mx-auto w-full space-y-10">
        <div className="text-center space-y-2">
          <span className="text-[11px] font-bold text-[#38bdf8] uppercase tracking-widest font-mono-numbers">
            Role-Based Decision Intelligence
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Tailored Cockpits for Six Executive Personas
          </h2>
          <p className="text-xs sm:text-sm text-[#7994b2] max-w-xl mx-auto">
            Select a role to preview its operational focus, real-time KPI metrics, and prioritized decision briefs.
          </p>
        </div>

        {/* Role Tabs */}
        <div className="flex flex-wrap items-center justify-center gap-2">
          {ROLES.map((role) => (
            <button
              key={role}
              onClick={() => setActiveRoleTab(role)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeRoleTab === role
                  ? "bg-[#2563eb] text-white shadow-md font-bold"
                  : "bg-[#142842] text-[#9cb5ce] hover:bg-[#1a3456] hover:text-white"
              }`}
            >
              {role}
            </button>
          ))}
        </div>

        {/* Selected Role Card */}
        <div className="bg-[#12233b] border border-[#234267] rounded-2xl p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#1c3759]">
            <div>
              <div className="text-xs font-bold text-[#38bdf8] uppercase tracking-wider font-mono-numbers">
                Active Persona: {activeRoleTab}
              </div>
              <h3 className="text-xl font-bold text-white mt-1">{roleData.title}</h3>
              <p className="text-xs text-[#9cb5ce] mt-0.5">{roleData.sub}</p>
            </div>

            <Link
              href={`/dashboard?role=${encodeURIComponent(activeRoleTab)}`}
              className="px-4 py-2 bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 self-start sm:self-auto"
            >
              <span>Launch {activeRoleTab} View</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* 4 KPIs for this role */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {roleData.kpis.map((k, idx) => (
              <div
                key={idx}
                className="p-4 rounded-xl bg-[#0c1a2d] border border-[#1b3452] space-y-1.5"
              >
                <div className="text-[11px] font-semibold text-[#7994b2] uppercase tracking-tight truncate">
                  {k.title}
                </div>
                <div className="text-2xl font-extrabold text-white font-mono-numbers">
                  {k.value}
                </div>
                <div className="text-[11px] font-medium text-[#38bdf8] flex items-center gap-1">
                  <span>{k.trend}</span>
                  {k.subtle && <span className="text-[#64748b] text-[10px]">{k.subtle}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. Academic Research & Grounding Section */}
      <section id="research" className="py-16 bg-[#0a1627] border-t border-[#182f4b] px-6 sm:px-12">
        <div className="max-w-5xl mx-auto space-y-8">
          <div className="p-6 sm:p-8 rounded-2xl bg-[#12233b] border border-[#234267] flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-3">
              <span className="px-2.5 py-1 rounded-md bg-[#1d3b5e] text-[#38bdf8] text-[10px] font-mono-numbers font-semibold uppercase tracking-wider border border-[#2b517d]">
                Verified Academic Foundation
              </span>
              <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                BINUS University Research & Technology Transfer
              </h3>
              <p className="text-xs text-[#9cb5ce] leading-relaxed max-w-2xl">
                Lead Researcher: <strong className="text-white">Dr. Ir. Indrajani, S.Kom., M.M.</strong><br />
                Research Title: <em>&quot;Sistem Inteligensi Penjadwalan dan Pendukung Keputusan Berbasis AI untuk Mitigasi Risiko Keterlambatan pada Manufaktur Berbasis Proyek&quot;</em>
              </p>
            </div>

            <div className="flex flex-col gap-2 shrink-0">
              <Link
                href="/dashboard"
                className="px-5 py-2.5 bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-xs font-bold rounded-xl transition text-center"
              >
                Inspect AI Scheduler WBS
              </Link>
              <Link
                href="/login"
                className="px-5 py-2.5 bg-[#142842] hover:bg-[#1c385c] text-[#cad8e8] text-xs font-semibold rounded-xl border border-[#25466f] transition text-center"
              >
                Sign In to Sandbox
              </Link>
            </div>
          </div>

          {/* Prototype Disclosure Notice */}
          <div className="p-4 rounded-xl bg-[#091423] border border-[#162c47] text-xs text-[#7994b2] text-center max-w-3xl mx-auto leading-relaxed">
            <strong className="text-white">Prototype Integrity Disclosure:</strong> All metrics, predictions, and recommendations displayed are simulated demonstration data calibrated for prototype v3.0. Verified connectors to production ERP/MES/CMMS and physical machines are isolated behind human-in-the-loop review guardrails.
          </div>
        </div>
      </section>

      {/* 7. Global Footer */}
      <footer className="h-16 border-t border-[#182f4b] px-6 sm:px-12 flex flex-col sm:flex-row items-center justify-between text-xs text-[#627d9e] gap-2">
        <div>© 2026 MDIP — AI Manufacturing Decision Intelligence Platform.</div>
        <div className="flex items-center gap-6">
          <Link href="/login" className="hover:text-white transition">Enterprise Login</Link>
          <Link href="/dashboard" className="text-[#38bdf8] hover:underline font-semibold">Live Workspace</Link>
        </div>
      </footer>
    </div>
  );
}
