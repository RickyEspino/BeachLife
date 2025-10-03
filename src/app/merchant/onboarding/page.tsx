// src/app/merchant/onboarding/page.tsx
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/serverClient";
import { MerchantOnboardingForm } from "@/components/MerchantOnboardingForm";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function MerchantOnboardingPage() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return (
      <main className="min-h-[100dvh] flex items-center justify-center p-6">
        <div className="max-w-md w-full rounded-xl border p-6 text-center space-y-4">
          <h1 className="text-xl font-semibold">Merchant Onboarding</h1>
          <p className="text-sm text-gray-600">Supabase environment variables are not configured.</p>
          <p className="text-xs text-left font-mono bg-gray-50 p-3 rounded">Required:<br/>NEXT_PUBLIC_SUPABASE_URL<br/>NEXT_PUBLIC_SUPABASE_ANON_KEY</p>
        </div>
      </main>
    );
  }

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
