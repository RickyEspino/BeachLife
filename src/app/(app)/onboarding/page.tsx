// src/app/(app)/onboarding/page.tsx
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/serverClient";
import OnboardingForm from "@/components/OnboardingForm";

type Props = { searchParams?: { [k: string]: string | string[] | undefined } };

function strParam(v: string | string[] | undefined): string | undefined {
  if (typeof v === "string") return v;
  if (Array.isArray(v)) return v[0];
  return undefined;
}

export default async function OnboardingPage({ searchParams }: Props) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, username, avatar_url, onboarded")
    .eq("id", user.id)
    .maybeSingle();

  const edit = strParam(searchParams?.edit) === "1";
  const isOnboarded =
    profile?.onboarded === true ||
    (!!profile?.username && profile.username.trim() !== "" && !!profile?.avatar_url);

  // Already-onboarded users default to /now unless explicitly editing
  if (isOnboarded && !edit) {
    redirect("/now");
  }

  /* ----------------- server actions: avatar ----------------- */
  async function uploadAvatarAction(formData: FormData) {
    "use server";
    const supabase = createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const file = formData.get("avatar") as File | null;
    if (!file || file.size === 0) return;

    // Basic type/size guardrails (optional)
    if (file.size > 5 * 1024 * 1024) {
      // ~5MB cap
      return;
    }

    const ext = (file.name.split(".").pop() || "png").toLowerCase();
    const path = `avatars/${user.id}/avatar-${Date.now()}.${ext}`;

    // Upload to public bucket "avatars" (ensure it exists & public)
    const { error: upErr } = await supabase
      .storage
      .from("avatars")
      .upload(path, file, { upsert: true, contentType: file.type || "image/png" });

    if (upErr) return;

    // Get public URL
    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
    const publicUrl = urlData?.publicUrl;

    if (publicUrl) {
      await supabase
        .from("profiles")
        .upsert({
          id: user.id,
          avatar_url: publicUrl,
          updated_at: new Date().toISOString(),
        });

      // Revalidate onboarding + me
      revalidatePath("/(app)/onboarding");
      revalidatePath("/(app)/me");
    }
  }

  async function removeAvatarAction() {
    "use server";
    const supabase = createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from("profiles")
      .update({ avatar_url: null, updated_at: new Date().toISOString() })
      .eq("id", user.id);

    revalidatePath("/(app)/onboarding");
    revalidatePath("/(app)/me");
  }
  /* ---------------------------------------------------------- */

  const hasAvatar = !!profile?.avatar_url;

  return (
    <main className="min-h-[100dvh] bg-gradient-to-b from-sand-50/40 to-white">
      {/* Hero / Welcome */}
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

          {/* Chips */}
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

      {/* Avatar uploader — same UX vibe as Me → Profile */}
      <section className="mx-auto w-full max-w-xl px-5">
        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            {hasAvatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile?.avatar_url ?? ""}
                alt="Current avatar"
                className="h-16 w-16 rounded-full object-cover border"
              />
            ) : (
              <div className="h-16 w-16 rounded-full border bg-gradient-to-br from-gray-100 to-gray-200" />
            )}

            <div className="flex-1">
              <div className="font-medium">Your avatar</div>
              <p className="text-sm text-gray-600">
                Upload a square image (PNG or JPG) for best results.
              </p>

              <div className="mt-3 flex flex-wrap items-center gap-3">
                <form action={uploadAvatarAction} className="flex items-center gap-2">
                  <input
                    type="file"
                    name="avatar"
                    accept="image/*"
                    className="block w-44 text-sm file:mr-3 file:py-2 file:px-3 file:rounded-md file:border file:border-gray-200 file:bg-white file:text-sm file:font-medium hover:file:bg-gray-50"
                    required
                  />
                  <button
                    type="submit"
                    className="rounded-lg bg-black text-white px-4 py-2 text-sm font-medium"
                  >
                    Upload
                  </button>
                </form>

                {hasAvatar && (
                  <form action={removeAvatarAction}>
                    <button
                      type="submit"
                      className="text-sm text-red-600 hover:text-red-700 underline underline-offset-4"
                    >
                      Remove
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>

          {!hasAvatar && (
            <div className="mt-3 rounded-md bg-sand-50 p-3 text-sm text-gray-700">
              Tip: adding an avatar now helps unlock your <span className="font-medium">Profile Complete</span> bonus.
            </div>
          )}
        </div>
      </section>

      {/* Slideshow + Form */}
      <section className="mx-auto w-full max-w-xl px-5 pt-5 pb-[calc(env(safe-area-inset-bottom,0px)+24px)]">
        {/* Simple JS-free slideshow */}
        <div className="rounded-2xl border bg-white shadow-sm overflow-hidden mb-4">
          <div className="p-4">
            <div className="relative">
              <input className="peer/s1 absolute opacity-0 pointer-events-none" type="radio" name="intro" id="intro-1" defaultChecked />
              <input className="peer/s2 absolute opacity-0 pointer-events-none" type="radio" name="intro" id="intro-2" />
              <input className="peer/s3 absolute opacity-0 pointer-events-none" type="radio" name="intro" id="intro-3" />

              <div className="relative h-32 sm:h-24">
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
                    <p className="text-sm text-gray-600">Surf, weather, and highlights at a glance.</p>
                  </div>
                </div>

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
                    <p className="text-sm text-gray-600">Daily check-ins & milestones = rewards.</p>
                  </div>
                </div>

                <div className="absolute inset-0 grid grid-cols-[auto,1fr] items-center gap-3 transition-opacity duration-300
                                opacity-0 peer-checked/s3:opacity-100">
                  <div className="h-10 w-10 rounded-lg bg-[#FF6A5A]/10 text-[#FF6A5A] grid place-items-center">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                      <path d="M4 12h16M4 12l4-4M4 12l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-medium">Share & connect</h3>
                    <p className="text-sm text-gray-600">Reels + community keep the vibe alive.</p>
                  </div>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-center gap-2">
                <label htmlFor="intro-1" className="h-2.5 w-2.5 rounded-full bg-gray-300 cursor-pointer peer-checked/s1:bg-gray-900" />
                <label htmlFor="intro-2" className="h-2.5 w-2.5 rounded-full bg-gray-300 cursor-pointer peer-checked/s2:bg-gray-900" />
                <label htmlFor="intro-3" className="h-2.5 w-2.5 rounded-full bg-gray-300 cursor-pointer peer-checked/s3:bg-gray-900" />
              </div>
            </div>
          </div>
        </div>

        {/* Your existing onboarding form */}
        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <h2 className="text-lg sm:text-xl font-semibold mb-1">
            {isOnboarded ? "Edit your profile" : "Let’s get you set up"}
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            Add your username and avatar. You can change these anytime.
          </p>

          <OnboardingForm initialProfile={profile ?? {}} mode={isOnboarded ? "edit" : "create"} />

          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm">
            <a href="/me" className="text-gray-700 underline underline-offset-4 hover:no-underline">
              Back to dashboard
            </a>
            <span className="text-gray-500">
              Claimables live in <span className="font-medium">Now</span> and{" "}
              <span className="font-medium">Me → Wallet</span>.
            </span>
          </div>
        </div>
      </section>
    </main>
  );
}
