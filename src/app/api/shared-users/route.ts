import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/serverClient';

// GET: list currently sharing users with recent location
// Query params: maxAgeMinutes (optional, default 360) limit (default 200)
export async function GET(req: Request) {
  const supabase = createSupabaseServerClient();
  // Auth optional: if you require auth wrap below
  const url = new URL(req.url);
  const maxAgeMinutes = Math.min(parseInt(url.searchParams.get('maxAgeMinutes') || '360', 10), 1440);
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '200', 10), 500);
  const cutoff = new Date(Date.now() - maxAgeMinutes * 60_000).toISOString();

  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, avatar_url, last_lat, last_lng, last_loc_updated_at')
    .eq('share_location', true)
    .gt('last_loc_updated_at', cutoff)
    .not('last_lat', 'is', null)
    .not('last_lng', 'is', null)
    .order('last_loc_updated_at', { ascending: false })
    .limit(limit);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const users = (data || []).map(u => ({
    id: u.id,
    username: u.username,
    avatarUrl: u.avatar_url,
    latitude: u.last_lat,
    longitude: u.last_lng,
    updatedAt: u.last_loc_updated_at,
  }));

  return NextResponse.json(users);
}
