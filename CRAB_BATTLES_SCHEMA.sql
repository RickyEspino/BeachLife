-- LEGACY / COMPATIBILITY VIEW
-- This file previously created a standalone crab_battles table. The application now uses
-- unified tables: quick_battle_runs (and quick_battle_events). To preserve backwards
-- compatibility with any consumer expecting crab_battles, we expose a VIEW instead.
--
-- The earlier error you encountered (cannot create index on relation "crab_battles")
-- happened because crab_battles already existed as a VIEW (or you intend it to be one) and
-- indexes cannot be created directly on a normal VIEW. Index the underlying base table
-- quick_battle_runs instead.
--
-- Safe to run repeatedly: we drop and recreate the view. Adjust column mapping as needed.

DROP VIEW IF EXISTS public.crab_battles;
CREATE VIEW public.crab_battles AS
SELECT
  r.id,
  r.user_id,
  r.victory,
  r.duration_seconds,
  r.hits,
  r.crits,
  r.blocks,
  r.max_combo,
  r.total_damage,
  r.dps,
  r.started_at AS created_at
FROM public.quick_battle_runs r
WHERE r.finished_at IS NOT NULL; -- expose only finished runs

-- Recommended supporting indexes (run separately IF NOT ALREADY PRESENT) on quick_battle_runs:
-- CREATE INDEX IF NOT EXISTS qbr_user_id_idx ON public.quick_battle_runs(user_id);
-- CREATE INDEX IF NOT EXISTS qbr_victory_idx ON public.quick_battle_runs(victory);
-- CREATE INDEX IF NOT EXISTS qbr_victory_duration_idx ON public.quick_battle_runs(duration_seconds) WHERE victory = true;
-- CREATE INDEX IF NOT EXISTS qbr_dps_idx ON public.quick_battle_runs(dps);

-- If you need public leaderboard access while RLS is enabled, create a SECURITY DEFINER function
-- or a separate materialized view (see CRAB_BATTLE_LEADERBOARD.sql) with its own policies.

