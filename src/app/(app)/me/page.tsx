// src/app/me/page.tsx
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/serverClient";
import { awardPointsOnce, awardPointsOncePerDay } from "@/app/actions/points";

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

  // Profile (now also fetching role)
  const { data: profile } = await supabase
    .from("profiles")
    .select("username, avatar_url, role")
    .eq("id", user.id)
    .single();

  if (!profile?.username) redirect("/onboarding");

  // Total (try view first, fallback to sum)
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
  const { data: history } = await supabase
    .from("point_events")
    .select("id, type, points, metadata, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(25);

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
  const startUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
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

  // ---------- Server Action Wrappers (return void) ----------
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

  const initials = initialsFrom(profile.username, user.email || undefined);
  const isAdmin = profile.role === "admin";

  return (
    <main className="min-h-[100dvh] flex items-center justify-center p-6">
      <div className="w-full max-w-2xl rounded-2xl border p-6 shadow-sm">
        {/* Header */}
        <div className="flex items-center gap-4">
          {profile.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.avatar_url}
              alt={`${profile.username} avatar`}
              className="h-16 w-16 rounded-full object-cover border"
            />
          ) : (
            <div className="h-16 w-16 rounded-full border bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
              <span className="text-lg font-semibold text-gray-700">{initials}</span>
            </div>
          )}
          <div>
            <h1 className="text-2xl font-semibold">Welcome, {profile.username} 👋</h1>
            <p className="text-gray-600 mt-1">{user.email}</p>
          </div>
        </div>

        {/* Points summary + quick links */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-lg border p-4">
            <div className="text-sm text-gray-500">Total Points</div>
            <div className="mt-1 text-3xl font-semibold">{totalPoints.toLocaleString()}</div>
          </div>

          <a
            href="/onboarding"
            className="rounded-lg border p-4 hover:bg-gray-50 transition"
          >
            <div className="text-sm text-gray-500">Profile</div>
            <div className="mt-1 font-medium">Edit profile</div>
          </a>

          <form action="/auth/signout" method="post" className="rounded-lg border p-4">
            <div className="text-sm text-gray-500">Session</div>
            <button className="mt-2 w-full rounded-lg bg-black text-white px-4 py-2 font-medium">
              Sign out
            </button>
          </form>
        </div>

        {/* Admin button (only for admins) */}
        {isAdmin && (
          <div className="mt-4">
            <a
              href="/admin"
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 text-white px-4 py-2 font-medium hover:bg-indigo-700 transition"
            >
              {/* Simple shield icon */}
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M12 3l7 4v5c0 4.418-2.686 8.418-7 10-4.314-1.582-7-5.582-7-10V7l7-4z" stroke="currentColor" strokeWidth="1.5" fill="currentColor" className="opacity-90"/>
                <path d="M9 12l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Admin
            </a>
          </div>
        )}

        {/* Claimables */}
        <div className="mt-6 grid gap-4">
          {/* Daily check-in */}
          <div className="rounded-xl border p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full border flex items-center justify-center">
                <span className="font-semibold">+500</span>
              </div>
              <div>
                <div className="font-medium">Daily check-in</div>
                <div className="text-sm text-gray-600">
                  Come back every day to earn 500 points.
                </div>
              </div>
            </div>

            {canClaimDaily ? (
              <form action={claimDailyAction}>
                <button className="rounded-lg bg-black text-white px-4 py-2 font-medium">
                  Claim +500
                </button>
              </form>
            ) : (
              <div className="rounded-lg border px-4 py-2 font-medium text-center">
                Already claimed today
              </div>
            )}
          </div>

          {/* Profile complete one-time */}
          <div className="rounded-xl border p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full border flex items-center justify-center">
                <span className="font-semibold">+100</span>
              </div>
              <div>
                <div className="font-medium">Profile complete</div>
                <div className="text-sm text-gray-600">
                  Add an avatar and a username to earn a one-time bonus.
                </div>
              </div>
            </div>

            {canClaimProfileComplete ? (
              <form action={claimProfileCompleteAction}>
                <button className="rounded-lg bg-black text-white px-4 py-2 font-medium">
                  Claim +100
                </button>
              </form>
            ) : (
              <a
                href="/onboarding"
                className="rounded-lg border px-4 py-2 font-medium text-center"
              >
                {hasAvatar ? "Already claimed" : "Finish profile"}
              </a>
            )}
          </div>
        </div>

        {/* Points history */}
        <div className="mt-8">
          <h2 className="text-lg font-semibold mb-3">Points history</h2>
          <div className="rounded-lg border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr className="text-left">
                  <th className="px-4 py-2">Date</th>
                  <th className="px-4 py-2">Type</th>
                  <th className="px-4 py-2">Details</th>
                  <th className="px-4 py-2 text-right">Points</th>
                </tr>
              </thead>
              <tbody>
                {(history ?? []).length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-gray-500">
                      No point activity yet.
                    </td>
                  </tr>
                ) : (
                  (history ?? []).map((row) => (
                    <tr key={row.id} className="border-t">
                      <td className="px-4 py-2">
                        {new Date(row.created_at).toLocaleString()}
                      </td>
                      <td className="px-4 py-2 capitalize">
                        {row.type.replace(/_/g, " ")}
                      </td>
                      <td className="px-4 py-2 text-gray-600">
                        {row.metadata?.reason ?? "—"}
                      </td>
                      <td className="px-4 py-2 text-right font-medium">
                        {row.points > 0 ? `+${row.points}` : row.points}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-gray-500">
            Tip: award points anywhere by inserting rows into <code>point_events</code>.
          </p>
        </div>
      </div>
    </main>
  );
}
