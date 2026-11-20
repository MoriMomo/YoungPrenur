import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | undefined;

export function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("Supabase sign-in is not configured.");
  return client ??= createClient(url, key, {
    auth: { flowType: "pkce" },
    global: {
      fetch(input, init) {
        if (typeof window !== "undefined" && init?.method === "POST" && typeof input === "string") {
          const target = new URL(input);
          if (
            target.origin === new URL(url).origin &&
            target.pathname === "/auth/v1/token" &&
            target.searchParams.get("grant_type") === "pkce"
          ) {
            // Keep the SDK's browser session storage and exchange the PKCE code via MDIP.
            return fetch("/api/auth/pkce", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: init.body,
              signal: init.signal,
              credentials: "omit",
              cache: "no-store",
            });
          }
        }
        return fetch(input, init);
      },
    },
  });
}
