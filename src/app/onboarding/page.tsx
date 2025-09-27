// src/app/onboarding/page.tsx
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/serverClient";
import OnboardingForm from "@/components/OnboardingForm";

export default async function OnboardingPage() {
  const supabase = createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("username, avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  // Skip onboarding if already completed
  if (profile?.username) redirect("/me");

  const initialUsername = profile?.username ?? "";
  const initialAvatarUrl = profile?.avatar_url ?? "";

  return (
    <main className="min-h-[100dvh] flex items-center justify-center p-6">
      <div className="w-full max-w-xl rounded-2xl border p-6 shadow-sm">
        <h1 className="text-2xl font-semibold">Set up your profile</h1>
        <p className="mt-2 text-gray-600">
          Pick a username and upload an avatar. You can change these later.
        </p>

        <div className="mt-6">
          <OnboardingForm
            userId={user.id}
            email={user.email ?? ""}
            initialUsername={initialUsername}
            initialAvatarUrl={initialAvatarUrl}
          />
        </div>
      </div>
    </main>
  );
}
