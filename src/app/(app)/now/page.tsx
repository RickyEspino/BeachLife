// src/app/(app)/now/page.tsx
import { createSupabaseServerClient } from "@/lib/supabase/serverClient";
import { RotatingBeachHeader } from "@/components/RotatingBeachHeader";
import { computeBeachScore } from "@/lib/now/beachScore";
import { buildWeatherAdvice } from "@/lib/now/weatherAdvice";
import { ConditionsBar } from "@/components/now/ConditionsBar";
import { AdviceChips } from "@/components/now/AdviceChips";
import { SunsetPanel } from "@/components/now/SunsetPanel";
import { BestWindow } from "@/components/now/BestWindow";
import { buildGreeting } from "@/lib/now/greeting";
import { estimateSunsetQuality, calculateSunset } from "@/lib/now/sunsetQuality";
import { computeBestWindow } from "@/lib/now/bestWindow";
import { getTodaysEvents } from "@/lib/events";
import { EventsList } from "@/components/now/EventsList";
import { getCurrentTidePhase, getTideAdvice } from "@/lib/tides";
import { TidePanel } from "@/components/now/TidePanel";
import { getActivitySuggestions } from "@/lib/now/activitySuggestions";
import ActivitySlideshow from "@/components/now/ActivitySlideshow";
import { calculateEnhancedStreak } from "@/lib/now/streak";
import { StreakCard } from "@/components/now/StreakCard";
import { awardPointsOnce, awardPointsOncePerDay } from "@/app/actions/points";
import Link from "next/link";
import CrabEventAlert from "@/components/now/CrabEventAlert";

export const dynamic = "force-dynamic"; // surface daily availability immediately

// Helper: get YYYY-MM-DDTHH for a given IANA timezone (hour alignment with Open-Meteo hourly slots)
function localIsoHour(timeZone: string): string {
  // sv-SE gives "YYYY-MM-DD HH:mm:ss"
  const s = new Date().toLocaleString("sv-SE", { timeZone, hour12: false });
  // convert to "YYYY-MM-DDTHH"
  return s.slice(0, 13).replace(" ", "T");
}

