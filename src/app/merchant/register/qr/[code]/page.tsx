// src/app/merchant/register/qr/[code]/page.tsx
import dynamic from "next/dynamic";
import { createServerClientSupabase } from "@/lib/supabase/server";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

const QRClient = dynamic(() => import("./qr-client"), { ssr: false });

export default async function QRPage({ params }: { params: { code: string } }) {
  const supabase = createServerClientSupabase();
  const { data: token } = await supabase
    .from("earn_tokens")
    .select("code, expires_at, points, merchants(name)")
    .eq("code", params.code)
    .maybeSingle();

  if (!token) notFound();

  const claimUrl = `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://beachlife.vercel.app"}/claim/${token.code}`;
  const expiresAt = new Date(token.expires_at).getTime();

  return (
    <div className="max-w-md mx-auto p-6 space-y-4 text-center">
      <h1 className="text-2xl font-bold">Have the customer scan this code</h1>
      <p className="text-white/70">
        {token.merchants?.name ? `${token.merchants.name}: ` : ""}{token.points} points
      </p>

      <QRClient data={claimUrl} expiresAt={expiresAt} />

      <p className="text-sm text-white/60">Valid for 2 minutes. After that, generate a new code.</p>
    </div>
  );
}
