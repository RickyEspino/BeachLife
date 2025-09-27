// src/app/merchant/register/create/route.ts
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/serverClient";

export async function POST(req: Request) {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const body = await req.json().catch(() => null);
  const merchantId = body?.merchantId as string | undefined;
  const amount_cents = Number(body?.amount_cents ?? 0);
  if (!merchantId || !Number.isFinite(amount_cents) || amount_cents <= 0) {
    return new NextResponse("Invalid input", { status: 400 });
  }

  // Ensure user owns this merchant
  const { data: owns } = await supabase
    .from("merchants")
    .select("id")
    .eq("id", merchantId)
    .eq("owner_user_id", user.id)
    .maybeSingle();
  if (!owns) return new NextResponse("Forbidden", { status: 403 });

  const points = Math.round(amount_cents / 100); // $1 = 1 point
  const expiresAt = new Date(Date.now() + 60 * 1000).toISOString(); // 1 minute

  const { data, error } = await supabase
    .from("earn_tokens")
    .insert({
      merchant_id: merchantId,
      created_by: user.id,
      amount_cents,
      points,
      expires_at: expiresAt,
    })
    .select("code")
    .single();

  if (error) return new NextResponse(error.message, { status: 500 });

  return NextResponse.json({ code: data.code });
}
