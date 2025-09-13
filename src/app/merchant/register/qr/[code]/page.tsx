// src/app/merchant/register/qr/[code]/page.tsx
import { notFound } from "next/navigation";
import { headers as nextHeaders } from "next/headers";
import { createServerClientSupabase } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

// Resolve current origin (Vercel + local dev)
async function getOrigin(): Promise<string> {
  // If you prefer, set NEXT_PUBLIC_SITE_URL in your env and return that.
  const h = await nextHeaders();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export default async function QRPage({ params }: { params: { code: string } }) {
  const supabase = createServerClientSupabase();

  // Validate token exists & not redeemed/expired
  const { data: t } = await supabase
    .from("earn_tokens")
    .select("code, expires_at, redeemed_at")
    .eq("code", params.code)
    .maybeSingle();

  if (!t) notFound();

  const expired = t.expires_at && new Date(t.expires_at).getTime() < Date.now();
  const used = Boolean(t.redeemed_at);
  if (expired || used) notFound();

  const origin = await getOrigin();
  const claimPath = `/claim/${params.code}`;
  const claimUrl = `${origin}${claimPath}`;

  // Simple external QR service — no extra deps needed
  const qrPng = `https://api.qrserver.com/v1/create-qr-code/?size=256x256&data=${encodeURIComponent(
    claimUrl
  )}`;

  return (
    <div className="max-w-md mx-auto p-6 space-y-4 text-center">
      <h1 className="text-2xl font-bold">Show this QR to the customer</h1>
      <p className="text-white/70 text-sm">
        Expires about 2 minutes after it was created. One-time use only.
      </p>

      <div className="flex justify-center">
        <img
          src={qrPng}
          alt="QR Code"
          width={256}
          height={256}
          className="rounded-xl bg-white p-2"
        />
      </div>

      <div className="text-sm text-white/70 space-y-1">
        <div>
          If their camera doesn’t auto-open, share this link directly:&nbsp;
          <a href={claimUrl} className="underline break-all" target="_blank" rel="noopener noreferrer">
            {claimUrl}
          </a>
        </div>
        <div className="text-white/50">Path only: {claimPath}</div>
      </div>
    </div>
  );
}
