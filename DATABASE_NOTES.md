# Database Notes

## Overview
Core gameplay logging for Crab Battle uses a unified run table plus an events table. A legacy view provides backwards compatibility.

### Tables
- quick_battle_runs
  - id (uuid pk)
  - user_id (uuid, nullable for anonymous future support)
  - started_at timestamptz NOT NULL default now()
  - finished_at timestamptz NULL
  - duration_ms int NULL (server recomputed on finish)
  - total_damage int NULL
  - max_combo int NULL
  - victory boolean NULL
  - dps numeric NULL (recomputed from total_damage / duration)
  - grade text NULL (S/A/B/C)
  - shells_awarded int NULL
  - client_seed text NULL (client-provided rng seed / signature)
  - meta jsonb NULL (extensible bucket for future tuning/meta values)
  - UNIQUE (id)

- quick_battle_events
  - id bigserial pk
  - run_id uuid references quick_battle_runs(id) on delete cascade
  - created_at timestamptz default now()
  - kind text NOT NULL (e.g. 'hit', 'miss', 'crit', 'combo_break', etc.)
  - payload jsonb NULL (shape varies per kind)
  - index on (run_id, created_at)

### View (compat)
- crab_battles (compatibility shim to match legacy consumer expectations)
  - SELECT from quick_battle_runs with renames/filters; safe to drop later when no caller depends on it.

## Lifecycle
1. /api/crab-battle/start
   - Rate limits (short-burst + per-user recent runs) enforced.
   - Inserts empty quick_battle_runs row (only started_at).
   - Returns run id.
2. Client emits events (future) -> /api/crab-battle/event (NOT YET IMPLEMENTED) or buffers locally.
3. /api/crab-battle/finish
   - Validates run ownership + unfinished state.
   - Recomputes duration, dps, grade, shells.
   - Updates row atomically with final metrics.

## Grading & Rewards
Logic extracted to `src/lib/crab/grading.ts`:
- computeGrade(victory, dps, maxCombo)
- shellsFor(grade, dps)
Promotion for high combo (>=12) bumps one tier up to S max.

## Rate Limiting (DB dimension)
- start: denies if user has more than N recent unfinished or if creating too many finished runs inside a short window (exact thresholds in route code; consider externalizing constants later).

## Migrations Philosophy
- Defensive `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` style or DO blocks to avoid failures during iterative dev deploys.
- Separate idempotent schema creation script (`UNIFIED_CRAB_SCHEMA.sql`) and additive alter script for production drift alignment.

## Potential Extensions
- Add materialized view for daily aggregates (average DPS, grades distribution) for leaderboard queries.
- Introduce partitioning by month if row count grows (e.g., >= 50M events) to keep index bloat manageable.
- Add server-enforced unique key on (user_id, started_at) if duplicate spam emerges.

## RLS (Implemented)
Row Level Security policies are defined in `CRAB_BATTLE_RLS.sql` (idempotent). Summary:
- quick_battle_runs: insert/select/update (unfinished only) limited to owning `user_id = auth.uid()`.
- quick_battle_events: insert allowed only if run owned & unfinished; select limited to owned runs' events.
- No delete policies so only service role can delete.
Apply script after base schema. Verify with `SELECT * FROM pg_policies WHERE tablename IN ('quick_battle_runs','quick_battle_events');`.

## Cleanup / Retention
- Consider cron (Supabase scheduled function) to purge orphan unfinished runs older than 24h.
- Archive / cold storage for events older than 90d if cost pressure.

