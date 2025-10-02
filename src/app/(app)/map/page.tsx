import MapComponent, { type MerchantPin } from '@/components/Map';
import { createSupabaseServerClient } from '@/lib/supabase/serverClient';

export const revalidate = 120; // refresh merchant pins every 2 minutes

export default async function Page() {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from('merchants')
    .select('id, business_name, latitude, longitude, category')
    .not('latitude', 'is', null)
    .not('longitude', 'is', null)
    .limit(500);

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

  return (
    <section className="h-full">
      <MapComponent merchants={merchants} loadError={error?.message} />
    </section>
  );
}