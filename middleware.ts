// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const url = new URL(req.url);
  const path = url.pathname;

  // skip assets and public routes
  const bypass =
    path.startsWith("/onboarding") ||
    path.startsWith("/auth") ||
    path.startsWith("/api") ||
    path.startsWith("/_next") ||
    path === "/login" ||
    path === "/";

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name) { return req.cookies.get(name)?.value; },
        set(name, value, options) { res.cookies.set({ name, value, ...options }); },
        remove(name, options) {
          res.cookies.set({ name, value: "", ...options, expires: new Date(0) });
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return res; // not logged in — allow (your route guards will handle /me etc.)

  // Ensure a profile row exists
  const { data: profile } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) {
    await supabase.from("profiles").insert({
      id: user.id,
      email: user.email,
      username: null,
    });
  }

  // Previously: forced redirect to /onboarding when username missing.
  // Removed per updated UX preference; pages can show inline completion prompts instead.
  // if (!bypass && (!profile || !profile.username)) { /* redirect removed */ }

  return res;
}

export const config = {
  // apply to everything except static assets
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|images|public).*)"],
};
