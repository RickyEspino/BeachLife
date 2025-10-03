import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/serverClient';

/*
  Starts a king crab battle run.
  POST /api/crab-battle/start
  Body: { seed?: number }
  Response: { run_id: number }
  Rate limiting strategy (layered):
    1. In-memory (best-effort) short-circuit: max 3 starts in 20s per user (non-distributed safeguard)
    2. DB authoritative checks:
       - Max 30 runs in trailing 24h (king_crab)
       - Min 3s since last unfinished or just-started run (anti-spam)
*/

declare global { var __crabRecentStarts: Record<string, number[]> | undefined; }

// In-memory tracker (process local). For multi-instance deployments use Redis or Supabase RLS+function based limits.
const g = globalThis as typeof globalThis & { __crabRecentStarts?: Record<string, number[]> };
const recentStarts: Record<string, number[]> = g.__crabRecentStarts || {};
if (!g.__crabRecentStarts) g.__crabRecentStarts = recentStarts;

export async function POST(req: NextRequest) {
  try {
    const supabase = createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
  const body: unknown = await req.json().catch(() => ({}));
  const raw = body as Record<string, unknown>;
  const seed = typeof raw.seed === 'number' ? raw.seed : undefined;

    // (1) In-memory rapid-fire check
    const now = Date.now();
    const arr = recentStarts[user.id] = (recentStarts[user.id] || []).filter(ts => now - ts < 20000);
    if (arr.length >= 3) {
      return NextResponse.json({ error: 'rate_limited', reason: 'too_many_recent_starts' }, { status: 429 });
    }
    arr.push(now);

    // (2a) 24h volume check
    const sinceIso = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    const { data: lastDayRuns, error: dayErr } = await supabase
      .from('quick_battle_runs')
      .select('id, started_at, finished_at')
      .eq('battle_type', 'king_crab')
      .eq('user_id', user.id)
      .gte('started_at', sinceIso);
    if (dayErr) throw dayErr;
    if ((lastDayRuns?.length || 0) >= 30) {
      return NextResponse.json({ error: 'rate_limited', reason: 'daily_cap_reached' }, { status: 429 });
    }

    // (2b) Cooldown since last start (unfinished or just started). Allow overlap only if previous finished >3s ago.
    const last = lastDayRuns?.sort((a, b) => new Date(b.started_at!).getTime() - new Date(a.started_at!).getTime())[0];
    if (last && !last.finished_at) {
      const diff = (Date.now() - new Date(last.started_at!).getTime()) / 1000;
      if (diff < 3) {
        return NextResponse.json({ error: 'rate_limited', reason: 'cooldown_active' }, { status: 429 });
      }
    }

    const { data, error } = await supabase.from('quick_battle_runs')
      .insert({
        user_id: user.id,
        battle_type: 'king_crab',
        seed: typeof seed === 'number' ? seed : undefined,
        started_at: new Date().toISOString()
      })
      .select('id')
      .single();

    if (error) throw error;

    // Emit RUN_START event (best effort)
    const runId = data.id;
    const { error: eventError } = await supabase.from('quick_battle_events').insert({
      run_id: runId,
      user_id: user.id,
      event_type: 'RUN_START',
      payload: { seed }
    });
    if (eventError) console.warn('quick_battle_events RUN_START insert failed', eventError);

    return NextResponse.json({ run_id: runId });
  } catch (e) {
    console.error('crab-battle start error', e);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}
