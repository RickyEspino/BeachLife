-- CRAB_BATTLE_LEADERBOARD.sql
-- Materialized view for fast leaderboard queries.
-- Refresh strategy: periodic (cron) or on-demand after batches.

CREATE MATERIALIZED VIEW IF NOT EXISTS crab_battle_leaderboard AS
SELECT
  user_id,
  COUNT(*) FILTER (WHERE victory) AS victories,
  COUNT(*) AS runs,
  AVG(dps) FILTER (WHERE victory) AS avg_victory_dps,
  AVG(dps) AS avg_overall_dps,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY dps) AS p95_dps,
  MAX(grade) AS max_grade,
  SUM(shells_awarded) AS total_shells
FROM quick_battle_runs
WHERE finished_at IS NOT NULL
GROUP BY user_id;

CREATE INDEX IF NOT EXISTS idx_crab_battle_leaderboard_shells ON crab_battle_leaderboard (total_shells DESC);
CREATE INDEX IF NOT EXISTS idx_crab_battle_leaderboard_victories ON crab_battle_leaderboard (victories DESC);

-- To refresh:
-- REFRESH MATERIALIZED VIEW CONCURRENTLY crab_battle_leaderboard;
