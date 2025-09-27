// src/app/auth/callback/route.ts
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/serverClient";

function isSafeRelativePath(p: string | null): p is string {
  return !!p && p.startsWith("/") && !p.startsWith("//");
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const requestedNext = url.searchParams.get("next");

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=missing_code", req.url));
  }

  const supabase = createSupabaseServerClient();

  // Exchange code -> session
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(error.message)}`, req.url)
    );
  }

  // Read profile to decide where to send the user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let hasOnboarded = false;

  if (user?.id) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("onboarded, username, avatar_url")
      .eq("id", user.id)
      .maybeSingle();

    // Prefer explicit flag:
    if (profile?.onboarded === true) {
      hasOnboarded = true;
    } else {
      // Fallback heuristic ONLY if flag missing/false:
      const looksComplete =
        !!profile?.username && profile?.username.trim() !== "" && !!profile?.avatar_url;
      hasOnboarded = looksComplete;
    }
  }

  // If a safe next is provided, use it (with guard to not trap on onboarding)
  if (isSafeRelativePath(requestedNext)) {
    if (hasOnboarded) {
      if (requestedNext === "/onboarding" || requestedNext.startsWith("/onboarding?")) {
        const nextUrl = new URL(requestedNext, url.origin);
        const forceEdit = nextUrl.searchParams.get("edit") === "1";
        return NextResponse.redirect(new URL(forceEdit ? requestedNext : "/now", req.url));
      }
      return NextResponse.redirect(new URL(requestedNext, req.url));
    }
    // Not onboarded → honor provided next (your login points at /onboarding)
    return NextResponse.redirect(new URL(requestedNext, req.url));
  }

  // No safe next provided; pick defaults
  const fallback = hasOnboarded ? "/now" : "/onboarding";
  return NextResponse.redirect(new URL(fallback, req.url));
}
