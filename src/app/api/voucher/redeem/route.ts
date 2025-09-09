// src/app/api/voucher/redeem/route.ts
import { NextResponse } from "next/server";
import { createServerClientSupabase } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const supabase = createServerClientSupabase();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: "NOT_AUTH" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const code: string | undefined = body?.code;
  if (!code) return NextResponse.json({ ok: false, error: "NO_CODE" }, { status: 400 });

  // find merchant for this staff user
  const { data: mu } = await supabase
    .from("merchant_users")
    .select("merchant_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!mu) return NextResponse.json({ ok: false, error: "NOT_MERCHANT" }, { status: 403 });

  // voucher must belong to that merchant and be issued
  const { data: v } = await supabase
    .from("vouchers")
    .select("id, status")
    .eq("code", code)
    .eq("merchant_id", mu.merchant_id)
    .maybeSingle();

  if (!v) return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });
  if (v.status !== "issued") return NextResponse.json({ ok: false, error: "NOT_ISSUED" }, { status: 409 });

  const { error: upErr } = await supabase
    .from("vouchers")
    .update({ status: "redeemed", redeemed_at: new Date().toISOString() })
    .eq("id", v.id);

  if (upErr) return NextResponse.json({ ok: false, error: "REDEEM_FAIL" }, { status: 500 });

  return NextResponse.json({ ok: true });
}
