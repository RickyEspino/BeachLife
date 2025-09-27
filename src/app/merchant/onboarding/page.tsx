// src/app/merchant/onboarding/page.tsx
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/serverClient";
import { MerchantOnboardingForm } from "@/components/MerchantOnboardingForm";

export default async function MerchantOnboardingPage() {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // If merchant already exists, go to dashboard
  const { data: merchant } = await supabase
    .from("merchants")
    .select("id, business_name")
    .eq("owner_user_id", user.id)
    .maybeSingle();
  if (merchant) redirect("/merchant");

  return (
    <main className="min-h-[100dvh] flex items-center justify-center p-6">
      <div className="w-full max-w-2xl rounded-2xl border p-6 shadow-sm">
        <h1 className="text-2xl font-semibold">Merchant onboarding</h1>
        <p className="mt-2 text-gray-600">
          Tell us about you and your business. You can edit this later.
        </p>

        <div className="mt-6">
          <MerchantOnboardingForm
            ownerUserId={user.id}
            ownerEmail={user.email ?? ""}
          />
        </div>
      </div>
    </main>
  );
}
