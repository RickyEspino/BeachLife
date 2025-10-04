import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/serverClient';
import { computeGrade, shellsFor } from '@/lib/crab/grading';

/*
  Finishes a king crab battle run.
  POST /api/crab-battle/finish
  Body: {
    run_id: number;
    victory: boolean;
    duration_seconds: number;
    hits?: number; crits?: number; blocks?: number; max_combo?: number;
    total_damage?: number; dps?: number;
  }
  Response: { ok: true, grade?: string, shells_awarded?: number }

  Anti-abuse & validation rules:
    - duration_seconds >= 4s (else reject) unless defeat (still require >=2s)
    - cannot finish same run twice
    - dps recomputed server-side (ignore client provided dps)
    - total_damage vs hits sanity: avg hit must be within [1, 400]
    - max_combo cannot exceed hits
    - blocks cannot exceed hits (broad sanity)
  Grading heuristic (simple tier):
    - Base DPS target tiers (victory only): S >= 55, A >= 40, B >= 28, else C
    - Defeat always grade C
    - Bonus small uplift if max_combo >= 12 and victory (one tier bump max)
  Shells reward (victory):
    - S: 25 + floor(dps/4)
    - A: 16 + floor(dps/5)
    - B: 10 + floor(dps/6)
    - C: 5
*/

// grading logic moved to lib/crab/grading.ts

export async function POST(req: NextRequest) {
  try {
    const supabase = createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

  const body: unknown = await req.json();
    const parsed = (body as Record<string, unknown>) || {};
    const run_id = typeof parsed.run_id === 'number' ? parsed.run_id : NaN;
    const victory = typeof parsed.victory === 'boolean' ? parsed.victory : false;
    const duration_seconds = typeof parsed.duration_seconds === 'number' ? parsed.duration_seconds : NaN;
    const hits = typeof parsed.hits === 'number' ? parsed.hits : undefined;
    const crits = typeof parsed.crits === 'number' ? parsed.crits : undefined;
    const blocks = typeof parsed.blocks === 'number' ? parsed.blocks : undefined;
    const max_combo = typeof parsed.max_combo === 'number' ? parsed.max_combo : undefined;
    const total_damage = typeof parsed.total_damage === 'number' ? parsed.total_damage : undefined;
    // client provided dps ignored

    if (typeof run_id !== 'number' || typeof victory !== 'boolean' || typeof duration_seconds !== 'number') {
      return NextResponse.json({ error: 'invalid_payload' }, { status: 400 });
    }

    if ((!victory && duration_seconds < 2) || (victory && duration_seconds < 4)) {
      return NextResponse.json({ error: 'invalid_duration' }, { status: 400 });
    }

    const h = hits ?? 0;
    const dmg = total_damage ?? 0;
    const mc = max_combo ?? 0;
    const bl = blocks ?? 0;
    const cr = crits ?? 0;

    if (mc > h || bl > h || cr > h) {
      return NextResponse.json({ error: 'invalid_stats' }, { status: 400 });
    }
    if (h > 0) {
      const avg = dmg / h;
      if (avg < 1 || avg > 400) {
        return NextResponse.json({ error: 'invalid_damage_profile' }, { status: 400 });
      }
    }

    // Ensure ownership & fetch existing state
    const { data: runRow, error: fetchErr } = await supabase
      .from('quick_battle_runs')
      .select('id, user_id, started_at, finished_at, victory')
      .eq('id', run_id)
      .single();
    if (fetchErr) throw fetchErr;
    if (!runRow || runRow.user_id !== user.id) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    if (runRow.finished_at) {
      return NextResponse.json({ error: 'already_finished' }, { status: 409 });
    }

    const realDps = Number((dmg / (duration_seconds || 1)).toFixed(2));
    const grade = computeGrade(victory, realDps, mc);
    const shells = victory ? shellsFor(grade, realDps) : 0;

    const finishedAt = new Date().toISOString();

    const { error: updateErr } = await supabase.from('quick_battle_runs')
      .update({
        finished_at: finishedAt,
        victory,
        duration_seconds,
        hits: h,
        crits: cr,
        blocks: bl,
        max_combo: mc,
        total_damage: dmg,
        dps: realDps,
        points_total: dmg, // placeholder mapping
        grade,
        shells_awarded: shells
      })
      .eq('id', run_id);
    if (updateErr) throw updateErr;

    // Aggregate metrics logging (best effort) into hourly table
    try {
      await supabase.from('quick_battle_hourly_stats').insert({
        user_id: user.id,
        hour_bucket: new Date(new Date(finishedAt).setMinutes(0,0,0)).toISOString(),
        runs: 1,
        victories: victory ? 1 : 0,
        total_damage: dmg,
        total_duration_seconds: duration_seconds,
        total_shells: shells,
        total_dps: realDps
      });
    } catch (mErr) {
      console.warn('quick_battle_hourly_stats insert failed', mErr);
    }

    // Emit RUN_FINISH event
    const { error: eventError } = await supabase.from('quick_battle_events').insert({
      run_id,
      user_id: user.id,
      event_type: 'RUN_FINISH',
      payload: { victory, duration_seconds, hits: h, crits: cr, blocks: bl, max_combo: mc, total_damage: dmg, dps: realDps, grade, shells }
    });
    if (eventError) console.warn('quick_battle_events RUN_FINISH insert failed', eventError);

    return NextResponse.json({ ok: true, grade, shells_awarded: shells });
  } catch (e) {
    console.error('crab-battle finish error', e);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}
