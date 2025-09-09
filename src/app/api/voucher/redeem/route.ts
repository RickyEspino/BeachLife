import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export async function POST(req: Request) {
  const { code } = await req.json().catch(() => ({}));
  if (!code) return NextResponse.json({ ok:false, error:"NO_CODE" }, { status:400 });

  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: {
        get: (n) => cookieStore.get(n)?.value,
        set: (n,v,o) => cookieStore.set({ name:n, value:v, ...o }),
        remove: (n,o) => cookieStore.set({ name:n, value:"", ...o, maxAge:0 })
      } }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok:false, error:"NOT_AUTH" }, { status:401 });

  // find merchant for this user
  const { data: mu } = await supabase
    .from("merchant_users").select("merchant_id").eq("user_id", user.id).maybeSingle();
  if (!mu) return NextResponse.json({ ok:false, error:"NOT_MERCHANT" }, { status:403 });

  // find voucher for this merchant & code, still 'issued'
  const { data: v } = await supabase
    .from("vouchers")
    .select("id, status, user_id, merchant_id")
    .eq("code", code)
    .eq("merchant_id", mu.merchant_id)
    .maybeSingle();

  if (!v) return NextResponse.json({ ok:false, error:"NOT_FOUND" }, { status:404 });
  if (v.status !== "issued") return NextResponse.json({ ok:false, error:"NOT_ISSUED" }, { status:409 });

  // mark redeemed
  const { error: upErr } = await supabase
    .from("vouchers")
    .update({ status: "redeemed", redeemed_at: new Date().toISOString() })
    .eq("id", v.id);

  if (upErr) return NextResponse.json({ ok:false, error:"REDEEM_FAIL" }, { status:500 });

  return NextResponse.json({ ok:true });
}
