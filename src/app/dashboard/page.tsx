// src/app/dashboard/page.tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerClientSupabase } from "@/lib/supabase/server";
import ProgressRing from "@/components/ProgressRing";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export default async function Dashboard() {
  const supabase = createServerClientSupabase();

  // 1) Auth
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();
  if (userErr || !user) redirect("/login");

  // 2) Profile name (prefer display_name)
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, email")
    .eq("id", user.id)
    .maybeSingle();

  const name =
    (profile?.display_name ?? "").trim() ||
    (profile?.email ?? user.email ?? "").split("@")[0] ||
    "Friend";

  // 3) Points balance
  const { data: bal } = await supabase
    .from("user_points_balance")
    .select("balance")
    .eq("user_id", user.id)
    .maybeSingle();

  const points = bal?.balance ?? 0;
  const remaining = Math.max(500 - points, 0);

  // 4) Does user belong to any merchant (owner/staff)?
  // We only need a boolean, so select minimal fields and limit 1.
  const { data: membership } = await supabase
    .from("merchant_users")
    .select("merchant_id, role")
    .eq("user_id", user.id)
    .in("role", ["owner", "staff"])
    .limit(1);

  const canAccessMerchantConsole = !!(membership && membership.length > 0);

  return (
    <div className="grid gap-6">
      {/* Welcome / progress */}
      <section className="rounded-2xl bg-[var(--card)] shadow-soft p-5 flex items-center justify-between">
        <div>
          <div className="text-sm text-white/60">Welcome back</div>
          <h2 className="text-2xl font-bold">Hey, {name} 🌊</h2>
          <p className="text-white/70 mt-2">
            You’re {remaining} points away from your next reward.
          </p>
        </div>
        <div className="shrink-0">
          <ProgressRing value={points} />
        </div>
      </section>

      {/* Name-only card */}
      <section className="rounded-2xl bg-[var(--card)] shadow-soft p-6">
        <div className="text-sm text-white/60">User</div>
        <div className="mt-1 text-3xl font-bold tracking-tight">{name}</div>
      </section>

      {/* Merchant Console link (only for owners/staff) */}
      {canAccessMerchantConsole && (
        <section className="rounded-2xl bg-[var(--card)] shadow-soft p-6 flex items-center justify-between">
          <div>
            <div className="text-sm text-white/60">Merchant tools</div>
            <h3 className="text-xl font-semibold mt-1">Merchant Console</h3>
            <p className="text-white/70 mt-1">
              Manage your merchant locations, staff, and rewards.
            </p>
          </div>
          <Link
            href="/merchant"
            className="rounded-xl bg-seafoam px-4 py-2 font-semibold"
          >
            Open Console
          </Link>
        </section>
      )}
    </div>
  );
}
