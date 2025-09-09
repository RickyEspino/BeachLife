import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const cookieStore = cookies();

  // IMPORTANT: in a Route Handler we must provide get/set/remove
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name: string, options: any) {
          // remove by setting an expired cookie
          cookieStore.set({ name, value: "", ...options, maxAge: 0 });
        },
      },
    }
  );

  // For OAuth / magic-link: exchange ?code=... for a session + set cookies
  if (code) {
    await supabase.auth.exchangeCodeForSession(code);
  }

  // Optional: handle error param from Supabase if present
  const error = url.searchParams.get("error_description");
  const dest = error ? `/login?error=${encodeURIComponent(error)}` : "/dashboard";

  return NextResponse.redirect(new URL(dest, url.origin));
}
