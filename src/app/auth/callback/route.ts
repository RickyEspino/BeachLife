import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/serverClient";

function isSafeRelativePath(p?: string) {
  return !!p && p.startsWith("/") && !p.startsWith("//");
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const requestedNext = url.searchParams.get("next") ?? undefined;

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=missing_code", url.origin));
  }

  const supabase = createSupabaseServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(error.message)}`, url.origin)
    );
  }

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

  if (hasUsername) {
    if (isSafeRelativePath(requestedNext)) {
      const nextStr = requestedNext as string;
      if (nextStr === "/onboarding" || nextStr.startsWith("/onboarding?")) {
        const nextUrl = new URL(nextStr, url.origin);
        const forceEdit = nextUrl.searchParams.get("edit") === "1";
        const final = forceEdit ? nextStr : "/now";
        return NextResponse.redirect(new URL(final, url.origin));
      }
      return NextResponse.redirect(new URL(nextStr, url.origin));
    }
    return NextResponse.redirect(new URL("/now", url.origin));
  }

  const safeRequested = isSafeRelativePath(requestedNext)
    ? (requestedNext as string)
    : "/onboarding";
  return NextResponse.redirect(new URL(safeRequested, url.origin));
}
