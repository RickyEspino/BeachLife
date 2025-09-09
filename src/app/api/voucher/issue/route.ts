import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

function randomCode(len = 10) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no confusing chars
  let s = "";
  for (let i = 0; i < len; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

export async function POST(req: Request) {
  const { merchantId } = await req.json().catch(() => ({}));
  if (!merchantId) return NextResponse.json({ ok:false, error:"NO_MERCHANT" }, { status:400 });

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

  // ensure merchant exists and active
  const { data: merchant } = await supabase.from("merchants")
    .select("id, active").eq("id", merchantId).eq("active", true).maybeSingle();
  if (!merchant) return NextResponse.json({ ok:false, error:"BAD_MERCHANT" }, { status:400 });

  // create unique code
  let tries = 0, code = "";
  while (tries < 5) {
    code = randomCode(10);
    const { data: exist } = await supabase.from("vouchers").select("id").eq("code", code).maybeSingle();
    if (!exist) break;
    tries++;
  }
  if (!code) return NextResponse.json({ ok:false, error:"CODE_GEN_FAIL" }, { status:500 });

  const { error: insErr, data: ins } = await supabase.from("vouchers").insert({
    user_id: user.id, merchant_id: merchantId, code, status: "issued"
  }).select("code, id").maybeSingle();

  if (insErr || !ins) return NextResponse.json({ ok:false, error:"ISSUE_FAIL" }, { status:500 });

  return NextResponse.json({ ok:true, code: ins.code, id: ins.id });
}
