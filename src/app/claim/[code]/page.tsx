// src/app/claim/[code]/page.tsx
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/serverClient";
import AwardClient from "./winner-client";

export default async function ClaimPage({ params }: { params: { code: string } }) {
  const supabase = createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/claim/${params.code}`)}`);

  const { data: token } = await supabase
    .from("earn_tokens")
    .select("code, points, expires_at, redeemed_at, redeemed_by")
    .eq("code", params.code)
    .maybeSingle();

  if (!token) return redirect("/me");

  const expired = new Date(token.expires_at).getTime() < Date.now();
  const alreadyClaimed = !!token.redeemed_at;

  if (alreadyClaimed && token.redeemed_by === user.id) {
    return <AwardClient points={token.points} redirectTo="/me" alreadyClaimed />;
  }

  if (expired || alreadyClaimed) return redirect("/me");

  // Mark redeemed if still open
  const { error: upErr } = await supabase
    .from("earn_tokens")
    .update({ redeemed_by: user.id, redeemed_at: new Date().toISOString() })
    .eq("code", params.code)
    .is("redeemed_at", null);
  if (upErr) return redirect("/me");

  // Insert point event (ignore response var to avoid unused var lint)
  await supabase.from("point_events").insert({
    user_id: user.id,
    type: "merchant_award",
    points: token.points,
    metadata: { code: token.code },
  });

  return <AwardClient points={token.points} redirectTo="/me" />;
}
