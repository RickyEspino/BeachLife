import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
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

  // Profile (+ role for admin button)
  const { data: profile } = await supabase
    .from("profiles")
    .select("username, avatar_url, role")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || !profile.username) redirect("/onboarding");

  // Total points (via view, fallback to sum)
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

  // --- Claimables ---
  const hasAvatar = !!profile.avatar_url;

  // Profile complete (+100) one-time
  const { data: profileCompleteEvent } = await supabase
    .from("point_events")
    .select("id")
    .eq("user_id", user.id)
    .eq("type", "profile_complete")
    .maybeSingle();
  const canClaimProfileComplete = hasAvatar && !profileCompleteEvent;

  // Daily check-in (+500) once per UTC day
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

  // ---------- Server Actions (void) ----------
  async function claimProfileCompleteAction() {
    "use server";
    await awardPointsOnce("profile_complete", 100, {
      reason: "Completed profile (username + avatar)",
    });
    revalidatePath("/me");
  }

  async function claimDailyAction() {
    "use server";
    await awardPointsOncePerDay("daily_checkin", 500, { reason: "Daily check-in" });
    revalidatePath("/me");
  }

  // Avatar actions
  async function updateAvatarAction(formData: FormData) {
    "use server";
    try {
      const supa = createSupabaseServerClient();
      const {
        data: { user },
      } = await supa.auth.getUser();
      if (!user) return;

      const file = formData.get("avatar") as File | null;
      if (!file || file.size === 0) return;

      // Basic size/type guard
      if (file.size > 5 * 1024 * 1024) {
        // Optional: log / show toast via client state; we simply bail here
        return;
      }

      const ext = (file.name.split(".").pop() || "png").toLowerCase();
      const path = `avatars/${user.id}/avatar-${Date.now()}.${ext}`;

      const { error: upErr } = await supa
        .storage
        .from("avatars") // <-- ensure this bucket exists
        .upload(path, file, {
          upsert: true,
          contentType: file.type || "image/png",
        });

      if (upErr) {
        // Optional: console.error(upErr);
        return;
      }

      const { data: urlData } = supa.storage.from("avatars").getPublicUrl(path);
      const publicUrl = urlData?.publicUrl;
      if (!publicUrl) return;

      await supa
        .from("profiles")
        .upsert({ id: user.id, avatar_url: publicUrl, updated_at: new Date().toISOString() });

      revalidatePath("/me");
    } catch {
      // swallow to avoid client crash; you can log server-side if desired
    }
  }

  async function removeAvatarAction() {
    "use server";
    try {
      const supa = createSupabaseServerClient();
      const {
        data: { user },
      } = await supa.auth.getUser();
      if (!user) return;

      await supa
        .from("profiles")
        .update({ avatar_url: null, updated_at: new Date().toISOString() })
        .eq("id", user.id);

      revalidatePath("/me");
    } catch {
      // swallow
    }
  }
  // ------------------------------------------

  // Level model (every 1000 BP)
  const levelSize = 1000;
  const level = Math.floor(totalPoints / levelSize) + 1;
  const nextMilestone = (Math.floor(totalPoints / levelSize) + 1) * levelSize;
  const towardNext = totalPoints % levelSize;
  const pctToNext = Math.min(100, Math.floor((towardNext / levelSize) * 100));

  const initials = initialsFrom(profile.username, user.email || undefined);
  const isAdmin = profile.role === "admin";

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
          // Admin
          isAdmin={isAdmin}
          adminHref="/admin"
          // Avatar actions
          updateAvatarAction={updateAvatarAction}
          removeAvatarAction={removeAvatarAction}
        />
      </div>
    </main>
  );
}
