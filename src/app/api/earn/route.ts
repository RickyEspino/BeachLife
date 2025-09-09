import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import crypto from "crypto";
import { createServerClient } from "@supabase/ssr";

function verifyHmac(merchantId: string, points: string, nonce: string, hmac: string) {
  const secret = process.env.BEACHPOINTS_SIGNING_SECRET!;
  const payload = `${merchantId}|${points}|${nonce}`;
  const calc = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  // timing-safe compare
  return crypto.timingSafeEqual(Buffer.from(calc), Buffer.from(hmac));
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null) as { code?: string };
  if (!body?.code) return NextResponse.json({ ok: false, error: "NO_CODE" }, { status: 400 });

  // Expect bp:<merchantId>:<points>:<nonce>:<hmac>
  const parts = body.code.split(":");
  if (parts.length !== 5 || parts[0] !== "bp") {
    return NextResponse.json({ ok: false, error: "BAD_FORMAT" }, { status: 400 });
  }
  const [, merchantId, pointsStr, nonce, hmac] = parts;

  // Validate points is an integer within sane bounds
  const points = parseInt(pointsStr, 10);
  if (!Number.isFinite(points) || Math.abs(points) > 10000) {
    return NextResponse.json({ ok: false, error: "BAD_POINTS" }, { status: 400 });
  }

  // HMAC verify
  try {
    if (!verifyHmac(merchantId, pointsStr, nonce, hmac)) {
      return NextResponse.json({ ok: false, error: "BAD_SIGNATURE" }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ ok: false, error: "VERIFY_FAILED" }, { status: 400 });
  }

  // Supabase server client with cookies (user must be signed in)
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return cookieStore.get(name)?.value; },
      },
    }
  );

  const { data: { user }, error: userErr } = await supabase.auth.getUser();
  if (userErr || !user) {
    return NextResponse.json({ ok: false, error: "NOT_AUTHENTICATED" }, { status: 401 });
  }

  // Duplicate-scan protection key (hash of full QR code text)
  const qr_hash = crypto.createHash("sha256").update(body.code).digest("hex");

  // Insert ledger row
  const { error: insErr } = await supabase.from("points_ledger").insert({
    user_id: user.id,
    merchant_id: merchantId,
    delta: points,
    reason: "QR Earn",
    qr_hash,
  });

  if (insErr) {
    // If unique violation, treat as duplicate
    const isDup = /duplicate key value violates unique constraint/i.test(insErr.message);
    return NextResponse.json({ ok: false, error: isDup ? "DUPLICATE" : "INSERT_FAILED" }, { status: isDup ? 409 : 500 });
  }

  // Return new balance
  const { data: bal } = await supabase
    .from("user_points_balance")
    .select("balance")
    .eq("user_id", user.id)
    .maybeSingle();

  return NextResponse.json({ ok: true, awarded: points, balance: bal?.balance ?? points });
}
