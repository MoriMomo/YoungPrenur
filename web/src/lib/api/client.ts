/** Base URL, session storage and the authenticated fetch used by every signed-in call. */

import { ManufacturingRole } from "@/types";
import { auth } from "@/lib/firebase";

const API_ORIGIN = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export const API_BASE = `${API_ORIGIN}/api/v1`;

/**
 * fetch() for signed-in routes: attaches the stored session token. On 401 (expired or missing
 * session) it clears the session and emits SESSION_EXPIRED_EVENT; the dashboard layout listens and
 * sends the user back to sign in, instead of silently falling back to sample data.
 */
export const SESSION_EXPIRED_EVENT = "mdip:session-expired";

function expireSession(): void {
  clearStoredSession();
}

/** On-premises mode asks the server not to send documents or questions to external AI (Gemini). */
let onPremisesMode = false;

export function setOnPremisesMode(enabled: boolean): void {
  onPremisesMode = enabled;
}

export async function apiFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const session = getStoredSession();
  const headers = new Headers(init.headers);
  if (session?.mode === "firebase" && auth.currentUser) {
    try {
      const idToken = await auth.currentUser.getIdToken();
      headers.set("Authorization", `Bearer ${idToken}`);
      if (session.user?.role) headers.set("X-MDIP-Role", session.user.role);
    } catch {
      // Ignore token refresh errors for optional FastAPI calls
    }
  } else if (session?.token && session.mode === "backend") {
    headers.set("Authorization", `Bearer ${session.token}`);
  }
  if (onPremisesMode) headers.set("X-MDIP-Deployment", "internal");
  const res = await fetch(input, { ...init, headers });
  if (res.status === 401 && session?.mode === "backend" && typeof window !== "undefined") {
    expireSession();
    window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
  }
  return res;
}

/**
 * Checks if the FastAPI backend service is reachable.
 */
export async function checkApiHealth(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  try {
    const res = await fetch(`${API_ORIGIN}/api/health`, {
      signal: AbortSignal.timeout(1500),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: ManufacturingRole;
}

export interface AuthSession {
  token: string;
  user: AuthUser;
  mode: "backend" | "firebase" | "sandbox";
  storage?: string;
}

const SESSION_STORAGE_KEY = "mdip_auth_session";

export function getStoredSession(): AuthSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SESSION_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AuthSession) : null;
  } catch {
    return null;
  }
}

export function saveSession(session: AuthSession): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
  } catch {
    // Storage quota/privacy mode ignored
  }
}

export function clearStoredSession(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(SESSION_STORAGE_KEY);
  } catch {
    // Ignored
  }
}
