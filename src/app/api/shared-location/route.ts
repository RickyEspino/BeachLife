import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/serverClient';

// POST: update current user's sharing preference (and optionally current location)
// body: { share: boolean; lat?: number; lng?: number }
export async function POST(req: Request) {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let payload: { share?: unknown; lat?: unknown; lng?: unknown };
  try { payload = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const { share, lat, lng } = payload || {};
  if (typeof share !== 'boolean') {
    return NextResponse.json({ error: 'share boolean required' }, { status: 400 });
  }

  const updates: Record<string, unknown> = { share_location: share };
  if (share) {
    // If sharing on, allow optional coordinate update
    if (typeof lat === 'number' && typeof lng === 'number') {
      // round for privacy ~11m precision
      const round = (n: number) => Number(n.toFixed(4));
      updates.last_lat = round(lat);
      updates.last_lng = round(lng);
      updates.last_loc_updated_at = new Date().toISOString();
    }
  } else {
    // Optionally we could null coords; keep them to allow quick re-enable without map jump.
  }

  const { error } = await supabase.from('profiles').update(updates).eq('id', user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
