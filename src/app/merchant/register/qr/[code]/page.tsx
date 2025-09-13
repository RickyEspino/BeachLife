// src/app/merchant/register/qr/[code]/page.tsx
import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import { createServerClientSupabase } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

function getOrigin(): string {
  const h = headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? "https";
  return `${proto}://${host}`;
}

export default async function QRPage({ params }: { params: { code: string } }) {
  const supabase = createServerClientSupabase();

  // Must be signed in (merchant staff/owner)
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) redirect("/login");

  // Load token & basic status
  const { data: token } = await supabase
    .from("earn_tokens")
    .select("code, merchant_id, points, expires_at, redeemed_at")
    .eq("code", params.code)
    .maybeSingle();

  if (!token) notFound();

  const now = Date.now();
  const expiresAt = token.expires_at ? new Date(token.expires_at).getTime() : 0;
  const isExpired = expiresAt > 0 && now > expiresAt;
  const isRedeemed = !!token.redeemed_at;

  // Optional: verify this user is staff/owner of the merchant for this token
  const { data: membership } = await supabase
    .from("merchant_users")
    .select("merchant_id, role")
    .eq("user_id", auth.user.id)
    .eq("merchant_id", token.merchant_id)
    .maybeSingle();

  if (!membership) {
    return (
      <div className="max-w-md mx-auto p-6 space-y-4 text-center">
        <h1 className="text-2xl font-bold">Not authorized</h1>
        <p className="text-white/70">You are not linked to this merchant.</p>
      </div>
    );
  }

  const origin = getOrigin();
  const claimUrl = `${origin}/claim/${token.code}`;

  // Status screens
  if (isRedeemed) {
    return (
      <div className="max-w-md mx-auto p-6 space-y-4 text-center">
        <h1 className="text-2xl font-bold">Already redeemed</h1>
        <p className="text-white/70">
          This code has been redeemed. Generate a new one from the merchant console.
        </p>
        <a href="/merchant" className="rounded-xl border border-white/10 px-4 py-2 inline-block">
          Back to Merchant Console
        </a>
      </div>
    );
  }

  if (isExpired) {
    return (
      <div className="max-w-md mx-auto p-6 space-y-4 text-center">
        <h1 className="text-2xl font-bold">Expired</h1>
        <p className="text-white/70">
          This QR code expired. Generate a fresh one from the merchant console.
        </p>
        <a href="/merchant" className="rounded-xl border border-white/10 px-4 py-2 inline-block">
          Back to Merchant Console
        </a>
      </div>
    );
  }

  // Valid token → render QR (hosted generator; no client libs needed)
  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Customer QR</h1>
        <div className="text-sm text-white/60">
          Points: <span className="font-mono">{token.points}</span>
        </div>
      </div>

      <section className="rounded-2xl bg-[var(--card)] shadow-soft p-5 space-y-4 border border-white/10">
        <div className="text-sm text-white/60">
          Role: <span className="font-mono">{membership.role}</span>
        </div>

        <div className="flex items-center gap-6">
          <div className="rounded-2xl overflow-hidden border border-white/10">
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(
                claimUrl
              )}`}
              alt="QR code to redeem points"
              width={220}
              height={220}
            />
          </div>

          <div className="grid gap-2">
            <div className="text-sm text-white/60">Scan opens</div>
            <a href={claimUrl} className="underline break-all" target="_blank" rel="noreferrer">
              {claimUrl}
            </a>
            {expiresAt > 0 && (
              <div className="text-xs text-white/60">
                Expires at:{" "}
                <span className="font-mono">
                  {new Date(expiresAt).toLocaleString()}
                </span>
              </div>
            )}
            <div className="text-xs text-white/60">
              One-time use. If redeemed or expired, generate a new code.
            </div>
          </div>
        </div>

        <div className="pt-2 flex items-center gap-3">
          <a
            href="/merchant"
            className="rounded-xl border border-white/10 px-4 py-2 inline-block"
          >
            Done
          </a>
          <a
            href={`/merchant/register?merchant=${token.merchant_id}`}
            className="rounded-xl border border-white/10 px-4 py-2 inline-block"
          >
            Generate Another
          </a>
        </div>
      </section>
    </div>
  );
}
