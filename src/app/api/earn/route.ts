// src/app/api/earn/route.ts
import { NextResponse } from "next/server";
import { createServerClientSupabase } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const supabase = createServerClientSupabase();

  // must be signed in
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "NOT_AUTH" }, { status: 401 });
  }

  // parse payload from the scanner
  const body = await req.json().catch(() => null as unknown as { payload?: any });
  const payload = body?.payload ?? null;
  if (!payload) {
    return NextResponse.json({ ok: false, error: "NO_PAYLOAD" }, { status: 400 });
  }

  // Extract fields (support a couple of shapes)
  const merchantId: string | null =
    payload.merchantId ?? payload.merchant_id ?? null;

  const deltaRaw =
    typeof payload.points === "number"
      ? payload.points
      : typeof payload.delta === "number"
      ? payload.delta
      : 0;

  const delta = Math.trunc(deltaRaw);
  const qrHash: string | null = payload.hash ?? payload.qr_hash ?? null;
  const reason: string = payload.reason ?? "QR Earn";

  if (!delta || delta <= 0) {
    return NextResponse.json({ ok: false, error: "BAD_DELTA" }, { status: 400 });
  }

  // Insert; unique (user_id, qr_hash) index protects against re-scan
  const { error } = await supabase.from("points_ledger").insert({
    user_id: user.id,
    merchant_id: merchantId,
    delta,
    reason,
    qr_hash: qrHash,
  });

  if (error) {
    // 23505 = unique violation (duplicate)
    if ((error as any).code === "23505") {
      return NextResponse.json({ ok: false, error: "DUPLICATE" }, { status: 409 });
    }
    return NextResponse.json({ ok: false, error: "INSERT_FAIL" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
