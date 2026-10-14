"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ManufacturingRole } from "@/types";
import { ROLES } from "@/lib/mock-data";
import {
  ShieldCheck,
  Lock,
  Mail,
  ArrowRight,
  ArrowLeft,
  Server,
  Cpu,
  Layers,
  Sparkles
} from "lucide-react";
import gsap from "gsap";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("ops.lead@imajin.id");
  const [password, setPassword] = useState("••••••••••••");
  const [selectedDemoRole, setSelectedDemoRole] = useState<ManufacturingRole>("Operations Manager");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const cardRef = useRef<HTMLDivElement>(null);
  const leftPanelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (cardRef.current) {
      gsap.fromTo(
        cardRef.current,
        { opacity: 0, y: 16, scale: 0.98 },
        { opacity: 1, y: 0, scale: 1, duration: 0.45, ease: "power2.out" }
      );
    }
    if (leftPanelRef.current) {
      gsap.fromTo(
        leftPanelRef.current,
        { opacity: 0, x: -16 },
        { opacity: 1, x: 0, duration: 0.5, ease: "power2.out", delay: 0.1 }
      );
    }
  }, []);

  const handleLogin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSubmitting(true);
    setTimeout(() => {
      router.push("/dashboard");
    }, 600);
  };

  const handleQuickRoleLogin = (role: ManufacturingRole) => {
    setSelectedDemoRole(role);
    const roleSlug = role.toLowerCase().replace(/\s+/g, ".");
    setEmail(`${roleSlug}@imajin.id`);
    setIsSubmitting(true);
    setTimeout(() => {
      router.push(`/dashboard?role=${encodeURIComponent(role)}`);
    }, 450);
  };

  return (
    <div className="min-h-screen bg-[#0c1a2d] text-[#cad8e8] flex flex-col justify-between selection:bg-[#2563eb] selection:text-white">
      {/* Top Navbar */}
      <header className="h-16 border-b border-[#1b3452] px-6 sm:px-10 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#06b6d4] to-[#2563eb] flex items-center justify-center font-bold text-white text-sm shadow-[0_2px_10px_rgba(37,99,235,0.3)]">
            M
          </div>
          <div>
            <div className="font-bold text-white text-sm tracking-tight group-hover:text-[#38bdf8] transition">
              MDIP Enterprise
            </div>
            <div className="text-[10px] text-[#7994b2] font-mono-numbers">
              Access Gateway v3.1
            </div>
          </div>
        </Link>

        <Link
          href="/"
          className="flex items-center gap-1.5 text-xs text-[#9cb5ce] hover:text-white font-medium transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Public Overview</span>
        </Link>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex items-center justify-center">
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 bg-[#12233b] border border-[#234267] rounded-2xl shadow-[0_20px_60px_rgba(4,12,24,0.6)] overflow-hidden">
          {/* Left Panel: Enterprise Security & Research Verification */}
          <div
            ref={leftPanelRef}
            className="lg:col-span-5 p-6 sm:p-8 bg-gradient-to-b from-[#142842] to-[#0f1f33] border-b lg:border-b-0 lg:border-r border-[#234267] flex flex-col justify-between space-y-6"
          >
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#1e3a5f] border border-[#2b5385] text-[#38bdf8] text-xs font-semibold uppercase tracking-wider mb-4">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Zero-Trust Persona Access</span>
              </div>

              <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight mb-2">
                Manufacturing Decision Intelligence Platform
              </h1>
              <p className="text-xs sm:text-sm text-[#8da6c3] leading-relaxed">
                Role-gated intelligence, CPM WBS critical path analytics, and grounded RAG copilot.
              </p>
            </div>

            {/* Quick Persona Launch Buttons */}
            <div className="space-y-2">
              <div className="text-[11px] font-bold text-[#38bdf8] uppercase tracking-wider mb-2 flex items-center justify-between">
                <span>1-Click Persona Demo Access:</span>
                <span className="text-[10px] text-[#7994b2]">6 Peran Aktif</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2 max-h-[320px] overflow-y-auto pr-1">
                {ROLES.map((role) => {
                  const getSubText = (r: string) => {
                    switch (r) {
                      case "Operations Manager": return "Cross-Module Bottlenecks & WBS Slippage";
                      case "Plant Manager": return "Plant OEE, Throughput & Delivery SLAs";
                      case "Production Supervisor": return "Line 02 Attainment & Operator Shift";
                      case "Maintenance Lead": return "Press P-07 Vibration & Machine Health";
                      case "Quality Manager": return "Quality Yield (97.1%) & Defect Codes";
                      case "Supply Chain Lead": return "Ingot M-204 Buffer (36h) & Fasteners";
                      default: return "Operational Intelligence Cockpit";
                    }
                  };

                  return (
                    <button
                      key={role}
                      type="button"
                      onClick={() => handleQuickRoleLogin(role)}
                      className={`w-full text-left p-2.5 rounded-xl border transition-all flex items-center justify-between group cursor-pointer ${
                        selectedDemoRole === role
                          ? "border-[#3b82f6] bg-[#1e3a5f]"
                          : "border-[#1e3a5f] hover:border-[#3b82f6] bg-[#162a45]/60 hover:bg-[#1a3456]"
                      }`}
                    >
                      <div className="min-w-0 pr-2">
                        <div className="font-semibold text-white text-xs group-hover:text-[#38bdf8] transition truncate">
                          {role}
                        </div>
                        <div className="text-[10px] text-[#7994b2] truncate">
                          {getSubText(role)}
                        </div>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-[#627d9e] group-hover:text-[#38bdf8] group-hover:translate-x-0.5 transition shrink-0" />
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="pt-3 border-t border-[#1e3a5f]/60 text-[11px] text-[#6e88a6] flex items-center justify-between">
              <span>Security Tier: Zero-Trust RBAC</span>
              <span className="font-mono-numbers">BINUS RTT & IMAJIN</span>
            </div>
          </div>

          {/* Right Panel: Credentials Input Card */}
          <div
            ref={cardRef}
            className="lg:col-span-7 p-6 sm:p-10 flex flex-col justify-center"
          >
            <div className="max-w-md w-full mx-auto space-y-6">
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight mb-1">
                  Authenticate Enterprise Session
                </h2>
                <p className="text-xs text-[#8da6c3]">
                  Enter corporate SSO credentials or select persona from the left.
                </p>
              </div>

              <form onSubmit={handleLogin} className="space-y-4">
                {/* Email Field */}
                <div>
                  <label className="block text-xs font-semibold text-[#cad8e8] mb-1.5">
                    Corporate Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-[#627d9e] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="w-full bg-[#0c1a2d] border border-[#234267] focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/20 text-white rounded-xl pl-10 pr-4 py-2.5 text-xs sm:text-sm font-medium transition placeholder:text-[#536780]"
                      placeholder="user@imajin.id"
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-[#cad8e8]">
                      Password / Security Key
                    </label>
                    <span className="text-[11px] text-[#38bdf8] hover:underline cursor-pointer">
                      Demo password auto-filled
                    </span>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-[#627d9e] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="w-full bg-[#0c1a2d] border border-[#234267] focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/20 text-white rounded-xl pl-10 pr-4 py-2.5 text-xs sm:text-sm font-medium transition"
                    />
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 px-4 bg-gradient-to-r from-[#2563eb] to-[#06b6d4] hover:from-[#1d4ed8] hover:to-[#0891b2] text-white text-xs sm:text-sm font-bold rounded-xl shadow-[0_4px_20px_rgba(37,99,235,0.4)] hover:shadow-[0_6px_25px_rgba(37,99,235,0.5)] transition-all flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
                >
                  <span>{isSubmitting ? "Authenticating Session..." : "Sign In to Cockpit"}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>

              <div className="p-3.5 rounded-xl bg-[#0c1a2d] border border-[#1b3452] text-xs text-[#7994b2] flex items-center justify-between">
                <span>Default session: <strong>{selectedDemoRole}</strong></span>
                <span className="text-[10px] text-[#10b981] font-mono-numbers">2FA Verified</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="h-12 border-t border-[#1b3452] px-6 sm:px-10 flex items-center justify-between text-xs text-[#627d9e]">
        <span>Manufacturing Decision Intelligence Platform (MDIP)</span>
        <span>BINUS RTT & IMAJIN Enterprise</span>
      </footer>
    </div>
  );
}
