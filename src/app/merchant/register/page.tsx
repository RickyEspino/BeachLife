// src/app/merchant/register/page.tsx
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/serverClient";
import RegisterForm from "./register-form";

export default async function MerchantRegisterPage() {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Make sure this user has a merchant profile
  const { data: merchant } = await supabase
    .from("merchants")
    .select("id, business_name")
    .eq("owner_user_id", user.id)
    .maybeSingle();

  if (!merchant) redirect("/merchant/onboarding");

  return (
    <main className="min-h-[100dvh] flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border p-6 shadow-sm">
        <h1 className="text-2xl font-semibold">{merchant.business_name}</h1>
        <p className="text-gray-600 mt-1">Register a purchase to award points.</p>

        <div className="mt-6">
          <RegisterForm merchantId={merchant.id} />
        </div>
      </div>
    </main>
  );
}
