import { redirect } from "next/navigation";
import { createServerClientSupabase } from "@/lib/supabase/server";
import RedeemForm from "./RedeemForm";

export const dynamic = "force-dynamic";

type Scan = { delta: number; reason: string | null; created_at: string };
type Redemption = { code: string; redeemed_at: string | null };

export default async function MerchantConsole() {
  const supabase = createServerClientSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // which merchant does this user belong to?
  const { data: mu } = await supabase
    .from("merchant_users")
    .select("merchant_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!mu) {
    return (
      <div className="p-6 text-white/70">
        Your account is not linked to a merchant.
      </div>
    );
  }

  // last 50 scans today
  const start = new Date(); start.setHours(0, 0, 0, 0);
  const { data: scans } = await supabase
    .from("points_ledger")
    .select("delta, reason, created_at")
    .eq("merchant_id", mu.merchant_id)
    .gte("created_at", start.toISOString())
    .order("created_at", { ascending: false })
    .limit(50) as { data: Scan[] | null };

  // last 20 voucher redemptions
  const { data: redemptions } = await supabase
    .from("vouchers")
    .select("code, redeemed_at")
    .eq("merchant_id", mu.merchant_id)
    .eq("status", "redeemed")
    .order("redeemed_at", { ascending: false })
    .limit(20) as { data: Redemption[] | null };

  return (
    <div className="grid gap-6 p-6">
      <h1 className="text-2xl font-bold">Merchant Console</h1>

      <section className="rounded-2xl bg-[var(--card)] p-4 shadow-soft border border-white/10">
        <h3 className="font-semibold mb-3">Redeem a Voucher</h3>
        <RedeemForm />
      </section>

      <section className="rounded-2xl bg-[var(--card)] p-4 shadow-soft border border-white/10">
        <h3 className="font-semibold mb-3">Today’s Scans</h3>
        {!scans?.length ? (
          <p className="text-white/60">No scans yet today.</p>
        ) : (
          <ul className="divide-y divide-white/5">
            {scans.map((s, i) => (
              <li key={i} className="py-2 flex items-center justify-between">
                <span className="text-sm">{s.reason || "QR Earn"}</span>
                <span className="text-sm text-white/70">
                  {new Date(s.created_at).toLocaleTimeString()}
                </span>
                <span className="text-green-400 font-semibold">+{s.delta}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl bg-[var(--card)] p-4 shadow-soft border border-white/10">
        <h3 className="font-semibold mb-3">Recent Redemptions</h3>
        {!redemptions?.length ? (
          <p className="text-white/60">No redemptions yet.</p>
        ) : (
          <ul className="divide-y divide-white/5">
            {redemptions.map((r, i) => (
              <li key={i} className="py-2 flex items-center justify-between">
                <span className="font-mono tracking-wider">{r.code}</span>
                <span className="text-white/70">
                  {r.redeemed_at ? new Date(r.redeemed_at).toLocaleString() : "—"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
