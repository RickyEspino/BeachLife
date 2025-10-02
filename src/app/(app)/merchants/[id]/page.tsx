// src/app/(app)/merchants/[id]/page.tsx
import { notFound } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/serverClient';
import Link from 'next/link';

export const revalidate = 120; // revalidate individual merchant profile every 2 minutes

export default async function MerchantDetailPage({ params }: { params: { id: string } }) {
  const supabase = createSupabaseServerClient();
  const { data: merchant, error } = await supabase
    .from('merchants')
    .select('id, business_name, business_address, latitude, longitude, category, owner_full_name, owner_email, created_at')
    .eq('id', params.id)
    .maybeSingle();

  if (error) {
    console.error('Merchant load error', error.message);
  }
  if (!merchant) {
    notFound();
  }

  return (
    <main className="min-h-[100dvh] p-6">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{merchant.business_name}</h1>
            <p className="text-sm text-gray-600 mt-1">{merchant.business_address || 'No address on file'}</p>
            <p className="text-xs text-gray-500 mt-1">
              Category: <span className="font-medium">{merchant.category || '—'}</span>
              {merchant.latitude && merchant.longitude && (
                <> • Location: {merchant.latitude}, {merchant.longitude}</>
              )}
            </p>
            <p className="text-xs text-gray-500 mt-1">Joined: {new Date(merchant.created_at).toLocaleDateString()}</p>
          </div>
          <div className="flex flex-col gap-2">
            {merchant.latitude && merchant.longitude && (
              <Link
                href={`/map?lat=${merchant.latitude}&lng=${merchant.longitude}&z=15&focus=${merchant.id}`}
                className="rounded-lg bg-black text-white px-4 py-2 text-sm font-medium text-center hover:opacity-90"
              >
                View on Map
              </Link>
            )}
            <Link href="/merchants" className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-gray-50 text-center">Back</Link>
          </div>
        </div>

        <div className="rounded-lg border p-4">
          <h2 className="font-medium mb-2">About</h2>
          <p className="text-sm text-gray-600">
            This merchant is participating in the BeachLife local rewards & engagement program.
            More profile details and offers will appear here soon.
          </p>
        </div>

        <div className="rounded-lg border p-4 text-xs text-gray-500">
          Merchant ID: <span className="font-mono">{merchant.id}</span>
          {merchant.owner_email && <> • Owner: {merchant.owner_full_name || '—'} ({merchant.owner_email})</>}
        </div>
        <RecentActivity merchantId={merchant.id} />
      </div>
    </main>
  );
}

// Separate component (server) for recent activity (last 5 earn tokens)
async function RecentActivity({ merchantId }: { merchantId: string }) {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from('earn_tokens')
    .select('code, points, created_at, expires_at, redeemed_at')
    .eq('merchant_id', merchantId)
    .order('created_at', { ascending: false })
    .limit(5);

  if (error) {
    return (
      <div className="rounded-lg border p-4 text-sm text-red-600">
        Failed to load recent activity.
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="rounded-lg border p-4 text-sm text-gray-600">
        No recent reward issuance yet.
      </div>
    );
  }

  const mask = (code: string) => code.length <= 4 ? code : `••••${code.slice(-4)}`;

  return (
    <div className="rounded-lg border p-4">
      <h2 className="font-medium mb-3 text-sm">Recent Activity</h2>
      <ul className="space-y-2">
        {data.map(item => {
          const status = item.redeemed_at ? 'Redeemed' : (new Date(item.expires_at) < new Date() ? 'Expired' : 'Active');
          return (
            <li key={item.code} className="flex items-center justify-between text-xs">
              <div className="flex flex-col">
                <span className="font-mono">{mask(item.code)}</span>
                <span className="text-gray-500">{new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="rounded bg-gray-100 px-2 py-0.5 font-medium">{item.points} pts</span>
                <span className={status === 'Redeemed' ? 'text-green-600' : status === 'Expired' ? 'text-red-600' : 'text-gray-600'}>{status}</span>
              </div>
            </li>
          );
        })}
      </ul>
      <p className="mt-3 text-[10px] text-gray-500">Codes are masked for privacy; only last 4 characters shown.</p>
    </div>
  );
}
