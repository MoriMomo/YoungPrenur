const noStore = { "Cache-Control": "no-store" };

export async function POST(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    return Response.json({ message: "Supabase sign-in is not configured." }, { status: 503, headers: noStore });
  }

  const body = await request.json().catch(() => null);
  if (typeof body?.auth_code !== "string" || typeof body?.code_verifier !== "string") {
    return Response.json({ message: "Google sign-in could not be verified. Please start again." }, {
      status: 400,
      headers: noStore,
    });
  }

  try {
    const upstream = await fetch(new URL("/auth/v1/token?grant_type=pkce", url), {
      method: "POST",
      headers: { apikey: key, "Content-Type": "application/json" },
      body: JSON.stringify({ auth_code: body.auth_code, code_verifier: body.code_verifier }),
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(10_000),
    });
    const result = await upstream.json();
    return Response.json(result, {
      status: upstream.status,
      headers: noStore,
    });
  } catch {
    return Response.json({ message: "MDIP could not reach Supabase to finish signing in." }, {
      status: 502,
      headers: noStore,
    });
  }
}
