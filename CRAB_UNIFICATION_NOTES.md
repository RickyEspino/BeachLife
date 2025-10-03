# King Crab / Quick Battle Unification

This project moved from a simple `crab_battles` table to a unified run + events model.

## Unified Entities
- `quick_battle_runs`: Canonical per-session container (now stores King Crab combat stats directly).
- `quick_battle_events`: (Future) granular telemetry (spawns, phases, etc.). Currently optional / unused by the UI.
- `crab_pots`: Spatial anchors for future location-based mechanics.
- `crab_battles` (VIEW): Backward-compatible read-only shape mapped from `quick_battle_runs` where `battle_type = 'king_crab'`.

## Why
Single source of truth, easier multi-mode expansion, telemetry potential, simpler leaderboards, badge logic extension.

## API Changes
`/api/crab-battle` now inserts into `quick_battle_runs` with a synthetic `started_at = now() - duration_seconds` to preserve a duration. A proper multi-step start/finish flow can later replace this (POST start → PATCH finish).

## UI Changes
- Achievements (`CrabBattleAchievements`) queries `quick_battle_runs` first; falls back to legacy view only if runs query fails.
- Community leaderboard now queries `quick_battle_runs` directly (battle_type filtered).

## Migration Outline
1. Deploy unified SQL (`UNIFIED_CRAB_SCHEMA.sql`).
2. Keep existing `crab_battles` table data if present (optional). If you plan to drop it, create view first so old code remains safe.
3. Backfill: For each legacy `crab_battles` row, insert a `quick_battle_runs` row (script or SQL) mapping columns.
4. Remove legacy writers (done: API now targets runs).
5. After confidence window, drop legacy physical `crab_battles` table if still present and rely solely on view.

## Backfill Example (Adjust for real column names)
```sql
insert into public.quick_battle_runs (
  user_id, battle_type, started_at, finished_at, victory, duration_seconds,
  hits, crits, blocks, max_combo, total_damage, dps
)
select
  user_id,
  'king_crab',
  created_at,
  created_at + (duration_seconds || ' seconds')::interval,
  victory,
  duration_seconds,
  hits, crits, blocks, max_combo, total_damage, dps
from public.crab_battles;
```

## Future Enhancements
- Introduce real start endpoint + incremental event emission.
- Points model (points_total vs total_damage).
- Grades derived by formula (time, max combo, blocks, crit ratio).
- Public vs private visibility refinement via extra RLS policies.

## Rollback Plan
If issues arise:
1. Revert API route to original `crab_battles` insert.
2. Remove unified codepaths (achievements & leaderboard) referencing `quick_battle_runs`.
3. Drop view only if you reintroduce physical table writes.

## Notes
- The view currently generates a random UUID per select. If stability is required, add a uuid column to `quick_battle_runs` or a deterministic UUID function.
- Inline synthetic `started_at` approximations are acceptable short-term but switch to explicit start API for accuracy.

## Troubleshooting

Error: `column "battle_type" does not exist`
Cause: The unified migration file was not applied before API refactor deploy. Fix:
1. Run `ALTER_QUICK_BATTLE_RUNS_ADD_COLUMNS.sql` in Supabase SQL editor.
2. Re-run a battle; new rows should have `battle_type='king_crab'`.
3. Rebuild materialized / cached leaderboards if any.

Verify columns:
```sql
select column_name from information_schema.columns
 where table_name='quick_battle_runs'
   and column_name in ('battle_type','victory','duration_seconds','hits','crits','blocks','max_combo','total_damage','dps');
```

If old rows lack duration_seconds, you can backfill:
```sql
update public.quick_battle_runs
set duration_seconds = extract(epoch from (finished_at - started_at))
where duration_seconds is null and finished_at is not null;
```
