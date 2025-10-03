import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/serverClient';

type RouteParams = { id: string };
type RouteContext = { params: Promise<RouteParams> } | { params: RouteParams };

function isPromise<T>(value: unknown): value is Promise<T> {
  return typeof value === 'object' && value !== null && 'then' in (value as object);
}

async function resolveParams(context: RouteContext): Promise<RouteParams> {
  const raw = (context as { params: RouteParams | Promise<RouteParams> }).params;
  if (isPromise<RouteParams>(raw)) {
    return await raw;
  }
  return raw;
}

export async function POST(req: NextRequest, context: RouteContext) {
  const { id } = await resolveParams(context);
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const reelId = Number(id);
  if (!Number.isFinite(reelId)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

  // Insert like (ignore conflict)
  const { error: insErr } = await supabase
    .from('reel_likes')
    .insert({ reel_id: reelId, user_id: user.id })
    .select('reel_id')
    .single();
  if (insErr && !insErr.message.includes('duplicate key')) {
    return NextResponse.json({ error: insErr.message }, { status: 500 });
  }

  // Return updated like count and liked state
  const { data: reel, error: reelErr } = await supabase
    .from('reels')
    .select('id, like_count')
    .eq('id', reelId)
    .maybeSingle();
  if (reelErr) return NextResponse.json({ error: reelErr.message }, { status: 500 });
  return NextResponse.json({ id: reelId, liked: true, likeCount: reel?.like_count ?? null });
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  const { id } = await resolveParams(context);
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const reelId = Number(id);
  if (!Number.isFinite(reelId)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

  const { error: delErr } = await supabase
    .from('reel_likes')
    .delete()
    .match({ reel_id: reelId, user_id: user.id });
  if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });

  const { data: reel, error: reelErr } = await supabase
    .from('reels')
    .select('id, like_count')
    .eq('id', reelId)
    .maybeSingle();
  if (reelErr) return NextResponse.json({ error: reelErr.message }, { status: 500 });
  return NextResponse.json({ id: reelId, liked: false, likeCount: reel?.like_count ?? null });
}
