// src/app/merchant/claim/[code]/page.tsx
import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/serverClient";
import QR from "./qr-client"; // client component

function getBaseUrl() {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

export default async function MerchantClaimPage({
  params,
}: {
  params: { code: string };
}) {
  const supabase = createSupabaseServerClient();

  const { data: token } = await supabase
    .from("earn_tokens")
    .select("code, points, expires_at, redeemed_at")
    .eq("code", params.code)
    .maybeSingle();

  if (!token) notFound();

  const baseUrl = getBaseUrl();
  const claimUrl = `${baseUrl}/claim/${token.code}`;

  const expired = new Date(token.expires_at).getTime() < Date.now();
  const redeemed = !!token.redeemed_at;

  return (
    <main className="min-h-[100dvh] flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border p-6 shadow-sm text-center">
        <h1 className="text-2xl font-semibold">Customer claim</h1>
        <p className="text-gray-600 mt-1">
          Ask the customer to scan this QR with their phone camera.
        </p>

        <div className="mt-6 flex flex-col items-center gap-4">
          <QR
            data={claimUrl}
            code={token.code}
            expiresAt={token.expires_at}
            redirectAfter="/merchant/register"
          />

          <div className="text-sm text-gray-600">
            Points: <span className="font-medium">{token.points}</span>
          </div>

          <StatusBadge expired={expired} redeemed={redeemed} expiresAt={token.expires_at} />
        </div>
      </div>
    </main>
  );
}

function StatusBadge({
  expired,
  redeemed,
  expiresAt,
}: {
  expired: boolean;
  redeemed: boolean;
  expiresAt: string;
}) {
  if (redeemed)
    return (
      <div className="rounded-lg bg-emerald-50 text-emerald-700 px-3 py-2 text-sm font-medium">
        Already redeemed
      </div>
    );
  if (expired)
    return (
      <div className="rounded-lg bg-red-50 text-red-700 px-3 py-2 text-sm font-medium">
        Expired
      </div>
    );
  return (
    <div className="text-xs text-gray-500">
      QR expires at{" "}
      <time dateTime={expiresAt}>{new Date(expiresAt).toLocaleTimeString()}</time>
    </div>
  );
}
