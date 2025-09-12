// src/app/dashboard/page.tsx
import { redirect } from "next/navigation";
import { createServerClientSupabase } from "@/lib/supabase/server";
import ProgressRing from "@/components/ProgressRing";

export const dynamic = "force-dynamic"; // ensure fresh balance per request

export default async function Dashboard() {
  const supabase = createServerClientSupabase();

  // 1) Ensure we have a signed-in user
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();
  if (userErr || !user) redirect("/login");

  // 2) Try to read the display name from profiles (RLS must allow user to read own row)
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .maybeSingle();

  const name =
    profile?.display_name?.trim() ||
    user.email?.split("@")[0] ||
    "Friend";

  // 3) Points balance (safe if row doesn’t exist yet)
  const { data: bal, error: balErr } = await supabase
    .from("user_points_balance")
    .select("balance")
    .eq("user_id", user.id)
    .maybeSingle();

  const points = balErr ? 0 : bal?.balance ?? 0;
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
