"use client";

import React, { Suspense, useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ManufacturingRole } from "@/types";
import { ROLES } from "@/lib/mock-data";
import { loginUser, loginWithGoogle, registerUser } from "@/lib/api";
import { MdipLogo } from "@/components/ui/MdipLogo";
import { Verdict, VerdictTone } from "@/components/ui/Verdict";
import { Lock, Mail, ArrowRight, ArrowLeft, User, AlertCircle } from "lucide-react";

function AuthModeSync({
  onRegisterMode,
  onSessionExpired,
}: {
  onRegisterMode: () => void;
  onSessionExpired: () => void;
}) {
  const searchParams = useSearchParams();
  const syncedRef = useRef<string | null>(null);

  useEffect(() => {
    const mode = searchParams.get("mode");
    const expired = searchParams.get("expired");
    const key = `${mode}|${expired}`;
    if (syncedRef.current === key) return;
    syncedRef.current = key;
    if (mode === "register") {
      onRegisterMode();
    }
    if (expired === "1") {
      onSessionExpired();
    }
  }, [searchParams, onRegisterMode, onSessionExpired]);

  return null;
}

/** What a signed-in user gets, in the certificate's own verdict marks. */
const COCKPIT_FEATURES: { mark: string; tone: VerdictTone; text: string }[] = [
  { mark: "Hold", tone: "hold", text: "Tasks likely to slip, scored by the delay-risk model with the reasons behind each score." },
  { mark: "Sign-off", tone: "info", text: "Recommended actions wait for a named reviewer before they enter the audit log." },
  { mark: "Cited", tone: "neutral", text: "Copilot answers quote the SOP clause or schedule line they rely on." },
];

