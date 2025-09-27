// src/app/(app)/me/page.tsx
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/serverClient";
import { awardPointsOnce, awardPointsOncePerDay } from "@/app/actions/points";
import MeDashboard from "./MeDashboard";

type HistoryRow = {
  id: string;
  type: string;
  points: number;
  metadata: { reason?: string } | null;
  created_at: string;
};

function initialsFrom(username?: string, email?: string) {
  const base = username || email || "";
  const clean = base.replace(/[^a-zA-Z0-9_ ]/g, " ").trim();
  const parts = clean.split(/\s+|_/).filter(Boolean);
  const first = parts[0]?.[0] || "U";
  const second = parts[1]?.[0] || "";
  return (first + second).toUpperCase();
}

export default async function MePage() {
  const supabase = createSupabaseServerClient();

  // Require auth
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("username, avatar_url")
    .eq("id", user.id)
    .single();

  if (!profile?.username) redirect("/onboarding");

  // Total (via view, fallback to sum)
  let totalPoints = 0;
  const { data: totalRow, error: totalViewErr } = await supabase
    .from("user_point_totals")
    .select("total_points")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!totalViewErr && totalRow) {
    totalPoints = totalRow.total_points ?? 0;
  } else {
    const { data: rows } = await supabase
      .from("point_events")
      .select("points")
      .eq("user_id", user.id);
    totalPoints = (rows ?? []).reduce((s, r) => s + (r.points ?? 0), 0);
  }

  // Recent history (last 25)
  const { data: historyRaw } = await supabase
    .from("point_events")
    .select("id, type, points, metadata, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(25);

  const history = (historyRaw ?? []) as HistoryRow[];

  // --- Milestones / Claimables ---

  // One-time: Profile complete (+100) if avatar exists and not yet claimed
  const hasAvatar = !!profile.avatar_url;
  const { data: profileCompleteEvent } = await supabase
    .from("point_events")
    .select("id")
    .eq("user_id", user.id)
    .eq("type", "profile_complete")
    .maybeSingle();
  const canClaimProfileComplete = hasAvatar && !profileCompleteEvent;

  // Daily: Check-in (+500) once per day (UTC)
  const now = new Date();
  const startUtc = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0)
  );
  const startUtcIso = startUtc.toISOString();

  const { data: todayCheckin } = await supabase
    .from("point_events")
    .select("id")
    .eq("user_id", user.id)
    .eq("type", "daily_checkin")
    .gte("created_at", startUtcIso)
    .limit(1)
    .maybeSingle();

  const canClaimDaily = !todayCheckin;

  // ---------- Server Action Wrappers (void return) ----------
  async function claimProfileCompleteAction() {
    "use server";
    await awardPointsOnce("profile_complete", 100, {
      reason: "Completed profile (username + avatar)",
    });
  }

  async function claimDailyAction() {
    "use server";
    await awardPointsOncePerDay("daily_checkin", 500, { reason: "Daily check-in" });
  }
  // ---------------------------------------------------------

  // Leveling model (simple): every 1000 BP = new level
  const levelSize = 1000;
  const level = Math.floor(totalPoints / levelSize) + 1;
  const nextMilestone = (Math.floor(totalPoints / levelSize) + 1) * levelSize;
  const towardNext = totalPoints % levelSize;
  const pctToNext = Math.min(100, Math.floor((towardNext / levelSize) * 100));

  const initials = initialsFrom(profile.username, user.email || undefined);

  return (
    <main className="min-h-[100dvh] flex items-center justify-center p-6">
      <div className="w-full max-w-2xl">
        <MeDashboard
          userEmail={user.email ?? ""}
          username={profile.username}
          avatarUrl={profile.avatar_url ?? ""}
          initialsFallback={initials}
          totalPoints={totalPoints}
          level={level}
          pctToNext={pctToNext}
          nextMilestone={nextMilestone}
          canClaimDaily={canClaimDaily}
          canClaimProfileComplete={canClaimProfileComplete}
          hasAvatar={hasAvatar}
          history={history}
          claimDailyAction={claimDailyAction}
          claimProfileCompleteAction={claimProfileCompleteAction}
        />
      </div>
    </main>
  );
}
