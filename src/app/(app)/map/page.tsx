import MapComponent, { type MerchantPin } from '@/components/Map';
import { createSupabaseServerClient } from '@/lib/supabase/serverClient';

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

  // Load current user profile for avatar (ignore errors silently)
  const { data: { user } } = await supabase.auth.getUser();
  let avatarUrl: string | undefined;
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('avatar_url')
      .eq('id', user.id)
      .maybeSingle();
    avatarUrl = profile?.avatar_url || undefined;
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

  return (
    <section className="h-full">
      <MapComponent
        merchants={merchants}
        loadError={error?.message}
        initialView={initialView}
        focusId={focus}
        userAvatarUrl={avatarUrl}
        showUserLocation
      />
    </section>
  );
}