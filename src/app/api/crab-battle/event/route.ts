import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/serverClient';

/*
  Logs a mid-run battle event.
  POST /api/crab-battle/event
  Body: { run_id: number; event_type: string; payload?: any }
  Validation:
    - run must exist, belong to user, and be unfinished
    - event_type length <= 40
    - optional: allow only a whitelist (future enhancement)
*/

export async function POST(req: NextRequest) {
  try {
    const supabase = createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

    const body: unknown = await req.json().catch(() => ({}));
    const raw = body as Record<string, unknown>;
    const run_id = typeof raw.run_id === 'number' ? raw.run_id : NaN;
    const event_type = typeof raw.event_type === 'string' ? raw.event_type.trim().slice(0, 40) : '';
    const payload = raw.payload && typeof raw.payload === 'object' ? raw.payload : null;
    if (!run_id || !event_type) {
      return NextResponse.json({ error: 'invalid_payload' }, { status: 400 });
    }

    // Validate run ownership & unfinished
    const { data: runRow, error: runErr } = await supabase
      .from('quick_battle_runs')
      .select('id, user_id, finished_at')
      .eq('id', run_id)
      .single();
    if (runErr) throw runErr;
    if (!runRow || runRow.user_id !== user.id) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    if (runRow.finished_at) return NextResponse.json({ error: 'already_finished' }, { status: 409 });

    const { error: insertErr } = await supabase.from('quick_battle_events').insert({
      run_id,
      user_id: user.id,
      event_type,
      payload: payload || {}
    });
    if (insertErr) throw insertErr;

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('crab-battle event error', e);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}
