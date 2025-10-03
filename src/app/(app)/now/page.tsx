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

  // --- Weather fetch (simple public API: Open-Meteo) ---
  // Default location placeholder (could be user-configurable later)
  const lat = 34.0195; // Santa Monica approx
  const lon = -118.4912;
  let weather: { tempC: number; uv: number; precipProb: number; windKph: number; windDir: number; humidity: number; cloudCover: number; condition: string; aqi?: number; pollenLevel?: string } | null = null;
  let hourlyData: Array<{ time: string; tempC: number; uv: number; precipProb: number; windKph: number; cloudCover: number }> = [];
  
  try {
    const weatherRes = await fetch(
  `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,apparent_temperature,weather_code,cloud_cover,precipitation,wind_speed_10m,wind_direction_10m,relative_humidity_2m&hourly=temperature_2m,uv_index,precipitation_probability,wind_speed_10m,cloud_cover,relative_humidity_2m&forecast_days=1`,
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

        // Build hourly data for best window calculation
        hourlyData = hourly.time.map((time: string, i: number) => ({
          time,
          tempC: Number(hourly.temperature_2m?.[i] ?? 0),
          uv: Number(hourly.uv_index?.[i] ?? 0),
          precipProb: Number(hourly.precipitation_probability?.[i] ?? 0),
          windKph: Number(hourly.wind_speed_10m?.[i] ?? 0),
          cloudCover: Number(hourly.cloud_cover?.[i] ?? 0),
        }));
      }
      
      // Secondary fetch: Air Quality (US AQI) + optional pollen (graceful fallback)
      let aqi: number | undefined;
      let pollenLevel: string | undefined;
      try {
        const aqiRes = await fetch(`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&hourly=us_aqi&forecast_days=1`, { next: { revalidate: 600 } });
        if (aqiRes.ok) {
          const aqiData = await aqiRes.json();
            const hTimes: string[] = aqiData.hourly?.time || [];
            const hAqi: number[] = aqiData.hourly?.us_aqi || [];
            const nowIso2 = new Date().toISOString().slice(0,13);
            const aIdx = hTimes.findIndex(t => t.startsWith(nowIso2));
            if (aIdx !== -1) aqi = Number(hAqi[aIdx]);
        }
      } catch {}
      try {
        // Pollen attempt (may not be supported for all locales)
        const pollenRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=grass_pollen,tree_pollen,weed_pollen&forecast_days=1`, { next: { revalidate: 10800 } });
        if (pollenRes.ok) {
          const pData = await pollenRes.json();
          const pHour = pData.hourly?.time || [];
          const nowIso3 = new Date().toISOString().slice(0,13);
          const pIdx = pHour.findIndex((t: string) => t.startsWith(nowIso3));
          if (pIdx !== -1) {
            const gp = Number(pData.hourly?.grass_pollen?.[pIdx] ?? 0);
            const tp = Number(pData.hourly?.tree_pollen?.[pIdx] ?? 0);
            const wp = Number(pData.hourly?.weed_pollen?.[pIdx] ?? 0);
            const avg = (gp + tp + wp) / 3;
            if (!isNaN(avg)) {
              pollenLevel = avg < 20 ? 'Low' : avg < 60 ? 'Moderate' : 'High';
            }
          }
        }
      } catch {}

      weather = {
        tempC: Number(current.temperature_2m),
        uv,
        precipProb,
        windKph: Number(current.wind_speed_10m ?? 0),
        windDir: Number(current.wind_direction_10m ?? 0),
        humidity: Number(current.relative_humidity_2m ?? 0),
        cloudCover: Number(current.cloud_cover ?? 0),
        condition: mapWeatherCode(current.weather_code),
        aqi,
        pollenLevel,
      };
    }
  } catch {
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
  const activitySuggestions = weather ? getActivitySuggestions(
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
  ) : [];

  return (
    <main className="p-6">
      <div className="mx-auto max-w-2xl space-y-5">
        <RotatingBeachHeader />

        {/* Goals / actions moved above highlights */}
        {(canClaimDaily || canClaimProfileComplete) && (
          <section className="rounded-xl border p-4 space-y-3 bg-white/70 backdrop-blur-sm">
            <h2 className="font-semibold tracking-tight text-sm text-gray-700">Quick actions</h2>
            <div className="flex flex-col sm:flex-row gap-3">
              {canClaimDaily && (
                <form action={claimDailyAction} className="group flex-1">
                  <button type="submit" className="w-full h-full text-left rounded-lg border bg-gradient-to-br from-emerald-50 to-white p-4 shadow-sm hover:shadow transition focus:outline-none focus:ring-2 focus:ring-emerald-500/50">
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-white text-xs font-semibold shadow">+500</span>
                      <div className="flex-1">
                        <div className="font-medium text-emerald-700">Daily check-in</div>
                        <p className="text-xs text-emerald-800/80">Tap to claim today’s boost.</p>
                      </div>
                      <span className="text-emerald-600 text-sm font-medium group-hover:translate-x-0.5 transition">→</span>
                    </div>
                  </button>
                </form>
              )}
              {canClaimProfileComplete && (
                <form action={claimProfileCompleteAction} className="group flex-1">
                  <button type="submit" className="w-full h-full text-left rounded-lg border bg-gradient-to-br from-blue-50 to-white p-4 shadow-sm hover:shadow transition focus:outline-none focus:ring-2 focus:ring-blue-500/50">
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-white text-xs font-semibold shadow">+100</span>
                      <div className="flex-1">
                        <div className="font-medium text-blue-700">Complete profile</div>
                        <p className="text-xs text-blue-800/80">Username + avatar bonus.</p>
                      </div>
                      <span className="text-blue-600 text-sm font-medium group-hover:translate-x-0.5 transition">→</span>
                    </div>
                  </button>
                </form>
              )}
            </div>
          </section>
        )}

        {/* Greeting line */}
        <div>
          <p className="text-gray-800 text-base font-semibold">{greeting}{username ? "!" : "!"}</p>
          <p className="text-gray-600 text-sm mt-1">Plan the perfect beach day, check the weather, track tides, get activities suggestions and orginize your crew with BeachLife.</p>
        </div>

                {/* Other “Now” content can go here… */}
  <section className="rounded-xl border p-4 space-y-3 bg-white/70 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold tracking-tight">Today’s beach highlights</h2>
              <p className="text-sm text-gray-600">Quick wins & current conditions.</p>
            </div>
          </div>

          {/* Goals / actions row */}
          {(canClaimDaily || canClaimProfileComplete) && (
            <div className="flex flex-col sm:flex-row gap-3">
              {canClaimDaily && (
                <form action={claimDailyAction} className="group flex-1">
                  <button type="submit" className="w-full h-full text-left rounded-lg border bg-gradient-to-br from-emerald-50 to-white p-4 shadow-sm hover:shadow transition focus:outline-none focus:ring-2 focus:ring-emerald-500/50">
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-white text-xs font-semibold shadow">+500</span>
                      <div className="flex-1">
                        <div className="font-medium text-emerald-700">Daily check-in</div>
                        <p className="text-xs text-emerald-800/80">Tap to claim today’s boost.</p>
                      </div>
                      <span className="text-emerald-600 text-sm font-medium group-hover:translate-x-0.5 transition">→</span>
                    </div>
                  </button>
                </form>
              )}
              {canClaimProfileComplete && (
                <form action={claimProfileCompleteAction} className="group flex-1">
                  <button type="submit" className="w-full h-full text-left rounded-lg border bg-gradient-to-br from-blue-50 to-white p-4 shadow-sm hover:shadow transition focus:outline-none focus:ring-2 focus:ring-blue-500/50">
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-white text-xs font-semibold shadow">+100</span>
                      <div className="flex-1">
                        <div className="font-medium text-blue-700">Complete profile</div>
                        <p className="text-xs text-blue-800/80">Username + avatar bonus.</p>
                      </div>
                      <span className="text-blue-600 text-sm font-medium group-hover:translate-x-0.5 transition">→</span>
                    </div>
                  </button>
                </form>
              )}
            </div>
          )}
        </section>

        {weather && beachScore && (
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
        )}

        {advice.length > 0 && <AdviceChips advice={advice} />}

        {bestWindow && <BestWindow window={bestWindow} />}

        {sunsetQuality && (
          <SunsetPanel sunsetTime={sunsetTime} quality={sunsetQuality} />
        )}

        <TidePanel phase={tidePhase} advice={tideAdvice} />

        <StreakCard streak={streakData} />

        <ActivitySlideshow activities={activitySuggestions} />

        <EventsList events={todaysEvents} showUpcoming={true} />

        {/* Removed old compact claimables (moved to highlights section) */}


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
