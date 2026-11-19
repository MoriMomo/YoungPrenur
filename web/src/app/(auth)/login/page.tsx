"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ManufacturingRole } from "@/types";
import { ROLES, ROLE_PRESETS } from "@/lib/mock-data";
import { AuthError, loginUser, loginWithGoogle, registerUser } from "@/lib/api";
import { Lock, Mail, ArrowRight, ArrowLeft, User, AlertCircle } from "lucide-react";
import gsap from "gsap";

declare global {
  interface Window {
    google?: {
      accounts?: {
        id?: {
          initialize: (cfg: {
            client_id: string;
            callback: (resp: { credential?: string }) => void;
          }) => void;
          renderButton: (el: HTMLElement, opts: Record<string, string | number>) => void;
        };
      };
    };
  }
}

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";

const ROLE_EMAILS: Record<ManufacturingRole, string> = {
  "Operations Manager": "ops.lead@imajin.id",
  "Plant Manager": "plant.manager@imajin.id",
  "Production Supervisor": "production.supervisor@imajin.id",
  "Maintenance Lead": "maintenance.lead@imajin.id",
  "Quality Manager": "quality.manager@imajin.id",
  "Supply Chain Lead": "supply.chain.lead@imajin.id",
};

export default function LoginPage() {
  const router = useRouter();
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("ops.lead@imajin.id");
  const [password, setPassword] = useState("imajin2026");
  const [selectedDemoRole, setSelectedDemoRole] = useState<ManufacturingRole>("Operations Manager");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const cardRef = useRef<HTMLDivElement>(null);
  const leftPanelRef = useRef<HTMLDivElement>(null);
  const googleBtnRef = useRef<HTMLDivElement>(null);
  const selectedRoleRef = useRef<ManufacturingRole>(selectedDemoRole);

  useEffect(() => {
    selectedRoleRef.current = selectedDemoRole;
  }, [selectedDemoRole]);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || !googleBtnRef.current) return;

    const initGoogle = () => {
      const gid = window.google?.accounts?.id;
      const target = googleBtnRef.current;
      if (!gid || !target) return;
      target.replaceChildren();
      gid.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: async (resp: { credential?: string }) => {
          if (!resp.credential) {
            setErrorMsg("Google sign-in did not return a credential.");
            return;
          }
          setErrorMsg(null);
          setIsSubmitting(true);
          try {
            const session = await loginWithGoogle(resp.credential, selectedRoleRef.current);
            router.push(`/dashboard?role=${encodeURIComponent(session.user.role)}`);
          } catch (err) {
            setErrorMsg(err instanceof AuthError ? err.message : "Google sign-in failed.");
            setIsSubmitting(false);
          }
        },
      });
      gid.renderButton(target, {
        theme: "filled_black",
        size: "large",
        shape: "rectangular",
        text: "continue_with",
        width: 360,
      });
    };

    if (window.google?.accounts?.id) {
      initGoogle();
      return;
    }

    const existing = document.getElementById("google-gsi-script") as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener("load", initGoogle);
      return () => existing.removeEventListener("load", initGoogle);
    }

    const script = document.createElement("script");
    script.id = "google-gsi-script";
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.addEventListener("load", initGoogle);
    document.head.appendChild(script);
    return () => script.removeEventListener("load", initGoogle);
  }, [router]);

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

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg(null);
    setIsSubmitting(true);
    try {
      const session =
        authMode === "register"
          ? await registerUser(email, password, fullName, selectedDemoRole)
          : await loginUser(email, password, selectedDemoRole);
      router.push(`/dashboard?role=${encodeURIComponent(session.user.role)}`);
    } catch (err) {
      setErrorMsg(err instanceof AuthError ? err.message : "Authentication failed.");
      setIsSubmitting(false);
    }
  };

  const handleQuickRoleLogin = async (role: ManufacturingRole) => {
    setErrorMsg(null);
    setAuthMode("login");
    setSelectedDemoRole(role);
    const demoEmail = ROLE_EMAILS[role];
    setEmail(demoEmail);
    setPassword("imajin2026");
    setIsSubmitting(true);
    try {
      const session = await loginUser(demoEmail, "imajin2026", role);
      router.push(`/dashboard?role=${encodeURIComponent(session.user.role)}`);
    } catch (err) {
      setErrorMsg(err instanceof AuthError ? err.message : "Quick sign-in failed.");
      setIsSubmitting(false);
    }
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
              MDIP Operations Gateway
            </div>
            <div className="text-[11px] text-[#8f98ab] font-mono-numbers">
              PT Imajinasi Karya Bangsa · Control Room
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
                <span>Plant Access Control</span>
              </div>

              <h1 className="text-xl sm:text-2xl font-medium text-[#eef0f5] tracking-tight mb-2">
                Manufacturing Decision Intelligence Platform
              </h1>
              <p className="text-xs sm:text-sm text-[#a3a9b8] leading-relaxed">
                Sign in with your Google or plant account to open your role-scoped cockpit and HITL approval queue.
              </p>
            </div>

            <div className="space-y-2">
              <div className="text-xs font-medium text-[#a3a9b8] mb-2 flex items-center justify-between">
                <span>Quick Shift Personas</span>
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
              <span>Session Auth · SQLite &amp; Supabase</span>
              <span className="font-mono-numbers">BINUS RTT &amp; IMAJIN</span>
            </div>
          </div>

          <div ref={cardRef} className="lg:col-span-7 p-6 sm:p-10 flex flex-col justify-center">
            <div className="max-w-md w-full mx-auto space-y-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg sm:text-xl font-medium text-[#eef0f5] tracking-tight mb-1">
                    {authMode === "register" ? "Create Operator Account" : "Sign In to Cockpit"}
                  </h2>
                  <p className="text-xs text-[#a3a9b8]">
                    {authMode === "register"
                      ? "Register a plant account stored in the backend database."
                      : "Continue with Google or use your plant email and password."}
                  </p>
                </div>
                <div className="flex bg-[#0b0d14] p-0.5 rounded-lg border border-white/10 text-xs shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode("login");
                      setErrorMsg(null);
                    }}
                    className={`px-2.5 py-1 rounded-md font-medium cursor-pointer transition-colors ${
                      authMode === "login" ? "bg-[#2563eb] text-white" : "text-[#8f98ab] hover:text-[#eef0f5]"
                    }`}
                  >
                    Sign In
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode("register");
                      setErrorMsg(null);
                      setPassword("");
                    }}
                    className={`px-2.5 py-1 rounded-md font-medium cursor-pointer transition-colors ${
                      authMode === "register" ? "bg-[#2563eb] text-white" : "text-[#8f98ab] hover:text-[#eef0f5]"
                    }`}
                  >
                    Sign Up
                  </button>
                </div>
              </div>

              {errorMsg && (
                <div className="p-3 rounded-lg bg-[#dc2626]/15 border border-[#dc2626]/40 text-xs text-[#fca5a5] flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div>
                <label htmlFor="demo-role" className="block text-xs font-medium text-[#a3a9b8] mb-1.5">
                  Plant Role
                </label>
                <select
                  id="demo-role"
                  value={selectedDemoRole}
                  onChange={(e) => setSelectedDemoRole(e.target.value as ManufacturingRole)}
                  className="w-full bg-[#0b0d14] border border-white/10 focus:outline-none focus:ring-2 focus:ring-[#2563eb]/50 text-[#eef0f5] rounded-lg px-3.5 h-10 text-xs sm:text-sm"
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                {GOOGLE_CLIENT_ID ? (
                  <div ref={googleBtnRef} className="min-h-10 flex items-center justify-center" />
                ) : (
                  <div className="space-y-1.5">
                    <button
                      type="button"
                      disabled
                      className="w-full h-10 px-4 bg-[#1a1e28] text-[#8f98ab] border border-white/10 text-xs sm:text-sm font-medium rounded-lg flex items-center justify-center gap-2 opacity-75 cursor-not-allowed"
                    >
                      <span>Continue with Google</span>
                    </button>
                    <p className="text-[11px] font-mono-numbers text-[#8f98ab] text-center">
                      Set NEXT_PUBLIC_GOOGLE_CLIENT_ID + GOOGLE_CLIENT_ID to activate Google OAuth
                    </p>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3 text-[11px] text-[#8f98ab]">
                <span className="h-px flex-1 bg-white/8" />
                <span>or continue with work email</span>
                <span className="h-px flex-1 bg-white/8" />
              </div>

              <form onSubmit={handleLogin} className="space-y-4">
                {authMode === "register" && (
                  <div>
                    <label htmlFor="demo-name" className="block text-xs font-medium text-[#a3a9b8] mb-1.5">
                      Full Name
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-[#8f98ab] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" strokeWidth={1.5} />
                      <input
                        id="demo-name"
                        name="name"
                        type="text"
                        autoComplete="name"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        required
                        className="w-full bg-[#0b0d14] border border-white/10 focus:outline-none focus:ring-2 focus:ring-[#2563eb]/50 text-[#eef0f5] rounded-lg pl-10 pr-4 h-10 text-xs sm:text-sm font-normal transition-colors"
                        placeholder="e.g. Ahmad Fauzi"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label htmlFor="demo-email" className="block text-xs font-medium text-[#a3a9b8] mb-1.5">
                    Corporate Email
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-[#8f98ab] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" strokeWidth={1.5} />
                    <input
                      id="demo-email"
                      name="email"
                      type="email"
                      autoComplete="username"
                      spellCheck={false}
                      enterKeyHint="next"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="w-full bg-[#0b0d14] border border-white/10 focus:outline-none focus:ring-2 focus:ring-[#2563eb]/50 text-[#eef0f5] rounded-lg pl-10 pr-4 h-10 text-xs sm:text-sm font-normal transition-colors"
                      placeholder="user@imajin.id"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label htmlFor="demo-password" className="text-xs font-medium text-[#a3a9b8]">
                      Password
                    </label>
                    <span className="text-[11px] text-[#8f98ab] font-mono-numbers">
                      {authMode === "register" ? "Min 6 chars" : "Default: imajin2026"}
                    </span>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-[#8f98ab] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" strokeWidth={1.5} />
                    <input
                      id="demo-password"
                      name="password"
                      type="password"
                      autoComplete={authMode === "register" ? "new-password" : "current-password"}
                      enterKeyHint="done"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={authMode === "register" ? 6 : 1}
                      className="w-full bg-[#0b0d14] border border-white/10 focus:outline-none focus:ring-2 focus:ring-[#2563eb]/50 text-[#eef0f5] rounded-lg pl-10 pr-4 h-10 text-xs sm:text-sm font-normal transition-colors"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full h-10 px-4 bg-[#eef0f5] hover:bg-white text-[#0b0d14] text-xs sm:text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
                >
                  <span>
                    {isSubmitting
                      ? "Authenticating..."
                      : authMode === "register"
                      ? "Create Account & Enter Cockpit"
                      : "Sign in to Cockpit"}
                  </span>
                  <ArrowRight className="w-4 h-4" strokeWidth={1.5} />
                </button>
              </form>

              <div className="p-3.5 rounded-lg bg-[#0b0d14] border border-white/8 text-xs text-[#8f98ab] flex items-center justify-between">
                <span>
                  Selected role: <span className="text-[#eef0f5] font-medium">{selectedDemoRole}</span>
                </span>
                <span className="text-[11px] text-[#4cc38a] font-mono-numbers">
                  Production Gateway
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
