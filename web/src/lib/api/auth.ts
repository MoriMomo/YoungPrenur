import type { User } from "@supabase/supabase-js";
import type { ManufacturingRole } from "@/types";
import { ROLES } from "@/lib/mock-data";
import { getSupabase } from "@/lib/supabase";
import type { AuthUser } from "./client";

class AuthError extends Error {}

function profile(user: User): AuthUser {
  const role = user.user_metadata.role || sessionStorage.getItem("mdip_google_view_role");
  return {
    id: user.id,
    email: user.email ?? "",
    name: user.user_metadata.full_name || user.email || "Operator",
    role: ROLES.includes(role) ? role : "Operations Manager",
  };
}

export async function loginUser(email: string, password: string) {
  const { data, error } = await getSupabase().auth.signInWithPassword({ email: email.trim(), password });
  if (error) throw new AuthError(error.message);
  return { user: profile(data.user) };
}

export async function registerUser(email: string, password: string, name: string, role: ManufacturingRole) {
  const { data, error } = await getSupabase().auth.signUp({
    email: email.trim(), password,
    options: { data: { full_name: name.trim(), role }, emailRedirectTo: window.location.origin + "/dashboard" },
  });
  if (error) throw new AuthError(error.message);
  return data.session ? { user: profile(data.session.user) } : null;
}

export async function loginWithGoogle(role: ManufacturingRole) {
  sessionStorage.setItem("mdip_google_view_role", role);
  const { error } = await getSupabase().auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: window.location.origin + "/dashboard" },
  });
  if (error) throw new AuthError(error.message);
}

export async function logoutUser() {
  sessionStorage.removeItem("mdip_google_view_role");
  const { error } = await getSupabase().auth.signOut({ scope: "local" });
  if (error) throw new AuthError(error.message);
}

export function subscribeAuth(onUser: (user: AuthUser) => void, onSignedOut: () => void) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    onSignedOut();
    return () => {};
  }

  let pkceWaitTimer: ReturnType<typeof setTimeout> | null = null;
  const clearPkceTimer = () => {
    if (pkceWaitTimer !== null) {
      clearTimeout(pkceWaitTimer);
      pkceWaitTimer = null;
    }
  };

  const { data } = getSupabase().auth.onAuthStateChange((event, session) => {
    if (session) {
      clearPkceTimer();
      if (typeof window !== "undefined") {
        const url = new URL(window.location.href);
        if (url.searchParams.has("code") || url.searchParams.has("state")) {
          url.searchParams.delete("code");
          url.searchParams.delete("state");
          window.history.replaceState({}, "", url.pathname + url.search + url.hash);
        }
      }
      onUser(profile(session.user));
      return;
    }

    // PKCE OAuth lands on /dashboard?code=... while the async code exchange is still running.
    if (event === "INITIAL_SESSION" && typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.has("code")) {
        clearPkceTimer();
        pkceWaitTimer = setTimeout(async () => {
          const { data: current } = await getSupabase().auth.getSession();
          if (current.session) onUser(profile(current.session.user));
          else onSignedOut();
        }, 8000);
        return;
      }
    }

    clearPkceTimer();
    onSignedOut();
  });

  return () => {
    clearPkceTimer();
    data.subscription.unsubscribe();
  };
}
