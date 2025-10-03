-- Patch migration: add new columns if quick_battle_runs already existed without them
-- Safe to run multiple times (guarded by IF NOT EXISTS where possible)

-- Add battle_type if missing
alter table public.quick_battle_runs
  add column if not exists battle_type text not null default 'king_crab';

-- Constrain battle_type values (create a check if absent)
-- NOTE: Postgres lacks IF NOT EXISTS for constraints; wrap in DO block
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'quick_battle_runs_battle_type_check'
  ) THEN
    ALTER TABLE public.quick_battle_runs
      ADD CONSTRAINT quick_battle_runs_battle_type_check
      CHECK (battle_type in ('king_crab','quick_capture','event','other'));
  END IF;
END$$;

-- Add combat stat columns (nullable to avoid rewrite, fill later)
alter table public.quick_battle_runs add column if not exists victory boolean;
alter table public.quick_battle_runs add column if not exists duration_seconds numeric(6,2);
alter table public.quick_battle_runs add column if not exists hits integer;
alter table public.quick_battle_runs add column if not exists crits integer;
alter table public.quick_battle_runs add column if not exists blocks integer;
alter table public.quick_battle_runs add column if not exists max_combo integer;
alter table public.quick_battle_runs add column if not exists total_damage integer;
alter table public.quick_battle_runs add column if not exists dps numeric(8,2);

-- Add created_at if previously absent
alter table public.quick_battle_runs add column if not exists created_at timestamptz not null default now();

-- Indexes (will no-op if already present)
create index if not exists qbr_type_idx on public.quick_battle_runs(battle_type);
create index if not exists qbr_victory_time_idx on public.quick_battle_runs(duration_seconds) where victory = true;
create index if not exists qbr_dps_idx on public.quick_battle_runs(dps);
