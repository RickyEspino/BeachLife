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
      </div>
    </main>
  );
}
