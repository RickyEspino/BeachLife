// src/app/(app)/onboarding/page.tsx
import { redirect } from "next/navigation";
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
    .select("username, avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  const edit = strParam(searchParams?.edit) === "1";

  // Skip onboarding for existing users unless explicitly editing
  if (!edit && profile?.username) {
    redirect("/now"); // or "/me" if you prefer
  }

  return (
    <main className="min-h-[100dvh] p-6">
      <div className="mx-auto w-full max-w-xl rounded-2xl border p-6 shadow-sm">
        <h1 className="text-2xl font-semibold mb-4">
          {profile?.username ? "Edit profile" : "Let’s get you set up"}
        </h1>
        <OnboardingForm
          initialProfile={profile ?? {}}
          mode={profile?.username ? "edit" : "create"}
        />
        {/* Optional helper link back to dashboard */}
        <div className="mt-4 text-sm">
          <a href="/me" className="text-gray-700 underline hover:no-underline">
            Back to dashboard
          </a>
        </div>
      </div>
    </main>
  );
}
