import { createSupabaseServerClient } from "@/lib/supabase/serverClient";
import { Claimables } from "@/components/Claimables";
import { awardPointsOnce, awardPointsOncePerDay } from "@/app/actions/points";
import Link from "next/link";

export const dynamic = "force-dynamic"; // surface daily availability immediately

export default async function NowPage() {
  const supabase = createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Unauthed: simple landing w/ CTA
  if (!user) {
    return (
      <main className="p-6">
        <div className="mx-auto max-w-2xl space-y-4">
          <h1 className="text-2xl font-semibold">Now</h1>
          <p className="text-gray-600">Sign in to see your beach status and claim rewards.</p>
          <Link
            href="/login"
            className="inline-flex rounded-lg bg-black text-white px-4 py-2 font-medium"
          >
            Sign in
          </Link>
        </div>
      </main>
    );
  }

  // Read profile (username + avatar => for compact helper message)
  const { data: profile } = await supabase
    .from("profiles")
    .select("username, avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  const username = profile?.username ?? "";
  const hasAvatar = !!profile?.avatar_url;

  // DAILY CLAIM CHECK (UTC)
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

  // PROFILE COMPLETE (one-time)
  const { data: profileCompleteEvent } = await supabase
    .from("point_events")
    .select("id")
    .eq("user_id", user.id)
    .eq("type", "profile_complete")
    .maybeSingle();

  const canClaimProfileComplete = hasAvatar && !profileCompleteEvent;

  // ---- server actions (void) ----
  async function claimDailyAction(_: FormData) {
    "use server";
    await awardPointsOncePerDay("daily_checkin", 500, { reason: "Daily check-in" });
  }

  async function claimProfileCompleteAction(_: FormData) {
    "use server";
    await awardPointsOnce("profile_complete", 100, { reason: "Completed profile (username + avatar)" });
  }
  // -------------------------------

  return (
    <main className="p-6">
      <div className="mx-auto max-w-2xl space-y-4">
        <header className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Now</h1>
          <Link href="/me" className="text-sm font-medium underline underline-offset-4">
            Go to Me
          </Link>
        </header>

        {/* Optional friendly greeting */}
        {username ? (
          <p className="text-gray-700">Hey {username}! Here’s what you can do right now:</p>
        ) : (
          <p className="text-gray-700">
            Welcome! Finish your profile to unlock bonuses and personalized features.
          </p>
        )}

        {/* Compact claimables: only render when there's an action to take */}
        <Claimables
          compact
          canClaimDaily={canClaimDaily}
          canClaimProfileComplete={canClaimProfileComplete}
          hasAvatar={hasAvatar}
          claimDailyAction={claimDailyAction}
          claimProfileCompleteAction={claimProfileCompleteAction}
        />

        {/* Other “Now” content can go here… */}
        <section className="rounded-xl border p-4">
          <h2 className="font-semibold">Today’s beach highlights</h2>
          <p className="text-sm text-gray-600 mt-1">Surf, weather, events, and more — coming soon.</p>
        </section>
      </div>
    </main>
  );
}
