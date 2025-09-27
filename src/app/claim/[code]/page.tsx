// src/app/claim/[code]/page.tsx
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/serverClient";
import AwardClient from "./winner-client";

export default async function ClaimPage({ params }: { params: { code: string } }) {
  const supabase = createSupabaseServerClient();

  // Require auth (user needs an account to receive points)
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/claim/${params.code}`)}`);

  // Load the token
  const { data: token } = await supabase
    .from("earn_tokens")
    .select("code, points, expires_at, redeemed_at, redeemed_by")
    .eq("code", params.code)
    .maybeSingle();

  if (!token) return redirect("/me"); // invalid

  const expired = new Date(token.expires_at).getTime() < Date.now();
  const alreadyClaimed = !!token.redeemed_at;

  // If already claimed by this user, just celebrate and bounce
  if (alreadyClaimed && token.redeemed_by === user.id) {
    return (
      <AwardClient points={token.points} redirectTo="/me" alreadyClaimed />
    );
  }

  // If expired or claimed by someone else, send to dashboard
  if (expired || alreadyClaimed) return redirect("/me");

  // Redeem atomically: mark token & insert points
  // 1) Mark redeemed
  const { error: upErr } = await supabase
    .from("earn_tokens")
    .update({ redeemed_by: user.id, redeemed_at: new Date().toISOString() })
    .eq("code", params.code)
    .is("redeemed_at", null);
  if (upErr) return redirect("/me"); // RLS will block if race/invalid

  // 2) Add points to ledger
  const { error: ptsErr } = await supabase.from("point_events").insert({
    user_id: user.id,
    type: "merchant_award",
    points: token.points,
    metadata: { code: token.code },
  });
  // If this fails, you could revert the redemption; simple path is to continue.

  return <AwardClient points={token.points} redirectTo="/me" />;
}
