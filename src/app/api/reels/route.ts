import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/serverClient';

interface Row { id: number; user_id: string; image_path: string; caption: string | null; like_count: number; created_at: string; profiles: { username: string | null; avatar_url: string | null } | null; }

// Cursor format: `${created_at.toISOString()}_${id}` for stable ordering
function parseCursor(raw: string | null): { createdAt: string; id: number } | null {
  if (!raw) return null;
  const [createdAt, idStr] = raw.split('_');
  const id = Number(idStr);
  if (!createdAt || !Number.isFinite(id)) return null;
  return { createdAt, id };
}

export async function GET(req: NextRequest) {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  const url = new URL(req.url);
  const limit = Math.min(Number(url.searchParams.get('limit') || '10'), 30);
  const cursorRaw = url.searchParams.get('cursor');
  const cursor = parseCursor(cursorRaw);

  // Build base query ordered newest first
  let query = supabase
    .from('reels')
    .select('id, user_id, image_path, caption, like_count, created_at, profiles!inner(username, avatar_url)')
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(limit + 1); // fetch one extra to detect next cursor

  if (cursor) {
    // emulate (created_at,id) < (cursor.created_at,cursor.id)
    // Supabase doesn't support tuple compare; we approximate:
    // created_at < cursor.created_at OR (created_at = cursor.created_at AND id < cursor.id)
    query = query.or(`and(created_at.lt.${cursor.createdAt}),and(created_at.eq.${cursor.createdAt},id.lt.${cursor.id})`);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  interface Row { id: number; user_id: string; image_path: string; caption: string | null; like_count: number; created_at: string; profiles: { username: string | null; avatar_url: string | null } | null; }
  const rows = (data || []) as unknown as Row[];
  const hasMore = rows.length > limit;
  const slice = rows.slice(0, limit);
  const likedIds = new Set<number>();
  if (user && slice.length) {
  const reelIds: number[] = slice.map(r => r.id);
    const { data: likesData } = await supabase
      .from('reel_likes')
      .select('reel_id')
      .eq('user_id', user.id)
  .in('reel_id', reelIds);
    if (likesData) {
      for (const l of likesData as { reel_id: number }[]) likedIds.add(l.reel_id);
    }
  }
  const items = slice.map(r => ({
    id: r.id,
    userId: r.user_id,
    username: r.profiles?.username || 'anon',
    avatarUrl: r.profiles?.avatar_url || null,
    caption: r.caption,
    imagePath: r.image_path,
    imageUrl: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/reels/${r.image_path}`,
    likeCount: r.like_count,
    liked: likedIds.has(r.id),
    createdAt: r.created_at,
  }));
  const nextCursor = hasMore ? `${items[items.length - 1].createdAt}_${items[items.length - 1].id}` : undefined;
  return NextResponse.json({ items, nextCursor });
}

export async function POST(req: NextRequest) {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }
  if (typeof body !== 'object' || body === null) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  const { imagePath, caption } = body as { imagePath?: unknown; caption?: unknown };
  if (!imagePath || typeof imagePath !== 'string') {
    return NextResponse.json({ error: 'imagePath required' }, { status: 400 });
  }
  if (caption && typeof caption !== 'string') {
    return NextResponse.json({ error: 'caption must be string' }, { status: 400 });
  }
  if (typeof caption === 'string' && caption.length > 300) {
    return NextResponse.json({ error: 'caption too long' }, { status: 400 });
  }
  const { data, error } = await supabase
    .from('reels')
    .insert({ user_id: user.id, image_path: imagePath, caption: caption || null })
    .select('id, user_id, image_path, caption, like_count, created_at, profiles!inner(username, avatar_url)')
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  interface RawRow { id: number; user_id: string; image_path: string; caption?: string | null; like_count?: number; created_at: string; profiles?: { username?: string | null; avatar_url?: string | null } | null | undefined; }
  const raw = data as unknown as RawRow;
  const row: Row = {
    id: raw.id,
    user_id: raw.user_id,
    image_path: raw.image_path,
    caption: raw.caption ?? null,
    like_count: raw.like_count ?? 0,
    created_at: raw.created_at,
    profiles: raw.profiles ? { username: raw.profiles.username ?? null, avatar_url: raw.profiles.avatar_url ?? null } : { username: null, avatar_url: null }
  };
  const item = {
    id: row.id,
    userId: row.user_id,
    username: row.profiles?.username || 'anon',
    avatarUrl: row.profiles?.avatar_url || null,
    caption: row.caption,
    imagePath: row.image_path,
    imageUrl: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/reels/${row.image_path}`,
    likeCount: row.like_count,
    liked: false,
    createdAt: row.created_at,
  };
  return NextResponse.json(item, { status: 201 });
}
