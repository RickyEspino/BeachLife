// src/app/(app)/onboarding/page.tsx
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/serverClient";
import OnboardingForm from "@/components/OnboardingForm";

/** ---------- helpers ---------- */
type Props = { searchParams?: { [k: string]: string | string[] | undefined } };

function strParam(v: string | string[] | undefined): string | undefined {
  if (typeof v === "string") return v;
  if (Array.isArray(v)) return v[0];
  return undefined;
}

/** ---------- page ---------- */
export default async function OnboardingPage({ searchParams }: Props) {
  const supabase = createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarded, username, avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  const edit = strParam(searchParams?.edit) === "1";
  const isOnboarded =
    profile?.onboarded === true ||
    (!!profile?.username && profile.username.trim() !== "" && !!profile?.avatar_url);

  if (isOnboarded && !edit) {
    redirect("/now");
  }

  return (
    <main className="min-h-[100dvh] bg-gradient-to-b from-sand-50/40 to-white p-0">
      {/* Top gradient hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(90%_60%_at_10%_-10%,rgba(46,196,182,0.25),transparent),radial-gradient(80%_55%_at_110%_-20%,rgba(124,111,197,0.2),transparent)]" />
        <div className="mx-auto w-full max-w-xl px-5 pt-[calc(env(safe-area-inset-top,0px)+24px)] pb-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-black text-white grid place-items-center font-semibold">
              BL
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-600">Welcome to</p>
              <h1 className="text-2xl font-semibold leading-tight">BeachLife 🌴</h1>
            </div>
          </div>

          {/* Tiny feature chips */}
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="inline-flex items-center rounded-full border px-3 py-1 text-xs text-gray-700 bg-white/70">
              Earn points daily
            </span>
            <span className="inline-flex items-center rounded-full border px-3 py-1 text-xs text-gray-700 bg-white/70">
              Map & surf status
            </span>
            <span className="inline-flex items-center rounded-full border px-3 py-1 text-xs text-gray-700 bg-white/70">
              Community & reels
            </span>
          </div>
        </div>
      </section>

      {/* JS-free “carousel” (radio-driven) */}
      <section className="mx-auto w-full max-w-xl px-5">
        <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
          {/* slides controller */}
          <div className="p-4">
            <div className="relative">
              {/* radios (visually hidden) */}
              <input className="peer/s1 absolute opacity-0 pointer-events-none" type="radio" name="intro" id="intro-1" defaultChecked />
              <input className="peer/s2 absolute opacity-0 pointer-events-none" type="radio" name="intro" id="intro-2" />
              <input className="peer/s3 absolute opacity-0 pointer-events-none" type="radio" name="intro" id="intro-3" />

              {/* slides container */}
              <div className="relative h-36 sm:h-28">
                {/* Slide 1 */}
                <div className="absolute inset-0 grid grid-cols-[auto,1fr] items-center gap-3 transition-opacity duration-300
                                opacity-100 peer-checked/s1:opacity-100 peer-checked/s2:opacity-0 peer-checked/s3:opacity-0">
                  <div className="h-10 w-10 rounded-lg bg-[#2EC4B6]/10 text-[#2EC4B6] grid place-items-center">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                      <path d="M3 11l9-7 9 7-9 7-9-7z" stroke="currentColor" strokeWidth="1.5" />
                      <path d="M9 22V12l6-4v10" stroke="currentColor" strokeWidth="1.5" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-medium">Explore your beach in “Now”</h3>
                    <p className="text-sm text-gray-600">
                      Check surf, weather, and highlights tailored to your spot.
                    </p>
                  </div>
                </div>

                {/* Slide 2 */}
                <div className="absolute inset-0 grid grid-cols-[auto,1fr] items-center gap-3 transition-opacity duration-300
                                opacity-0 peer-checked/s2:opacity-100">
                  <div className="h-10 w-10 rounded-lg bg-[#7C6FC5]/10 text-[#7C6FC5] grid place-items-center">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                      <path d="M12 3l7 4v5c0 4.418-2.686 8.418-7 10-4.314-1.582-7-5.582-7-10V7l7-4z" stroke="currentColor" strokeWidth="1.5" />
                      <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-medium">Earn Beach Points</h3>
                    <p className="text-sm text-gray-600">
                      Daily check-ins and profile milestones unlock rewards.
                    </p>
                  </div>
                </div>

                {/* Slide 3 */}
                <div className="absolute inset-0 grid grid-cols-[auto,1fr] items-center gap-3 transition-opacity duration-300
                                opacity-0 peer-checked/s3:opacity-100">
                  <div className="h-10 w-10 rounded-lg bg-[#FF6A5A]/10 text-[#FF6A5A] grid place-items-center">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                      <path d="M4 12h16M4 12l4-4M4 12l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-medium">Share & connect</h3>
                    <p className="text-sm text-gray-600">
                      Reels and community help keep the beach vibe alive.
                    </p>
                  </div>
                </div>
              </div>

              {/* dots */}
              <div className="mt-3 flex items-center justify-center gap-2">
                <label htmlFor="intro-1" className="h-2.5 w-2.5 rounded-full bg-gray-300 cursor-pointer peer-checked/s1:bg-gray-900" />
                <label htmlFor="intro-2" className="h-2.5 w-2.5 rounded-full bg-gray-300 cursor-pointer peer-checked/s2:bg-gray-900" />
                <label htmlFor="intro-3" className="h-2.5 w-2.5 rounded-full bg-gray-300 cursor-pointer peer-checked/s3:bg-gray-900" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Onboarding form card */}
      <section className="mx-auto w-full max-w-xl px-5 pb-[calc(env(safe-area-inset-bottom,0px)+24px)] pt-5">
        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <h2 className="text-lg sm:text-xl font-semibold mb-1">
            {isOnboarded ? "Edit your profile" : "Let’s get you set up"}
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            Add your username and avatar. You can change these anytime.
          </p>

          {/* Your existing form (kept as-is) */}
          <OnboardingForm initialProfile={profile ?? {}} mode={isOnboarded ? "edit" : "create"} />

          {/* Helper links */}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm">
            <a href="/me" className="text-gray-700 underline underline-offset-4 hover:no-underline">
              Back to dashboard
            </a>
            <span className="text-gray-500">
              Tip: you’ll find claimable actions under <span className="font-medium">Now</span> and{" "}
              <span className="font-medium">Me → Wallet</span>.
            </span>
          </div>
        </div>

        {/* Mobile-friendly footer CTA (visible mostly to first-timers) */}
        {!isOnboarded && (
          <div className="mt-4 rounded-xl border bg-sand-50 p-4">
            <div className="text-sm text-gray-700">
              <span className="font-medium">Pro tip:</span> adding an avatar now will unlock your{" "}
              <span className="font-medium">Profile Complete</span> bonus.
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
