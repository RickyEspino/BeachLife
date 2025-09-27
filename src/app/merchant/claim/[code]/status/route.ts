// src/app/merchant/claim/[code]/status/route.ts
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/serverClient";

export async function GET(
  _req: Request,
  { params }: { params: { code: string } }
) {
  const supabase = createSupabaseServerClient();
  const { data: token } = await supabase
    .from("earn_tokens")
    .select("redeemed_at, expires_at")
    .eq("code", params.code)
    .maybeSingle();

  if (!token) return NextResponse.json({ ok: false, redeemed: false }, { status: 404 });

  const redeemed = !!token.redeemed_at;
  const expired = new Date(token.expires_at).getTime() < Date.now();

  return NextResponse.json({ ok: true, redeemed, expired });
}
