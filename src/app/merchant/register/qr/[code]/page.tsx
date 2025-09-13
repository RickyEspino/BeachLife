// src/app/merchant/register/qr/[code]/page.tsx
import { notFound } from "next/navigation";
import { createServerClientSupabase } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

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

  // URL the customer should visit
  const claimUrl = `/claim/${params.code}`;

  // Use a simple external QR service to avoid adding a build dep:
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

      <div className="text-sm text-white/60">
        Or share this link directly: <span className="underline break-all">{claimUrl}</span>
      </div>
    </div>
  );
}
