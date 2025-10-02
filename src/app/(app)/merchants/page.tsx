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
            const created = m.created_at ? new Date(m.created_at) : null;
            return (
              <li key={m.id} className="p-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div className="space-y-1">
                  <Link href={`/merchants/${m.id}`} className="font-medium hover:underline">
                    {m.business_name || 'Unnamed'}
                  </Link>
                  <div className="flex flex-wrap items-center gap-1 text-xs text-gray-600">
                    {m.category && (
                      <span className="rounded bg-gray-100 px-2 py-0.5 font-medium text-gray-700">
                        {m.category}
                      </span>
                    )}
                    {m.business_address && <span>{m.business_address}</span>}
                    {hasLocation && (
                      <span className="text-gray-400">({m.latitude}, {m.longitude})</span>
                    )}
                    {created && (
                      <span className="text-gray-400">• Joined {created.toLocaleDateString()}</span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 text-xs">
                  <Link href={`/merchants/${m.id}`} className="rounded border px-2 py-1 hover:bg-gray-50">
                    Details
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
