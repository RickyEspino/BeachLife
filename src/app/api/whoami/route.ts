// src/app/api/whoami/route.ts
import { NextResponse } from "next/server";
import { createServerClientSupabase } from "@/lib/supabase/server";

export async function GET() {
  const supabase = createServerClientSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  let profile: any = null;
  if (user) {
    const { data } = await supabase
      .from("profiles")
      .select("id, email, role, updated_at")
      .eq("id", user.id)
      .maybeSingle();
    profile = data ?? null;
  }

  return NextResponse.json({ user, profile });
}
