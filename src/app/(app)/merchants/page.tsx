// src/app/(app)/merchants/page.tsx
import { createSupabaseServerClient } from "@/lib/supabase/serverClient";
import Link from "next/link";

export const revalidate = 60; // cache list for 1 minute

export default async function MerchantsListPage() {
  const supabase = createSupabaseServerClient();

  const { data: merchants, error } = await supabase
    .from("merchants")
    .select("id, business_name, business_address, category, latitude, longitude, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <main className="min-h-[100dvh] p-6">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-2xl font-semibold tracking-tight">Merchants</h1>
        <p className="text-sm text-gray-600 mt-1">Local businesses participating in BeachLife rewards.</p>

        {error && (
          <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            Failed to load merchants: {error.message}
          </div>
        )}

        {!error && (!merchants || merchants.length === 0) && (
          <div className="mt-6 rounded-lg border p-6 text-center text-sm text-gray-600">
            No merchants yet.
          </div>
        )}

        <ul className="mt-6 divide-y rounded-lg border bg-white">
          {merchants?.map((m) => {
            const hasLocation = m.latitude && m.longitude;
            return (
              <li key={m.id} className="p-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="font-medium">{m.business_name}</div>
                  <div className="text-xs text-gray-500">
                    {m.category || "—"}
                    {m.business_address ? ` • ${m.business_address}` : ""}
                    {hasLocation ? ` • (${m.latitude}, ${m.longitude})` : ""}
                  </div>
                </div>
                <div className="flex gap-2 text-xs mt-2 sm:mt-0">
                  <Link href={`/merchant/claim/${m.id}`} className="rounded border px-2 py-1 hover:bg-gray-50">
                    View
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </main>
  );
}
