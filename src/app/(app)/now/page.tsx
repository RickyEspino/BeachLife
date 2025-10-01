// src/app/(app)/now/page.tsx
import { createSupabaseServerClient } from "@/lib/supabase/serverClient";
import { Claimables } from "@/components/Claima        </header>

        {/* Optional friendly greeting */};
import { RotatingBeachHeader } from "@/components/RotatingBeachHeader";
import { computeBeachScore } from "@/lib/now/beachScore";
import { buildWeatherAdvice } from "@/lib/now/weatherAdvice";
import { ConditionsBar } from "@/components/now/ConditionsBar";
import { AdviceChips } from "@/components/now/AdviceChips";
import { buildGreeting } from "@/lib/now/greeting";
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

  // ---- server actions (must return void) ----
  async function claimDailyAction(_formData: FormData): Promise<void> {
    "use server";
    await awardPointsOncePerDay("daily_checkin", 500, { reason: "Daily check-in" });
  }

  async function claimProfileCompleteAction(_formData: FormData): Promise<void> {
    "use server";
    await awardPointsOnce("profile_complete", 100, {
      reason: "Completed profile (username + avatar)",
    });
  }
  // ------------------------------------------

  // --- Weather fetch (simple public API: Open-Meteo) ---
  // Default location placeholder (could be user-configurable later)
  const lat = 34.0195; // Santa Monica approx
  const lon = -118.4912;
  let weather: { tempC: number; uv: number; precipProb: number; windKph: number; cloudCover: number; condition: string } | null = null;
  try {
    const weatherRes = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,apparent_temperature,weather_code,cloud_cover,precipitation,wind_speed_10m&hourly=uv_index,precipitation_probability&forecast_days=1`,
      { next: { revalidate: 600 } }
    );
    if (weatherRes.ok) {
      const data = await weatherRes.json();
      const current = data.current;
      const hourly = data.hourly;
      // Find current hour index for uv / precip prob
      let uv = 0;
      let precipProb = 0;
      if (hourly?.time && Array.isArray(hourly.time)) {
        const nowIso = new Date().toISOString().slice(0, 13); // yyyy-mm-ddThh
        const idx = hourly.time.findIndex((t: string) => t.startsWith(nowIso));
        if (idx !== -1) {
          uv = Number(hourly.uv_index?.[idx] ?? 0);
          precipProb = Number(hourly.precipitation_probability?.[idx] ?? 0);
        }
      }
      weather = {
        tempC: Number(current.temperature_2m),
        uv,
        precipProb,
        windKph: Number(current.wind_speed_10m ?? 0),
        cloudCover: Number(current.cloud_cover ?? 0),
        condition: mapWeatherCode(current.weather_code),
      };
    }
  } catch (e) {
    // swallow network errors gracefully
  }

  const beachScore = weather ? computeBeachScore({
    tempC: weather.tempC,
    uv: weather.uv,
    precipProb: weather.precipProb,
    windKph: weather.windKph,
    cloudCover: weather.cloudCover,
  }) : null;
  const advice = weather ? buildWeatherAdvice({
    tempC: weather.tempC,
    uv: weather.uv,
    precipProb: weather.precipProb,
    windKph: weather.windKph,
    cloudCover: weather.cloudCover,
  }) : [];
  const greeting = buildGreeting(username);

  return (
    <main className="p-6">
      <div className="mx-auto max-w-2xl space-y-5">
        <RotatingBeachHeader />

        {/* Greeting line */}
        <p className="text-gray-700 text-sm">
          {greeting}{username ? "!" : "!"} {weather ? (
            <>
              {weather.tempC.toFixed(0)}°C, {weather.condition.toLowerCase()} · UV {weather.uv}
              {advice.length > 0 && "+"}
            </>
          ) : (
            <span className="text-gray-500">Loading conditions…</span>
          )}
        </p>

        {weather && beachScore && (
          <ConditionsBar
            tempC={weather.tempC}
            uv={weather.uv}
            windKph={weather.windKph}
            condition={weather.condition}
            beachScore={beachScore.score}
          />
        )}

        {advice.length > 0 && <AdviceChips advice={advice} />}

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
        <section className="rounded-xl border p-4 space-y-1">
          <h2 className="font-semibold">Today’s beach highlights</h2>
          <p className="text-sm text-gray-600">Events, surf, and extended forecast coming soon.</p>
          {!weather && (
            <p className="text-xs text-gray-500">Weather data unavailable right now.</p>
          )}
        </section>
      </div>
    </main>
  );
}

// Basic mapping of WMO weather codes to human phrase
function mapWeatherCode(code: number): string {
  const table: Record<number, string> = {
    0: "Clear", 1: "Mainly Clear", 2: "Partly Cloudy", 3: "Overcast",
    45: "Fog", 48: "Fog", 51: "Drizzle", 53: "Drizzle", 55: "Drizzle",
    56: "Freezing Drizzle", 57: "Freezing Drizzle", 61: "Rain", 63: "Rain", 65: "Heavy Rain",
    66: "Freezing Rain", 67: "Freezing Rain", 71: "Snow", 73: "Snow", 75: "Heavy Snow",
    80: "Rain Showers", 81: "Rain Showers", 82: "Rain Showers", 95: "Thunderstorm",
    96: "Thunderstorm", 99: "Thunderstorm",
  };
  return table[code] || "Weather";
}
