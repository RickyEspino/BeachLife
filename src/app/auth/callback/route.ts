// src/app/auth/callback/route.ts
import { NextResponse } from "next/server";
import { createServerClientSupabase } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error_description");

  const supabase = createServerClientSupabase();

  // For OAuth / magic-link: exchange ?code=... for a session + set cookies
  if (code) {
    await supabase.auth.exchangeCodeForSession(code);
  }

  const dest = error
    ? `/login?error=${encodeURIComponent(error)}`
    : "/dashboard";

  return NextResponse.redirect(new URL(dest, url.origin));
}
