// src/app/auth/callback/route.ts
import { NextResponse } from "next/server";
import { createServerClientSupabase } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);

  // Supabase can return either `error` or `error_description`
  const error =
    url.searchParams.get("error") ??
    url.searchParams.get("error_description") ??
    undefined;

  // Allow callers to specify where to go post-auth (e.g. ?next=/dashboard)
  // Defaults to /dashboard
  const next = url.searchParams.get("next") || "/dashboard";

  // OAuth / magic-link: exchange ?code=... for a session and set cookies
  const code = url.searchParams.get("code");
  if (code) {
    try {
      const supabase = createServerClientSupabase();
      const { error: exErr } = await supabase.auth.exchangeCodeForSession(code);
      if (exErr) {
        // Don’t throw; just bounce back to login with message
        const dest = `/login?error=${encodeURIComponent(exErr.message)}`;
        return NextResponse.redirect(new URL(dest, url.origin));
      }
    } catch (e: any) {
      const dest = `/login?error=${encodeURIComponent(
        e?.message || "Could not complete sign-in"
      )}`;
      return NextResponse.redirect(new URL(dest, url.origin));
    }
  }

  // If Supabase sent an auth error, route back to login with it
  if (error) {
    const dest = `/login?error=${encodeURIComponent(error)}`;
    return NextResponse.redirect(new URL(dest, url.origin));
  }

  // Happy path → go where the caller asked (or /dashboard by default)
  return NextResponse.redirect(new URL(next, url.origin));
}
