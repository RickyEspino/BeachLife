// src/app/api/voucher/issue/route.ts
import { NextResponse } from "next/server";
import { createServerClientSupabase } from "@/lib/supabase/server";

function randomCode(len = 10) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < len; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

export async function POST(req: Request) {
  const supabase = createServerClientSupabase();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: "NOT_AUTH" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const merchantId: string | undefined = body?.merchantId;
  if (!merchantId) return NextResponse.json({ ok: false, error: "NO_MERCHANT" }, { status: 400 });

  // ensure merchant exists and is active
  const { data: merchant } = await supabase
    .from("merchants")
    .select("id, active")
    .eq("id", merchantId)
    .eq("active", true)
    .maybeSingle();
  if (!merchant) return NextResponse.json({ ok: false, error: "BAD_MERCHANT" }, { status: 400 });

  // generate unique code
  let code = "";
  for (let tries = 0; tries < 5; tries++) {
    const attempt = randomCode(10);
    const { data: exists } = await supabase
      .from("vouchers")
      .select("id")
      .eq("code", attempt)
      .maybeSingle();
    if (!exists) { code = attempt; break; }
  }
  if (!code) return NextResponse.json({ ok: false, error: "CODE_GEN_FAIL" }, { status: 500 });

  const { data: ins, error: insErr } = await supabase
    .from("vouchers")
    .insert({ user_id: user.id, merchant_id: merchantId, code, status: "issued" })
    .select("id, code")
    .maybeSingle();

  if (insErr || !ins) return NextResponse.json({ ok: false, error: "ISSUE_FAIL" }, { status: 500 });

  return NextResponse.json({ ok: true, id: ins.id, code: ins.code });
}
