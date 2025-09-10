// src/app/api/admin/merchants/quick-edit/route.ts
import { NextResponse } from "next/server";
import { createServerClientSupabase } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const supabase = createServerClientSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, message: "Not signed in." }, { status: 401 });

  const { data: prof } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (!prof || prof.role !== "admin") {
    return NextResponse.json({ ok: false, message: "Forbidden." }, { status: 403 });
  }

  const body = await req.json();
  const { id, name, points_per_scan, active } = body as {
    id: string; name?: string; points_per_scan?: number; active?: boolean;
  };

  if (!id) return NextResponse.json({ ok: false, message: "Missing merchant id." }, { status: 400 });

  const { error } = await supabase
    .from("merchants")
    .update({
      ...(name !== undefined ? { name } : {}),
      ...(points_per_scan !== undefined ? { points_per_scan } : {}),
      ...(active !== undefined ? { active } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) return NextResponse.json({ ok: false, message: "Update failed." }, { status: 500 });
  return NextResponse.json({ ok: true, message: "Saved." });
}
