// src/app/auth/callback/route.ts
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/serverClient";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const requestedNext = url.searchParams.get("next");

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=missing_code", req.url));
  }

  const supabase = createSupabaseServerClient();

  // Exchange code -> session (sets cookies)
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(error.message)}`, req.url)
    );
  }

  // Look up user + profile to decide where to go if no explicit next
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let defaultNext = "/onboarding";
  if (user?.id) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("username")
      .eq("id", user.id)
      .maybeSingle();

    // ✅ If already onboarded, default to /me
    if (profile?.username) {
      defaultNext = "/me";
    }
  }

  // Prefer a caller-provided next, but keep it safe (same-origin relative path)
  const next =
    requestedNext && requestedNext.startsWith("/") && !requestedNext.startsWith("//")
      ? requestedNext
      : defaultNext;

  return NextResponse.redirect(new URL(next, req.url));
}
