import { createSupabaseServerClient } from '@/lib/supabase/serverClient';
import React from 'react';

export default async function CrabBattleAchievements() {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return <div className="rounded-xl border p-4 text-sm text-gray-500">Sign in to see King Crab achievements.</div>;
  }

  // Aggregate stats
  // Prefer unified quick_battle_runs; fallback to legacy view if unavailable
  interface AggRow { victory: boolean | null; duration_seconds: number | null; hits: number | null; crits: number | null; blocks: number | null; max_combo: number | null; total_damage: number | null; dps: number | null; started_at?: string; created_at?: string }
  let aggRows: AggRow[] | null = null;
  const { data: runsData, error: runsErr } = await supabase
    .from('quick_battle_runs')
    .select('victory, duration_seconds, hits, crits, blocks, max_combo, total_damage, dps, started_at, battle_type')
    .eq('user_id', user.id)
    .eq('battle_type', 'king_crab')
    .order('started_at', { ascending: false })
    .limit(120);
  if (!runsErr && runsData) {
    aggRows = runsData.map(r => ({
      victory: r.victory,
      duration_seconds: r.duration_seconds,
      hits: r.hits,
      crits: r.crits,
      blocks: r.blocks,
      max_combo: r.max_combo,
      total_damage: r.total_damage,
      dps: r.dps,
      created_at: r.started_at,
    }));
  } else {
    const { data: legacy } = await supabase
      .from('crab_battles')
      .select('victory, duration_seconds, hits, crits, blocks, max_combo, total_damage, dps, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(100);
    aggRows = legacy || [];
  }

  if (!aggRows || !aggRows.length) {
    return (
      <div className="rounded-xl border p-4">
        <h3 className="font-semibold mb-1">King Crab Achievements</h3>
        <p className="text-sm text-gray-500">Defeat the King Crab to unlock achievements.</p>
      </div>
    );
  }

  let victories = 0;
  let fastest = Infinity;
  let bestDps = 0;
  let totalDps = 0;
  let dpsSamples = 0;
  let highestCombo = 0;
  const totalBattles = aggRows.length;
  let totalDamage = 0;
  for (const r of aggRows) {
    if (r.victory) {
      victories++;
      if (typeof r.duration_seconds === 'number' && r.duration_seconds < fastest) fastest = r.duration_seconds;
    }
    if (typeof r.dps === 'number' && r.dps > bestDps) bestDps = r.dps;
    if (typeof r.dps === 'number') { totalDps += r.dps; dpsSamples++; }
    if (typeof r.max_combo === 'number' && r.max_combo > highestCombo) highestCombo = r.max_combo;
    totalDamage += (r.total_damage || 0) ?? 0;
  }
  const avgDps = dpsSamples ? totalDps / dpsSamples : 0;

  // Achievement badges
  const badges: Array<{ key: string; label: string; unlocked: boolean; desc: string }>= [
    { key: 'first_victory', label: 'First Victory', unlocked: victories >= 1, desc: 'Defeat the King Crab once.' },
    { key: 'speed_runner', label: 'Speed Runner', unlocked: fastest < 40, desc: 'Win in under 40s.' },
    { key: 'combo_crusher', label: 'Combo Crusher', unlocked: highestCombo >= 15, desc: 'Reach 15x combo.' },
    { key: 'dps_machine', label: 'DPS Machine', unlocked: bestDps >= 80, desc: 'Achieve 80+ DPS in a fight.' },
  ];

  const recent = aggRows.slice(0, 5);

  return (
    <div className="rounded-xl border p-4 space-y-5">
      <div>
        <h3 className="font-semibold text-lg">King Crab Achievements</h3>
        <p className="text-xs text-gray-500 mt-0.5">Track your boss battle progress.</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat label="Victories" value={victories} />
        <Stat label="Fastest" value={fastest === Infinity ? '—' : `${fastest.toFixed(1)}s`} />
        <Stat label="Best DPS" value={bestDps.toFixed(1)} />
        <Stat label="Avg DPS" value={avgDps.toFixed(1)} />
        <Stat label="Highest Combo" value={highestCombo} />
        <Stat label="Battles" value={totalBattles} />
        <Stat label="Total Damage" value={totalDamage} />
      </div>

      <div>
        <h4 className="font-medium mb-2 text-sm">Badges</h4>
        <div className="flex flex-wrap gap-2">
          {badges.map(b => (
            <div key={b.key} className={`px-2 py-1 rounded-md text-xs font-medium border ${b.unlocked ? 'bg-emerald-500/15 text-emerald-700 border-emerald-600/30' : 'bg-gray-100 text-gray-500 border-gray-300'}`} title={b.desc}>
              {b.label}
            </div>
          ))}
        </div>
      </div>

      <div>
        <h4 className="font-medium mb-2 text-sm">Recent Battles</h4>
        <div className="space-y-1 text-xs font-mono">
          {recent.map((r, i) => {
            const dur = typeof r.duration_seconds === 'number' ? r.duration_seconds.toFixed(1) : '—';
            const combo = typeof r.max_combo === 'number' ? r.max_combo : '—';
            const dpsVal = typeof r.dps === 'number' ? r.dps.toFixed(1) : '—';
            const ts = r.created_at ? new Date(r.created_at).toLocaleTimeString() : '';
            return (
              <div key={i} className="flex items-center justify-between rounded bg-gray-50 px-2 py-1">
                <span className="truncate">{r.victory ? 'Win' : 'Loss'} · {dur}s · {combo}x · {dpsVal} DPS</span>
                <span className="text-gray-400">{ts}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg border p-3 bg-white/60">
      <div className="text-[10px] uppercase tracking-wider text-gray-500">{label}</div>
      <div className="mt-1 text-sm font-semibold">{value}</div>
    </div>
  );
}
