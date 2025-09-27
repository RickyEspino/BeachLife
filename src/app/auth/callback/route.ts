import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/serverClient";

function isSafeRelativePath(p?: string | null) {
  return !!p && p.startsWith("/") && !p.startsWith("//");
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const requestedNext = url.searchParams.get("next"); // e.g. "/onboarding"

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=missing_code", url.origin));
  }

  const supabase = createSupabaseServerClient();

  // Exchange the code for a session (sets auth cookies)
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(error.message)}`, url.origin)
    );
  }

  // Decide destination
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let hasUsername = false;
  if (user?.id) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("username")
      .eq("id", user.id)
      .maybeSingle();
    hasUsername = !!profile?.username;
  }

  // If user is onboarded, ignore "/onboarding" as a requested next and send to /now,
  // unless caller explicitly asked for edit mode (?edit=1).
  if (hasUsername) {
    if (isSafeRelativePath(requestedNext)) {
      if (requestedNext === "/onboarding" || requestedNext.startsWith("/onboarding?")) {
        const nextUrl = new URL(requestedNext, url.origin);
        const forceEdit = nextUrl.searchParams.get("edit") === "1";
        const final = forceEdit ? requestedNext : "/now";
        return NextResponse.redirect(new URL(final, url.origin));
      }
      return NextResponse.redirect(new URL(requestedNext, url.origin));
    }
    return NextResponse.redirect(new URL("/now", url.origin));
  }

  // Not onboarded → go to onboarding (or a safe requested path, default /onboarding)
  const safeRequested = isSafeRelativePath(requestedNext) ? requestedNext : "/onboarding";
  return NextResponse.redirect(new URL(safeRequested, url.origin));
}
