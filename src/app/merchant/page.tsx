// src/app/merchant/page.tsx
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/serverClient";
import DoublePointsToggle from './toggle-double-points';

// Force dynamic rendering; avoid build-time prerender attempts that need runtime env/cookies
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function MerchantDashboardPage() {
  // Guard missing env vars to prevent build crash (show helpful screen instead)
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return (
      <main className="min-h-[100dvh] flex items-center justify-center p-6">
        <div className="max-w-md w-full rounded-xl border p-6 text-center space-y-4">
          <h1 className="text-xl font-semibold">Merchant Dashboard</h1>
          <p className="text-sm text-gray-600">Supabase environment variables are not configured.</p>
          <p className="text-xs text-left font-mono bg-gray-50 p-3 rounded">Required:<br/>NEXT_PUBLIC_SUPABASE_URL<br/>NEXT_PUBLIC_SUPABASE_ANON_KEY</p>
        </div>
      </main>
    );
  }

  const supabase = createSupabaseServerClient();

  // Require auth
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Load merchant (if none, send to onboarding)
  const { data: merchant } = await supabase
    .from("merchants")
    .select("id, business_name, business_address, latitude, longitude, category, owner_full_name, owner_email, created_at")
    .eq("owner_user_id", user.id)
    .maybeSingle();

  if (!merchant) redirect("/merchant/onboarding");

  return (
    <main className="min-h-[100dvh] flex items-center justify-center p-6">
      <div className="w-full max-w-3xl rounded-2xl border p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">{merchant.business_name}</h1>
            <p className="text-gray-600 mt-1">{merchant.business_address || "No address set"}</p>
            <p className="text-sm text-gray-500 mt-1">
              Category: <span className="font-medium">{merchant.category || "—"}</span>
              {merchant.latitude && merchant.longitude ? (
                <> • Location: {merchant.latitude}, {merchant.longitude}</>
              ) : null}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Owner: {merchant.owner_full_name || "—"} ({merchant.owner_email || "—"})
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <a
              href="/merchant/onboarding"
              className="rounded-lg border px-4 py-2 font-medium hover:bg-gray-50"
            >
              Edit details
            </a>
            {/* NEW: Register purchase button */}
            <a
              href="/merchant/register"
              className="rounded-lg bg-black text-white px-4 py-2 font-medium text-center"
            >
              Register purchase
            </a>
            <DoublePointsToggle merchantId={merchant.id} />
          </div>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg border p-4">
            <div className="text-sm text-gray-500">Merchant ID</div>
            <div className="mt-1 font-mono text-sm">{merchant.id}</div>
          </div>

          <a href="/me" className="rounded-lg border p-4 hover:bg-gray-50">
            <div className="text-sm text-gray-500">Switch to</div>
            <div className="mt-1 font-medium">User dashboard</div>
          </a>

          <form action="/auth/signout" method="post" className="rounded-lg border p-4">
            <div className="text-sm text-gray-500">Session</div>
            <button className="mt-2 w-full rounded-lg bg-black text-white px-4 py-2 font-medium">
              Sign out
            </button>
          </form>
        </div>

        <div className="mt-8">
          <div className="rounded-lg border p-4">
            <h2 className="font-medium mb-2">Dashboard</h2>
            <p className="text-sm text-gray-600">
              Coming soon: issue reward QR codes, toggle promos, view redemptions, and analytics.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
