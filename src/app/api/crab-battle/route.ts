import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/serverClient';

export async function POST(req: NextRequest) {
  try {
    const supabase = createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
    const body = await req.json();
    const {
      victory,
      duration_seconds,
      hits,
      crits,
      blocks,
      max_combo,
      total_damage,
      dps
    } = body || {};

    if (typeof victory !== 'boolean' || typeof duration_seconds !== 'number') {
      return NextResponse.json({ error: 'invalid_payload' }, { status: 400 });
    }

    const { error } = await supabase.from('crab_battles').insert({
      user_id: user.id,
      victory,
      duration_seconds,
      hits: hits ?? 0,
      crits: crits ?? 0,
      blocks: blocks ?? 0,
      max_combo: max_combo ?? 0,
      total_damage: total_damage ?? 0,
      dps: dps ?? 0,
    });
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error('crab-battle log error', e);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}
