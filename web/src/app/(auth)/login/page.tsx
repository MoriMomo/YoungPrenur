"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ManufacturingRole } from "@/types";
import { ROLES, ROLE_PRESETS } from "@/lib/mock-data";
import { Lock, Mail, ArrowRight, ArrowLeft } from "lucide-react";
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
        { opacity: 0, y: 12 },
        { opacity: 1, y: 0, duration: 0.35, ease: "power2.out" }
      );
    }
    if (leftPanelRef.current) {
      gsap.fromTo(
        leftPanelRef.current,
        { opacity: 0, x: -12 },
        { opacity: 1, x: 0, duration: 0.4, ease: "power2.out" }
      );
    }
  }, []);

  const handleLogin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSubmitting(true);
    setTimeout(() => {
      router.push(`/dashboard?role=${encodeURIComponent(selectedDemoRole)}`);
    }, 350);
  };

  const handleQuickRoleLogin = (role: ManufacturingRole) => {
    setSelectedDemoRole(role);
    const roleSlug = role.toLowerCase().replace(/\s+/g, ".");
    setEmail(`${roleSlug}@imajin.id`);
    setIsSubmitting(true);
    setTimeout(() => {
      router.push(`/dashboard?role=${encodeURIComponent(role)}`);
    }, 300);
  };

  return (
    <div className="min-h-screen bg-[#0b0d14] text-[#eef0f5] flex flex-col justify-between selection:bg-[#2563eb] selection:text-white">
      <header className="h-14 border-b border-white/8 px-6 sm:px-10 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-8 h-8 rounded-lg bg-[#2563eb] flex items-center justify-center font-medium text-white text-sm">
            M
          </div>
          <div>
            <div className="font-medium text-[#eef0f5] text-sm group-hover:text-[#60a5fa] transition-colors">
              MDIP Sandbox Gateway
            </div>
            <div className="text-[11px] text-[#8f98ab] font-mono-numbers">
              TRL 4 Prototype v3.1
            </div>
          </div>
        </Link>

        <Link
          href="/"
          className="flex items-center gap-1.5 text-xs text-[#a3a9b8] hover:text-[#eef0f5] font-medium transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" strokeWidth={1.5} />
          <span>Back to Overview</span>
        </Link>
      </header>

      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex items-center justify-center">
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 bg-[#11141c] border border-white/8 rounded-2xl overflow-hidden">
          <div
            ref={leftPanelRef}
            className="lg:col-span-5 p-6 sm:p-8 bg-[#07080d] border-b lg:border-b-0 lg:border-r border-white/8 flex flex-col justify-between space-y-6"
          >
            <div>
              <div className="inline-flex items-center gap-2 text-xs font-mono-numbers text-[#8f98ab] mb-3">
                <span className="w-1.5 h-1.5 rounded-full bg-[#2563eb]" />
                <span>Role-Based Access Demo</span>
              </div>

              <h1 className="text-xl sm:text-2xl font-medium text-[#eef0f5] tracking-tight mb-2">
                Manufacturing Decision Intelligence Platform
              </h1>
              <p className="text-xs sm:text-sm text-[#a3a9b8] leading-relaxed">
                Select any of the 6 plant personas to launch the corresponding cockpit and Buying Center perspective.
              </p>
            </div>

            <div className="space-y-2">
              <div className="text-xs font-medium text-[#a3a9b8] mb-2 flex items-center justify-between">
                <span>1-Click Persona Demo Access</span>
                <span className="text-[11px] font-mono-numbers text-[#8f98ab]">6 roles</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2">
                {ROLES.map((role) => {
                  const preset = ROLE_PRESETS[role];
                  return (
                    <button
                      key={role}
                      type="button"
                      onClick={() => handleQuickRoleLogin(role)}
                      className={`w-full text-left p-2.5 rounded-lg border transition-colors flex items-center justify-between group cursor-pointer ${
                        selectedDemoRole === role
                          ? "border-white/20 bg-[#1a1e28]"
                          : "border-white/8 hover:border-white/20 bg-[#11141c] hover:bg-[#1a1e28]"
                      }`}
                    >
                      <div className="min-w-0 pr-2">
                        <div className="font-medium text-[#eef0f5] text-xs transition-colors truncate">
                          {role}
                        </div>
                        <div className="text-[11px] text-[#8f98ab] truncate">
                          {preset.buyingCenterRole} · {preset.priorityDepartment}
                        </div>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-[#8f98ab] group-hover:text-[#eef0f5] shrink-0" strokeWidth={1.5} />
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="pt-3 border-t border-white/8 text-[11px] text-[#8f98ab] flex items-center justify-between">
              <span>Demo RBAC Simulation</span>
              <span className="font-mono-numbers">BINUS RTT &amp; IMAJIN</span>
            </div>
          </div>

          <div ref={cardRef} className="lg:col-span-7 p-6 sm:p-10 flex flex-col justify-center">
            <div className="max-w-md w-full mx-auto space-y-6">
              <div>
                <h2 className="text-lg sm:text-xl font-medium text-[#eef0f5] tracking-tight mb-1">
                  Enter Simulation Session
                </h2>
                <p className="text-xs text-[#a3a9b8]">
                  Use the pre-filled demo credentials or pick a persona on the left.
                </p>
              </div>

              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label htmlFor="demo-email" className="block text-xs font-medium text-[#a3a9b8] mb-1.5">
                    Demo Corporate Email
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-[#8f98ab] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" strokeWidth={1.5} />
                    <input
                      id="demo-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="w-full bg-[#0b0d14] border border-white/10 focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/20 text-[#eef0f5] rounded-lg pl-10 pr-4 h-10 text-xs sm:text-sm font-normal transition-colors"
                      placeholder="user@imajin.id"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label htmlFor="demo-password" className="text-xs font-medium text-[#a3a9b8]">
                      Sandbox Key
                    </label>
                    <span className="text-[11px] text-[#8f98ab] font-mono-numbers">Pre-filled</span>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-[#8f98ab] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" strokeWidth={1.5} />
                    <input
                      id="demo-password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="w-full bg-[#0b0d14] border border-white/10 focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/20 text-[#eef0f5] rounded-lg pl-10 pr-4 h-10 text-xs sm:text-sm font-normal transition-colors"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full h-10 px-4 bg-[#eef0f5] hover:bg-white text-[#0b0d14] text-xs sm:text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
                >
                  <span>{isSubmitting ? "Opening Cockpit..." : "Sign in to Cockpit"}</span>
                  <ArrowRight className="w-4 h-4" strokeWidth={1.5} />
                </button>
              </form>

              <div className="p-3.5 rounded-lg bg-[#0b0d14] border border-white/8 text-xs text-[#8f98ab] flex items-center justify-between">
                <span>
                  Selected role: <span className="text-[#eef0f5] font-medium">{selectedDemoRole}</span>
                </span>
                <span className="text-[11px] text-[#4cc38a] font-mono-numbers">
                  TRL 4 Sandbox
                </span>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="h-12 border-t border-white/8 px-6 sm:px-10 flex items-center justify-between text-xs text-[#8f98ab]">
        <span>Manufacturing Decision Intelligence Platform (MDIP)</span>
        <span>BINUS RTT &amp; IMAJIN Enterprise</span>
      </footer>
    </div>
  );
}
