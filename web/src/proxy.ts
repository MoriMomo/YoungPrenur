import { NextResponse, type NextRequest } from "next/server";

// Supabase falls back to the Site URL ("/") when the requested redirect isn't allow-listed;
// send the OAuth code on to /dashboard, which finishes the PKCE exchange.
export function proxy(request: NextRequest) {
  if (!request.nextUrl.searchParams.has("code")) return;
  const url = request.nextUrl.clone();
  url.pathname = "/dashboard";
  return NextResponse.redirect(url);
}

export const config = { matcher: "/" };
