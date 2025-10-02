// src/app/(app)/merchants/page.tsx
import { createSupabaseServerClient } from "@/lib/supabase/serverClient";
import { createSupabaseServiceClient } from "@/lib/supabase/serviceClient";
import Link from "next/link";
import { headers } from "next/headers";

// Force dynamic so we always execute with current RLS/session until public read policy is set
export const dynamic = "force-dynamic";
// Optionally could use revalidate + caching once policies allow public reads

export default async function MerchantsListPage() {
  const supabase = createSupabaseServerClient();

  const initialResult = await supabase
    .from("merchants")
    .select("id, business_name, business_address, category, latitude, longitude, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  let merchants = initialResult.data;
  const error = initialResult.error;

  // Optional privileged fallback (temporary) to bypass RLS if no policy yet.
  // Guarded by server env: ENABLE_MERCHANTS_SERVICE_FALLBACK === 'true'
  if (!error && (merchants?.length ?? 0) === 0 && process.env.ENABLE_MERCHANTS_SERVICE_FALLBACK === 'true') {
    try {
      const service = createSupabaseServiceClient();
      const { data: svcData, error: svcError } = await service
        .from("merchants")
        .select("id, business_name, business_address, category, latitude, longitude, created_at")
        .order("created_at", { ascending: false })
        .limit(100);
      if (!svcError && svcData && svcData.length > 0) {
        merchants = svcData;
      }
    } catch {
      // silent; diagnostics below can hint
    }
  }
  const hdrs = await headers();
  const debug = hdrs.get("x-debug-merchants") === "1";

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
          <div className="mt-6 rounded-lg border p-6 text-sm text-gray-600 space-y-2">
            <p className="text-center">No merchants returned.</p>
            <ul className="list-disc list-inside text-xs text-gray-500 text-left">
              <li>If you recently added a merchant, ensure Row Level Security (RLS) allows public select.</li>
              <li>Create a policy such as: <code>create policy &quot;Public read merchants&quot; on merchants for select using ( true );</code></li>
              <li>Or restrict to specific columns via a view if sensitive data appears later.</li>
              <li>Confirm data exists using the Supabase SQL editor or service key.</li>
            </ul>
            {debug && (
              <pre className="mt-2 max-h-40 overflow-auto rounded bg-gray-50 p-2 text-[10px] text-gray-700 border">
{JSON.stringify({ merchants, error }, null, 2)}
              </pre>
            )}
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
