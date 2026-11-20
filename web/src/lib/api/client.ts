/** Base URL, session storage and the authenticated fetch used by every signed-in call. */

import { ManufacturingRole } from "@/types";
import { getSupabase } from "@/lib/supabase";

const API_ORIGIN = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export const API_BASE = `${API_ORIGIN}/api/v1`;

/**
 * fetch() for signed-in routes: attaches the stored session token. On 401 (expired or missing
 * session) it clears the session and emits SESSION_EXPIRED_EVENT; the dashboard layout listens and
 * sends the user back to sign in, instead of silently falling back to sample data.
 */
export const SESSION_EXPIRED_EVENT = "mdip:session-expired";

/** On-premises mode keeps documents and questions on the MDIP server. */
let onPremisesMode = false;

export function setOnPremisesMode(enabled: boolean): void {
  onPremisesMode = enabled;
}

export async function apiFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const { data: { session } } = await getSupabase().auth.getSession();
  const headers = new Headers(init.headers);
  if (session) headers.set("Authorization", "Bearer " + session.access_token);
  if (onPremisesMode) headers.set("X-MDIP-Deployment", "internal");
  const res = await fetch(input, { ...init, headers });
  if (res.status === 401 && session && typeof window !== "undefined") {

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
