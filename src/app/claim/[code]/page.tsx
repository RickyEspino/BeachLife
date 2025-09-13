// src/app/claim/[code]/page.tsx
import { redirect } from "next/navigation";
import { createServerClientSupabase } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

type RedeemResult = {
  ok: boolean;
  message: string | null;
  points: number | null;
  merchant_id: string | null;
};

export default async function ClaimPage({ params }: { params: { code: string } }) {
  const supabase = createServerClientSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Force login if needed, then return to same URL
  if (!user) {
    const here = `/claim/${params.code}`;
    redirect(`/login?redirect_to=${encodeURIComponent(here)}`);
  }

  // Try to redeem
  const { data, error } = await supabase
    .rpc("redeem_earn_token", { p_code: params.code, p_user: user.id })
    .maybeSingle();

  const row = (data ?? null) as RedeemResult | null;

  const ok = row?.ok === true && !error;
  const msg = ok
    ? `Added ${row?.points ?? 0} points!`
    : (row?.message ?? error?.message ?? "Could not redeem.");

  return (
    <div className="max-w-md mx-auto p-6 space-y-4 text-center">
      <h1 className="text-2xl font-bold">{ok ? "Success 🎉" : "Sorry 😕"}</h1>
      <p className={`text-white/80 ${ok ? "" : "text-red-300"}`}>{msg}</p>

      <div className="text-sm text-white/60">
        You can close this tab. Heading back to your dashboard…
      </div>

      {/* Let user see the result, then bounce */}
      <meta httpEquiv="refresh" content="3;url=/dashboard" />
    </div>
  );
}
