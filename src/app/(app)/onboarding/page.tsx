import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/serverClient";
import OnboardingAvatarClient from './OnboardingAvatarClient';

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

  if (isOnboarded && !edit) {
    redirect("/now");
  }

  // Save username + mark onboarded
  async function saveProfileAction(formData: FormData) {
    "use server";
    const supabase = createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    const usernameRaw = String(formData.get("username") ?? "").trim();
    const username = usernameRaw.replace(/\s+/g, "_").slice(0, 40);

    if (!username) {
      revalidatePath("/(app)/onboarding");
      return;
    }

    await supabase
      .from("profiles")
      .upsert({
        id: user.id,
        username,
        onboarded: true,
        updated_at: new Date().toISOString(),
      });

    revalidatePath("/(app)/onboarding");
    revalidatePath("/(app)/me");
    redirect("/now");
  }

  const hasAvatar = !!profile?.avatar_url;

  // Remove avatar action (parity with Me page)
  async function removeAvatarAction() {
    "use server";
    const supa = createSupabaseServerClient();
    const { data: { user } } = await supa.auth.getUser();
    if (!user) return;
    await supa
      .from('profiles')
      .update({ avatar_url: null, updated_at: new Date().toISOString() })
      .eq('id', user.id);
    revalidatePath('/(app)/onboarding');
    revalidatePath('/(app)/me');
  }

  return (
    <main className="min-h-[100dvh] bg-gradient-to-br from-sand-50 via-white to-sand-100/70">
      <div className="mx-auto w-full max-w-3xl px-5 pt-[calc(env(safe-area-inset-top,0px)+28px)] pb-[calc(env(safe-area-inset-bottom,0px)+40px)] space-y-8">
        {/* Header / branding */}
        <header className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-black text-white grid place-items-center font-semibold shadow-sm">BL</div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">{isOnboarded ? 'Update your profile' : 'Welcome to BeachLife'} <span aria-hidden>🌴</span></h1>
              <p className="text-sm text-gray-600 mt-1 max-w-prose">Earn points, track conditions and join the community. Just a couple quick steps.</p>
            </div>
          </div>
          {/* Simple progress indicator */}
          <div className="flex items-center gap-3 text-xs font-medium text-gray-600">
            <div className="flex items-center gap-1">
              <span className={`h-2 w-2 rounded-full ${hasAvatar ? 'bg-emerald-500' : 'bg-gray-300'}`} /> Avatar
            </div>
            <span className="text-gray-300">•</span>
            <div className="flex items-center gap-1">
              <span className={`h-2 w-2 rounded-full ${profile?.username ? 'bg-emerald-500' : 'bg-gray-300'}`} /> Username
            </div>
            <span className="text-gray-300">•</span>
            <div className="flex items-center gap-1">
              <span className={`h-2 w-2 rounded-full ${(hasAvatar && profile?.username) ? 'bg-emerald-500' : 'bg-gray-300'}`} /> Complete
            </div>
          </div>
        </header>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Avatar card */}
          <div className="relative rounded-2xl border bg-white/80 backdrop-blur-sm p-5 shadow-sm space-y-5">
            <div className="flex items-center gap-4">
              {hasAvatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profile?.avatar_url ?? ''} alt="Current avatar" className="h-20 w-20 rounded-full object-cover ring-2 ring-emerald-100 border" />
              ) : (
                <div className="h-20 w-20 rounded-full border bg-gradient-to-br from-gray-100 to-gray-200 ring-1 ring-inset ring-white" />
              )}
              <div>
                <div className="font-semibold">Your avatar</div>
                <p className="text-xs text-gray-600 max-w-[18ch]">Add a photo so friends recognize you.</p>
              </div>
            </div>
            <OnboardingAvatarClient initialUrl={profile?.avatar_url || undefined} />
            <div className="flex items-center justify-between">
              {!hasAvatar && <p className="text-xs text-amber-600">Tip: square images crop best.</p>}
              {hasAvatar && (
                <form action={removeAvatarAction}>
                  <button type="submit" className="text-xs text-red-600 hover:text-red-700 underline underline-offset-4">Remove</button>
                </form>
              )}
            </div>
          </div>

          {/* Username / completion card */}
            <div className="rounded-2xl border bg-white/80 backdrop-blur-sm p-5 shadow-sm flex flex-col">
              <div className="mb-4">
                <h2 className="text-lg font-semibold leading-tight">{profile?.username ? 'Edit username' : 'Choose a username'}</h2>
                <p className="text-xs text-gray-600 mt-1">Unique, short & memorable. You can change it later.</p>
              </div>
              <form action={saveProfileAction} className="space-y-4 mt-auto" noValidate>
                <div>
                  <label className="block text-xs font-medium text-gray-600">Username</label>
                  <input
                    name="username"
                    defaultValue={profile?.username ?? ''}
                    className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/60 focus:border-emerald-500"
                    placeholder="beachfan123"
                    required
                  />
                </div>
                <button className="w-full rounded-md bg-emerald-600 hover:bg-emerald-700 text-white py-2 text-sm font-medium shadow focus:outline-none focus:ring-2 focus:ring-emerald-500/60">
                  {isOnboarded ? 'Save changes' : 'Complete onboarding'}
                </button>
              </form>
              <div className="mt-4 text-[11px] text-gray-500 flex flex-wrap items-center gap-2">
                <a href="/me" className="underline underline-offset-4 hover:no-underline">Back to dashboard</a>
                <span className="hidden sm:inline">•</span>
                <span>Claimables live in <span className="font-medium">Now</span> and <span className="font-medium">Me → Wallet</span>.</span>
              </div>
            </div>
        </div>

        {/* Completion helper */}
        <div className="rounded-xl border bg-white/70 backdrop-blur-sm p-4 text-xs text-gray-600 flex items-center gap-3">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 font-semibold">✓</span>
          <p className="leading-snug">Finish both steps to unlock your <span className="font-medium">Profile Complete</span> bonus and start earning daily points.</p>
        </div>
      </div>
    </main>
  );
}