export default function LoginPage() {
  const router = useRouter();
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [selectedDemoRole, setSelectedDemoRole] = useState<ManufacturingRole>("Operations Manager");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleGoogleSignIn = async () => {
    setErrorMsg(null);
    setIsSubmitting(true);
    try {
      await loginWithGoogle(selectedDemoRole);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Google sign-in failed.");
      setIsSubmitting(false);
    }
  };

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg(null);
    setIsSubmitting(true);
    try {
      const session =
        authMode === "register"
          ? await registerUser(email, password, fullName, selectedDemoRole)
          : await loginUser(email, password);
      if (!session) {
        setErrorMsg("Check your email to confirm your account before signing in.");
        setIsSubmitting(false);
        return;
      }
      router.push(`/dashboard?role=${encodeURIComponent(session.user.role)}`);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Authentication failed.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-paper text-ink flex flex-col justify-between">
      <Suspense fallback={null}>
        <AuthModeSync
          onRegisterMode={() => {
            setAuthMode("register");
            setPassword("");
            setIsSubmitting(false);
          }}
          onSessionExpired={() => setErrorMsg("Your session expired. Please sign in again.")}
        />
      </Suspense>

      <header className="h-14 border-b border-rule-strong px-6 sm:px-10 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 group">
          <MdipLogo variant="color" size={30} className="shrink-0" />
          <div>
            <div className="font-medium text-ink text-sm group-hover:text-stamp transition-colors">
              MDIP Operations Gateway
            </div>
          </div>
        </Link>

        <Link
          href="/"
          className="flex items-center gap-1.5 text-xs text-ink-2 hover:text-ink font-medium transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" strokeWidth={1.5} />
          <span>Back to Overview</span>
        </Link>
      </header>

      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex items-center justify-center">
        <div className="cert-frame w-full grid grid-cols-1 lg:grid-cols-12 bg-sheet overflow-hidden">
          <div
            className="lg:col-span-5 p-6 sm:p-8 bg-paper border-b lg:border-b-0 lg:border-r border-rule-strong flex flex-col justify-between space-y-6"
          >
            <div>

              <h1 className="font-display text-[32px] font-extrabold uppercase leading-[0.98] text-ink mb-3">
                Manufacturing Decision Intelligence Platform
              </h1>
              <p className="text-xs sm:text-sm text-ink-2 leading-relaxed">
                Sign in with your Google or plant account to open your role-scoped cockpit and HITL approval queue.
              </p>
            </div>

            <ul aria-label="What the cockpit gives you" className="divide-y divide-rule border border-rule-strong bg-sheet">
              {COCKPIT_FEATURES.map((item) => (
                <li key={item.mark} className="flex items-start gap-3 px-4 py-3.5">
                  <Verdict tone={item.tone} className="mt-0.5 w-[72px] justify-center">
                    {item.mark}
                  </Verdict>
                  <span className="text-sm leading-snug text-ink-2">{item.text}</span>
                </li>
              ))}
            </ul>

          </div>

          <div className="lg:col-span-7 p-6 sm:p-10 flex flex-col justify-center">
            <div className="max-w-md w-full mx-auto space-y-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-display text-[26px] font-bold leading-tight text-ink mb-1">
                    {authMode === "register" ? "Create Operator Account" : "Sign In to Cockpit"}
                  </h2>
                  <p className="text-xs text-ink-2">
                    {authMode === "register"
                      ? "Create your plant account with email and password"
                      : "Continue with Google or use your email and password"}
                  </p>
                </div>
                <div className="flex bg-sheet p-0.5 rounded-lg border border-rule-strong text-xs shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode("login");
                      setErrorMsg(null);
                      setIsSubmitting(false);
                    }}
                    className={`px-2.5 py-1 rounded-md font-medium cursor-pointer transition-colors ${
                      authMode === "login" ? "bg-stamp text-white" : "text-ink-2 hover:text-ink"
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
                      setIsSubmitting(false);
                    }}
                    className={`px-2.5 py-1 rounded-md font-medium cursor-pointer transition-colors ${
                      authMode === "register" ? "bg-stamp text-white" : "text-ink-2 hover:text-ink"
                    }`}
                  >
                    Sign Up
                  </button>
                </div>
              </div>

              {errorMsg && (
                <div className="p-3 rounded-lg bg-hold-wash border border-hold-line text-xs text-hold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div>
                <label htmlFor="demo-role" className="block text-xs font-medium text-ink-2 mb-1.5">
                  Plant Role
                </label>
                <select
                  id="demo-role"
                  value={selectedDemoRole}
                  onChange={(e) => setSelectedDemoRole(e.target.value as ManufacturingRole)}
                  className="w-full bg-sheet border border-rule-strong focus:outline-none focus:ring-2 focus:ring-stamp/50 text-ink rounded-lg px-3.5 h-10 text-xs sm:text-sm"
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-3">
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={isSubmitting}
                  className="w-full h-10 px-4 bg-sheet hover:bg-sheet-sunk text-ink border border-rule-strong text-sm font-medium rounded-md transition-colors flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-60"
                >
                  <svg viewBox="0 0 24 24" width={18} height={18} aria-hidden="true">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  <span>
                    {authMode === "register" ? "Sign up with Google" : "Continue with Google"}
                  </span>
                </button>
                <div className="flex items-center gap-3 text-xs text-ink-2">
                  <span className="h-px flex-1 bg-rule" />
                  <span>or continue with work email</span>
                  <span className="h-px flex-1 bg-rule" />
                </div>
              </div>

              <form onSubmit={handleLogin} className="space-y-4">
                {authMode === "register" && (
                  <div>
                    <label htmlFor="demo-name" className="block text-xs font-medium text-ink-2 mb-1.5">
                      Full Name
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-ink-2 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" strokeWidth={1.5} />
                      <input
                        id="demo-name"
                        name="name"
                        type="text"
                        autoComplete="name"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        required
                        className="w-full bg-sheet border border-rule-strong focus:outline-none focus:ring-2 focus:ring-stamp/50 text-ink rounded-lg pl-10 pr-4 h-10 text-xs sm:text-sm font-normal transition-colors"
                        placeholder="e.g. Ahmad Fauzi"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label htmlFor="demo-email" className="block text-xs font-medium text-ink-2 mb-1.5">
                    Corporate Email
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-ink-2 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" strokeWidth={1.5} />
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
                      className="w-full bg-sheet border border-rule-strong focus:outline-none focus:ring-2 focus:ring-stamp/50 text-ink rounded-lg pl-10 pr-4 h-10 text-xs sm:text-sm font-normal transition-colors"
                      placeholder="you@company.com"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label htmlFor="demo-password" className="text-xs font-medium text-ink-2">
                      Password
                    </label>
                    <span className="text-xs text-ink-2">
                      {authMode === "register" ? "Min 6 chars" : "Enter your password"}
                    </span>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-ink-2 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" strokeWidth={1.5} />
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
                      className="w-full bg-sheet border border-rule-strong focus:outline-none focus:ring-2 focus:ring-stamp/50 text-ink rounded-lg pl-10 pr-4 h-10 text-xs sm:text-sm font-normal transition-colors"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full h-10 px-4 bg-stamp hover:bg-stamp-deep text-sheet text-sm font-medium rounded-md transition-colors flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
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

              <div className="p-3.5 rounded-lg bg-sheet border border-rule-strong text-xs text-ink-2 flex items-center justify-between">
                <span>
                  Selected role: <span className="text-ink font-medium">{selectedDemoRole}</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="h-12 border-t border-rule-strong px-6 sm:px-10 flex items-center justify-between text-xs text-ink-2">
        <span>Manufacturing Decision Intelligence Platform (MDIP)</span>
      </footer>
    </div>
  );
}
