// src/app/dashboard/page.tsx
import { redirect } from "next/navigation";
import { createServerClientSupabase } from "@/lib/supabase/server";
import ProgressRing from "@/components/ProgressRing";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export default async function Dashboard() {
  const supabase = createServerClientSupabase();
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr || !user) redirect("/login");

  // Prefer display_name; fall back to email username; then "Friend"
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, email")
    .eq("id", user.id)
    .maybeSingle();

  const name =
    (profile?.display_name ?? "").trim() ||
    (profile?.email ?? user.email ?? "").split("@")[0] ||
    "Friend";

  // Points balance
  const { data: bal } = await supabase
    .from("user_points_balance")
    .select("balance")
    .eq("user_id", user.id)
    .maybeSingle();

  const points = bal?.balance ?? 0;
  const remaining = Math.max(500 - points, 0);

  return (
    <div className="grid gap-6">
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
    </div>
  );
}