export default async function NowPage() {
  const supabase = createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Unauthed: simple landing w/ CTA
  if (!user) {
    return (
      <main className="min-h-[100svh] bg-gradient-to-b from-emerald-50 via-emerald-100 to-emerald-200">
        <div className="p-6">
          <div className="mx-auto max-w-2xl space-y-4">
            <h1 className="text-2xl font-semibold">Now</h1>
            <p className="text-gray-700">
              Sign in to see your beach status, get real-time advice, and claim rewards.
            </p>
            <Link
              href="/login"
              className="inline-flex rounded-lg bg-black text-white px-4 py-2 font-medium"
            >
              Sign in
            </Link>
          </div>
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

  // Enhanced streak calculation
  const { data: allPointEvents } = await supabase
    .from("point_events")
    .select("type, created_at, points")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(100);

  const streakData = calculateEnhancedStreak(allPointEvents || []);

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

  // --- Weather fetch (Open-Meteo) ---
  // Default: Myrtle Beach, SC (user base) — update later per-user/GPS
  const lat = 33.689; // Myrtle Beach approx
  const lon = -78.886;
  const tzIana = "America/New_York";
  const tzParam = encodeURIComponent(tzIana); // timezone-aware hourly alignment

  // ---- Types for external APIs (Open-Meteo) ----
  type OpenMeteoWeatherHourly = {
    time: string[];
    uv_index?: number[];
    precipitation_probability?: number[];
    temperature_2m?: number[];
    wind_speed_10m?: number[];
    cloud_cover?: number[];
    relative_humidity_2m?: number[];
  };
  type OpenMeteoWeatherCurrent = {
    temperature_2m?: number;
    wind_speed_10m?: number;
    wind_direction_10m?: number;
    relative_humidity_2m?: number;
    cloud_cover?: number;
    weather_code?: number;
  };
  type OpenMeteoWeather = {
    current?: OpenMeteoWeatherCurrent;
    hourly?: OpenMeteoWeatherHourly;
  };
  type OpenMeteoAQIHourly = { time: string[]; us_aqi: number[] };
  type OpenMeteoAQI = { hourly?: OpenMeteoAQIHourly };
  type OpenMeteoPollenHourly = {
    time: string[];
    grass_pollen?: number[];
    tree_pollen?: number[];
    weed_pollen?: number[];
  };
  type OpenMeteoPollen = { hourly?: OpenMeteoPollenHourly };

  type WeatherNow = {
    tempC: number;
    uv: number;
    precipProb: number;
    windKph: number;
    windDir: number;
    humidity: number;
    cloudCover: number;
    condition: string;
    aqi?: number;
    pollenLevel?: string;
  };

  let weather: WeatherNow | null = null;
  let hourlyData: Array<{
    time: string;
    tempC: number;
    uv: number;
    precipProb: number;
    windKph: number;
    cloudCover: number;
  }> = [];

  try {
    const weatherRes = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&timezone=${tzParam}&current=temperature_2m,apparent_temperature,weather_code,cloud_cover,precipitation,wind_speed_10m,wind_direction_10m,relative_humidity_2m&hourly=temperature_2m,uv_index,precipitation_probability,wind_speed_10m,cloud_cover,relative_humidity_2m&forecast_days=1`,
      { next: { revalidate: 600 } }
    );

    if (weatherRes.ok) {
      const data: OpenMeteoWeather = await weatherRes.json();
      const current: OpenMeteoWeatherCurrent = data.current ?? {};
      const hourly: OpenMeteoWeatherHourly | undefined = data.hourly;

      // Use exact local hour token to match Open-Meteo hourly buckets
      const hourToken = localIsoHour(tzIana); // "YYYY-MM-DDTHH"
      let uv = 0;
      let precipProb = 0;

      if (hourly && Array.isArray(hourly.time)) {
        const idx = hourly.time.findIndex((t) => t.slice(0, 13) === hourToken);

        if (idx !== -1) {
          uv = Number(hourly.uv_index?.[idx] ?? 0);
          precipProb = Number(hourly.precipitation_probability?.[idx] ?? 0);
        }

        hourlyData = hourly.time.map((time, i) => ({
          time,
          tempC: Number(hourly.temperature_2m?.[i] ?? 0),
          uv: Number(hourly.uv_index?.[i] ?? 0),
          precipProb: Number(hourly.precipitation_probability?.[i] ?? 0),
          windKph: Number(hourly.wind_speed_10m?.[i] ?? 0),
          cloudCover: Number(hourly.cloud_cover?.[i] ?? 0),
        }));
      }

      // Secondary fetch: Air Quality (US AQI)
      let aqi: number | undefined;
      try {
        const aqiRes = await fetch(
          `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&timezone=${tzParam}&hourly=us_aqi&forecast_days=1`,
          { next: { revalidate: 600 } }
        );
        if (aqiRes.ok) {
          const aqiData: OpenMeteoAQI = await aqiRes.json();
          const hTimes: string[] = aqiData.hourly?.time || [];
          const hAqi: number[] = aqiData.hourly?.us_aqi || [];
          const aIdx = hTimes.findIndex((t) => t.slice(0, 13) === hourToken);
          if (aIdx !== -1) aqi = Number(hAqi[aIdx]);
        }
      } catch {
        // ignore AQI errors
      }

      // Optional: Pollen (not always available)
      let pollenLevel: string | undefined;
      try {
        const pollenRes = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&timezone=${tzParam}&hourly=grass_pollen,tree_pollen,weed_pollen&forecast_days=1`,
          { next: { revalidate: 10800 } }
        );
        if (pollenRes.ok) {
          const pData: OpenMeteoPollen = await pollenRes.json();
          const pHour: string[] = pData.hourly?.time || [];
          const pIdx = pHour.findIndex((t) => t.slice(0, 13) === hourToken);
          if (pIdx !== -1 && pData.hourly) {
            const gp = Number(pData.hourly.grass_pollen?.[pIdx] ?? 0);
            const tp = Number(pData.hourly.tree_pollen?.[pIdx] ?? 0);
            const wp = Number(pData.hourly.weed_pollen?.[pIdx] ?? 0);
            const avg = (gp + tp + wp) / 3;
            if (!isNaN(avg)) pollenLevel = avg < 20 ? "Low" : avg < 60 ? "Moderate" : "High";
          }
        }
      } catch {
        // ignore pollen errors
      }

      weather = {
        tempC: Number(current.temperature_2m ?? 0),
        uv,
        precipProb,
        windKph: Number(current.wind_speed_10m ?? 0),
        windDir: Number(current.wind_direction_10m ?? 0),
        humidity: Number(current.relative_humidity_2m ?? 0),
        cloudCover: Number(current.cloud_cover ?? 0),
        condition: mapWeatherCode(Number(current.weather_code ?? 0)),
        aqi,
        pollenLevel,
      };
    }
  } catch {
    // swallow network errors gracefully
  }

  const beachScore =
    weather
      ? computeBeachScore({
          tempC: weather.tempC,
          uv: weather.uv,
          precipProb: weather.precipProb,
          windKph: weather.windKph,
          cloudCover: weather.cloudCover,
        })
      : null;

  const advice =
    weather
      ? buildWeatherAdvice({
          tempC: weather.tempC,
          uv: weather.uv,
          precipProb: weather.precipProb,
          windKph: weather.windKph,
          cloudCover: weather.cloudCover,
        })
      : [];

  const greeting = buildGreeting(username);

  // Calculate sunset time and quality
  const sunsetTime = calculateSunset(lat, lon);
  const sunsetQuality = weather ? estimateSunsetQuality(weather.cloudCover, sunsetTime) : null;

  // Find best window for activities
  const bestWindow = hourlyData.length > 0 ? computeBestWindow(hourlyData) : null;

  // Get today's events
  const todaysEvents = getTodaysEvents();

  // Get tide information
  const tidePhase = getCurrentTidePhase();
  const tideAdvice = getTideAdvice(tidePhase);

  // Generate activity suggestions
  const activitySuggestions = weather
    ? getActivitySuggestions(
        {
          tempC: weather.tempC,
          uv: weather.uv,
          precipProb: weather.precipProb,
          windKph: weather.windKph,
          cloudCover: weather.cloudCover,
          condition: weather.condition,
        },
        {
          hour: new Date().getHours(),
          isWeekend: new Date().getDay() === 0 || new Date().getDay() === 6,
        },
        tidePhase
      )
    : [];

  return (
    <main className="min-h-[100svh] bg-gradient-to-b from-emerald-200 via-emerald-100 to-emerald-50">
      <div className="p-6">
        <div className="mx-auto max-w-2xl space-y-5">
          <RotatingBeachHeader />

          {/* King Crab Event Alert (client / ephemeral) */}
          <CrabEventAlert />

          {/* Quick actions */}
          {(canClaimDaily || canClaimProfileComplete) && (
            <section
              className="rounded-xl border bg-white/70 backdrop-blur-sm p-4 space-y-3"
              aria-label="Quick actions"
            >
              <h2 className="font-semibold tracking-tight text-sm text-gray-700">Quick actions</h2>
              <div className="flex flex-col sm:flex-row gap-3">
                {canClaimDaily && (
                  <form action={claimDailyAction} className="group flex-1">
                    <button
                      type="submit"
                      className="w-full h-full text-left rounded-lg border bg-gradient-to-br from-emerald-50 to-white p-4 shadow-sm hover:shadow transition focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                      aria-label="Claim daily check-in bonus"
                    >
                      <div className="flex items-start gap-3">
                        <span className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-white text-xs font-semibold shadow">
                          +500
                        </span>
                        <div className="flex-1">
                          <div className="font-medium text-emerald-700">Daily check-in</div>
                          <p className="text-xs text-emerald-800/80">Tap to claim today’s boost.</p>
                        </div>
                        <span className="text-emerald-600 text-sm font-medium group-hover:translate-x-0.5 transition">
                          →
                        </span>
                      </div>
                    </button>
                  </form>
                )}
                {canClaimProfileComplete && (
                  <form action={claimProfileCompleteAction} className="group flex-1">
                    <button
                      type="submit"
                      className="w-full h-full text-left rounded-lg border bg-gradient-to-br from-blue-50 to-white p-4 shadow-sm hover:shadow transition focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                      aria-label="Claim profile completion bonus"
                    >
                      <div className="flex items-start gap-3">
                        <span className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-white text-xs font-semibold shadow">
                          +100
                        </span>
                        <div className="flex-1">
                          <div className="font-medium text-blue-700">Complete profile</div>
                          <p className="text-xs text-blue-800/80">Username + avatar bonus.</p>
                        </div>
                        <span className="text-blue-600 text-sm font-medium group-hover:translate-x-0.5 transition">
                          →
                        </span>
                      </div>
                    </button>
                  </form>
                )}
              </div>
            </section>
          )}

          {/* Greeting line */}
          <div>
            <p className="text-gray-800 text-base font-semibold">{greeting}!</p>
            <p className="text-gray-700 text-base mt-1">
              Plan the perfect beach day, check the weather, track tides, get activity suggestions,
              and organize your crew with BeachLife.
            </p>
          </div>

          {/* Highlights */}
          <section className="rounded-xl border bg-white backdrop-blur-sm p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-black tracking-tight">Today’s beach highlights</h2>
                <p className="text-sm text-gray-600">Weather & current conditions.</p>
              </div>
            </div>

            {weather && beachScore ? (
              <ConditionsBar
                tempC={weather.tempC}
                windKph={weather.windKph}
                windDirDeg={weather.windDir}
                humidity={weather.humidity}
                aqi={weather.aqi}
                pollenLevel={weather.pollenLevel}
                condition={weather.condition}
                beachScore={beachScore.score}
              />
            ) : (
              <div className="rounded-lg border border-dashed p-3 text-sm text-gray-600">
                Current conditions are loading or temporarily unavailable.
              </div>
            )}

            {advice.length > 0 && <AdviceChips advice={advice} />}

            {bestWindow && <BestWindow window={bestWindow} />}

            {sunsetQuality && <SunsetPanel sunsetTime={sunsetTime} quality={sunsetQuality} />}

            <TidePanel phase={tidePhase} advice={tideAdvice} />
          </section>

          <StreakCard streak={streakData} />

          <ActivitySlideshow activities={activitySuggestions} />

          <EventsList events={todaysEvents} showUpcoming={true} />
        </div>
      </div>
    </main>
  );
}

// Basic mapping of WMO weather codes to human phrase
function mapWeatherCode(code: number): string {
  const table: Record<number, string> = {
    0: "Clear",
    1: "Mainly Clear",
    2: "Partly Cloudy",
    3: "Overcast",
    45: "Fog",
    48: "Fog",
    51: "Drizzle",
    53: "Drizzle",
    55: "Drizzle",
    56: "Freezing Drizzle",
    57: "Freezing Drizzle",
    61: "Rain",
    63: "Rain",
    65: "Heavy Rain",
    66: "Freezing Rain",
    67: "Freezing Rain",
    71: "Snow",
    73: "Snow",
    75: "Heavy Snow",
    80: "Rain Showers",
    81: "Rain Showers",
    82: "Rain Showers",
    95: "Thunderstorm",
    96: "Thunderstorm",
    99: "Thunderstorm",
  };
  return table[code] || "Weather";
}
