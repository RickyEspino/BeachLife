-- CRAB_BATTLE_HOURLY_STATS.sql
-- Table for aggregated per-user per-hour stats (append-only from finish route best-effort inserts)

CREATE TABLE IF NOT EXISTS quick_battle_hourly_stats (
  user_id uuid NOT NULL,
  hour_bucket timestamptz NOT NULL,
  runs int NOT NULL DEFAULT 0,
  victories int NOT NULL DEFAULT 0,
  total_damage bigint NOT NULL DEFAULT 0,
  total_duration_seconds int NOT NULL DEFAULT 0,
  total_shells int NOT NULL DEFAULT 0,
  total_dps numeric NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, hour_bucket)
);

-- Upsert helper view (optional future)
-- CREATE OR REPLACE FUNCTION upsert_quick_battle_hourly(p_user uuid, p_finished timestamptz, p_victory boolean, p_damage int, p_duration int, p_shells int, p_dps numeric)
-- RETURNS void LANGUAGE plpgsql AS $$
-- DECLARE
--   v_hour timestamptz := date_trunc('hour', p_finished);
-- BEGIN
--   INSERT INTO quick_battle_hourly_stats(user_id, hour_bucket, runs, victories, total_damage, total_duration_seconds, total_shells, total_dps)
--   VALUES (p_user, v_hour, 1, CASE WHEN p_victory THEN 1 ELSE 0 END, p_damage, p_duration, p_shells, p_dps)
--   ON CONFLICT (user_id, hour_bucket)
--   DO UPDATE SET runs = quick_battle_hourly_stats.runs + 1,
--                 victories = quick_battle_hourly_stats.victories + (CASE WHEN p_victory THEN 1 ELSE 0 END),
--                 total_damage = quick_battle_hourly_stats.total_damage + p_damage,
--                 total_duration_seconds = quick_battle_hourly_stats.total_duration_seconds + p_duration,
--                 total_shells = quick_battle_hourly_stats.total_shells + p_shells,
--                 total_dps = quick_battle_hourly_stats.total_dps + p_dps;
-- END;$$;
