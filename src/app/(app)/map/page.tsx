import MapComponent, { type MerchantPin } from '@/components/Map';
import { createSupabaseServerClient } from '@/lib/supabase/serverClient';
import MapCategoryOverlay from '@/components/MapCategoryOverlay';

export const revalidate = 120; // refresh merchant pins every 2 minutes

export default async function Page({ searchParams }: { searchParams?: Record<string, string | string[] | undefined> }) {
  const supabase = createSupabaseServerClient();
  // Load merchants
  const { data, error } = await supabase
    .from('merchants')
    .select('id, business_name, latitude, longitude, category')
    .not('latitude', 'is', null)
    .not('longitude', 'is', null)
    .limit(500);

  // Current user profile (avatar) – optional
  const { data: { user } } = await supabase.auth.getUser();
  let userAvatarUrl: string | undefined;
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('avatar_url')
      .eq('id', user.id)
      .maybeSingle();
    if (profile?.avatar_url) userAvatarUrl = profile.avatar_url as string;
  }

  // Filter & narrow type
  const merchants: MerchantPin[] = (data || [])
    .filter(m => typeof m.latitude === 'number' && typeof m.longitude === 'number')
    .map(m => ({
      id: m.id,
      name: m.business_name || 'Unnamed',
      latitude: m.latitude as number,
      longitude: m.longitude as number,
      category: m.category || undefined,
    }));

  const lat = parseFloat(String(searchParams?.lat ?? ''));
  const lng = parseFloat(String(searchParams?.lng ?? ''));
  const z = parseFloat(String(searchParams?.z ?? ''));
  const focus = typeof searchParams?.focus === 'string' ? searchParams?.focus : undefined;

  const initialView = Number.isFinite(lat) && Number.isFinite(lng) ? {
    latitude: lat,
    longitude: lng,
    zoom: Number.isFinite(z) ? z : 14
  } : undefined;

  // Derive unique categories (simple capitalization)
  const categories = Array.from(new Set(merchants.map(m => m.category).filter(Boolean))) as string[];

  // Fetch shared users (server-side). Rely on policy to filter only shared.
  let sharedUsers: Array<{ id: string; username: string; avatarUrl?: string | null; latitude: number; longitude: number; updatedAt?: string }> = [];
  try {
    const sharedRes = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/shared-users?maxAgeMinutes=180&limit=250`, { cache: 'no-store' });
    if (sharedRes.ok) {
      sharedUsers = await sharedRes.json();
    }
  } catch {
    // swallow network errors
  }

  return (
    <section className="h-full relative">
      <MapComponent
        merchants={merchants}
        loadError={error?.message}
        initialView={initialView}
        focusId={focus}
        showUserLocation
        userAvatarUrl={userAvatarUrl}
        sharedUsers={sharedUsers}
      />
      <MapCategoryOverlay categories={categories} />
    </section>
  );
}