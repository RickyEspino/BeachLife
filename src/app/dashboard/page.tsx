// src/app/dashboard/page.tsx
import { redirect } from "next/navigation";
import { createServerClientSupabase } from "@/lib/supabase/server";
import ProgressRing from "@/components/ProgressRing";

export const dynamic = "force-dynamic"; // ensure fresh balance per request

export default async function Dashboard() {
  const supabase = createServerClientSupabase();
  const { data: { user }, error: userErr } = await supabase.auth.getUser();

  if (userErr || !user) redirect("/login");

  const name = user.email?.split("@")[0] || "Friend";

  // read balance view; safe even if empty
  const { data: bal, error: balErr } = await supabase
    .from("user_points_balance")
    .select("balance")
    .eq("user_id", user.id)
    .maybeSingle();

  const points = balErr ? 0 : (bal?.balance ?? 0);
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
    </div>
  );
}
