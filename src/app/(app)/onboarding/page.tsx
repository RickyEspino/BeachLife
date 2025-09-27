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

  // If user already finished onboarding AND not explicitly editing, go to /now
  if (profile?.username && !edit) {
    redirect("/now");
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

        <div className="mt-4 text-sm">
          <a href="/now" className="text-gray-700 underline hover:no-underline">
            Back to Now
          </a>
        </div>
      </div>
    </main>
  );
}
