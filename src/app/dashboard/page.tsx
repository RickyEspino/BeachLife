// src/app/dashboard/page.tsx
import { redirect } from "next/navigation";
import { createServerClientSupabase } from "@/lib/supabase/server";
import ProgressRing from "@/components/ProgressRing";

export const dynamic = "force-dynamic"; // ensure fresh balance per request

export default async function Dashboard() {
  const supabase = createServerClientSupabase();
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr || !user) redirect("/login");

  // --- Fetch profile (display_name) ---
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, email")
    .eq("id", user.id)
    .maybeSingle();

  const name =
    (profile?.display_name ?? "").trim() ||
    (profile?.email ?? user.email ?? "").split("@")[0] ||
    "Friend";

  // --- Points balance ---
  const { data: bal } = await supabase
    .from("user_points_balance")
    .select("balance")
    .eq("user_id", user.id)
    .maybeSingle();

  const points = bal?.balance ?? 0;
  const remaining = Math.max(500 - points, 0);

  const DEBUG_DASHBOARD = false; // set true if you want the debug box again

  return (
    <div className="grid gap-6">
      {DEBUG_DASHBOARD && (
        <div className="rounded-xl border border-white/10 p-4 text-xs text-white/80 bg-[var(--card,#0b0b0c)]">
          <div className="font-semibold mb-2">Debug</div>
          <div>Env Supabase URL: <code>{process.env.NEXT_PUBLIC_SUPABASE_URL}</code></div>
          <div>User ID: <code>{user.id}</code></div>
          <div>User Email: <code>{user.email}</code></div>
          <div>Profile row:</div>
          <pre className="whitespace-pre-wrap break-words">
            {JSON.stringify(profile, null, 2)}
          </pre>
        </div>
      )}

      {/* Existing points/progress card */}
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

      {/* NEW: name-only card */}
      <section className="rounded-2xl bg-[var(--card)] shadow-soft p-6">
        <div className="text-sm text-white/60">User</div>
        <div className="mt-1 text-3xl font-bold tracking-tight">{name}</div>
      </section>
    </div>
  );
}
