// src/app/merchant/register/qr/[code]/page.tsx
import { notFound } from "next/navigation";
import { createServerClientSupabase } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

// Use a configured base URL so QR works on any device.
function getBaseUrl() {
  const env = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (env) return env.replace(/\/+$/, "");
  // Fallback to your prod domain
  return "https://beach-life.vercel.app";
}

export default async function QRPage({ params }: { params: { code: string } }) {
  const supabase = createServerClientSupabase();

  // Make sure the token exists and is valid
  const { data: token } = await supabase
    .from("earn_tokens")
    .select("code, expires_at, redeemed_at")
    .eq("code", params.code)
    .maybeSingle();

  if (!token) {
    notFound();
  }

  const now = Date.now();
  const expiresAtMs = token.expires_at ? new Date(token.expires_at).getTime() : 0;
  const isExpired = expiresAtMs <= now;
  const isRedeemed = !!token.redeemed_at;

  if (isExpired || isRedeemed) {
    return (
      <div className="max-w-md mx-auto p-6 text-center space-y-3">
        <h1 className="text-2xl font-bold">QR not available</h1>
        <p className="text-white/70">
          {isRedeemed ? "This code was already redeemed." : "This code has expired."}
        </p>
        <a href="/merchant/register" className="inline-block mt-2 rounded-xl border border-white/15 px-4 py-2">
          Create a new code
        </a>
      </div>
    );
  }

  const base = getBaseUrl();
  const claimUrl = `${base}/claim/${encodeURIComponent(token.code)}`;

  // Generate QR via a hosted image endpoint (no extra npm deps)
  // You can switch to any QR provider you prefer.
  const qrPngUrl = `https://api.qrserver.com/v1/create-qr-code/?size=360x360&data=${encodeURIComponent(
    claimUrl
  )}`;

  const secondsLeft = Math.max(0, Math.floor((expiresAtMs - now) / 1000));

  return (
    <div className="max-w-md mx-auto p-6 text-center space-y-5">
      <h1 className="text-2xl font-bold">Have the customer scan this</h1>

      <div className="mx-auto rounded-2xl bg-white p-3 w-fit shadow-soft">
        <img
          src={qrPngUrl}
          alt="One-time QR code"
          className="block w-[360px] h-[360px]"
          width={360}
          height={360}
        />
      </div>

      <div className="text-white/70">
        Expires in <span className="font-semibold">{secondsLeft}</span> seconds.
      </div>

      <div className="text-sm text-white/60 break-all">
        Scanning opens: <span className="font-mono">{claimUrl}</span>
      </div>

      {/* After it expires, kick back to the register page */}
      <meta httpEquiv="refresh" content={`${secondsLeft};url=/merchant/register`} />
    </div>
  );
}
