-- Unified Quick Battle / King Crab Schema
-- Run in Supabase SQL editor
-- Includes: crab_pots, quick_battle_runs (+combat stats), quick_battle_events, crab_battles view

-- Extensions (uncomment if needed)
-- create extension if not exists "uuid-ossp";
-- create extension if not exists pgcrypto;

-- 1) CRAB POTS
create table if not exists public.crab_pots (
  id          bigserial primary key,
  kind        text not null check (kind in ('standard','tidal','merchant')),
  title       text,
  lat         double precision not null,
  lng         double precision not null,
  radius_m    integer not null default 25,
  merchant_id bigint,
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create or replace function public.touch_crab_pots_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end; $$;

drop trigger if exists crab_pots_touch_updated_at on public.crab_pots;
create trigger crab_pots_touch_updated_at
before update on public.crab_pots
for each row execute function public.touch_crab_pots_updated_at();

create index if not exists crab_pots_active_idx on public.crab_pots(active);
create index if not exists crab_pots_kind_idx   on public.crab_pots(kind);
create index if not exists crab_pots_geo_idx    on public.crab_pots(lat, lng);

alter table public.crab_pots enable row level security;

drop policy if exists crab_pots_select_active on public.crab_pots;
create policy crab_pots_select_active on public.crab_pots for select using (active = true);

drop policy if exists crab_pots_admin_write on public.crab_pots;
create policy crab_pots_admin_write on public.crab_pots for insert to authenticated
with check (auth.role() = 'service_role');

-- 2) QUICK BATTLE RUNS (canonical battle entity)
create table if not exists public.quick_battle_runs (
  id             bigserial primary key,
  user_id        uuid not null references public.profiles(id) on delete cascade,
  battle_type    text not null default 'king_crab' check (battle_type in ('king_crab','quick_capture','event','other')),
  started_at     timestamptz not null default now(),
  finished_at    timestamptz,
  center_lat     double precision not null default 0,
  center_lng     double precision not null default 0,
  radius_m       integer not null default 200,
  seed           bigint,
  captures       integer not null default 0,
  points_total   integer not null default 0,
  grade          text check (grade in ('S','A','B','C')),
  shells_awarded integer not null default 0,
  victory          boolean,
  duration_seconds numeric(6,2),
  hits             integer,
  crits            integer,
  blocks           integer,
  max_combo        integer,
  total_damage     integer,
  dps              numeric(8,2),
  created_at       timestamptz not null default now()
);

create index if not exists qbr_user_started_idx on public.quick_battle_runs(user_id, started_at desc);
create index if not exists qbr_type_idx         on public.quick_battle_runs(battle_type);
create index if not exists qbr_victory_time_idx on public.quick_battle_runs(duration_seconds) where victory = true;
create index if not exists qbr_dps_idx          on public.quick_battle_runs(dps);
-- Composite index to accelerate per-battle-type victorious leaderboards & user filtered scans
create index if not exists qbr_type_victory_user_idx on public.quick_battle_runs(battle_type, victory, user_id);

alter table public.quick_battle_runs enable row level security;

drop policy if exists qbr_select_own on public.quick_battle_runs;
create policy qbr_select_own on public.quick_battle_runs for select using (auth.uid() = user_id);

drop policy if exists qbr_insert_own on public.quick_battle_runs;
create policy qbr_insert_own on public.quick_battle_runs for insert with check (auth.uid() = user_id);

drop policy if exists qbr_update_own on public.quick_battle_runs;
create policy qbr_update_own on public.quick_battle_runs for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Public leaderboard for victorious king crab runs
-- (Remove if you want private)
drop policy if exists qbr_public_king_crab on public.quick_battle_runs;
create policy qbr_public_king_crab on public.quick_battle_runs for select using (battle_type = 'king_crab' and victory = true);

-- 3) QUICK BATTLE EVENTS
create table if not exists public.quick_battle_events (
  id         bigserial primary key,
  run_id     bigint not null references public.quick_battle_runs(id) on delete cascade,
  user_id    uuid   not null references public.profiles(id) on delete cascade,
  ts         timestamptz not null default now(),
  event_type text not null check (event_type in (
    'RUN_START','POT_SPAWN','ENTER_RADIUS','HOLD_START','HOLD_PROGRESS',
    'CAPTURED','MICRO_CHALLENGE_COMPLETE','GOLDEN_SHELL_SPAWN',
    'GOLDEN_SHELL_COLLECTED','LOW_TIDE_START','RUN_FINISH'
  )),
  payload    jsonb not null default '{}'::jsonb
);

create index if not exists qbe_run_ts_idx  on public.quick_battle_events(run_id, ts);
create index if not exists qbe_user_ts_idx on public.quick_battle_events(user_id, ts);
create index if not exists qbe_event_idx   on public.quick_battle_events(event_type);

alter table public.quick_battle_events enable row level security;

drop policy if exists qbe_select_own on public.quick_battle_events;
create policy qbe_select_own on public.quick_battle_events for select using (auth.uid() = user_id);

drop policy if exists qbe_insert_own on public.quick_battle_events;
create policy qbe_insert_own on public.quick_battle_events for insert with check (auth.uid() = user_id);

drop policy if exists qbe_block_update on public.quick_battle_events;
create policy qbe_block_update on public.quick_battle_events for update using (false) with check (false);

drop policy if exists qbe_block_delete on public.quick_battle_events;
create policy qbe_block_delete on public.quick_battle_events for delete using (false);

-- 4) Compatibility View: crab_battles
-- Provides legacy shape for existing code (read-only)
-- Adjust: generate deterministic UUID if needed; here random each select.
-- If a legacy TABLE named public.crab_battles exists (old schema) we must rename it
-- before we can create the VIEW with the same name. This block safely renames it
-- to crab_battles_legacy exactly once. If it's already a view, nothing happens.
do $$
begin
  if exists (
    select 1 from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'crab_battles'
      and c.relkind = 'r'  -- 'r' = ordinary table
  ) then
    raise notice 'Renaming legacy TABLE public.crab_battles -> crab_battles_legacy';
    execute 'alter table public.crab_battles rename to crab_battles_legacy';
  end if;
end $$;

-- OPTIONAL ONE-TIME BACKFILL (uncomment & run once if you had legacy rows)
-- This maps the old per-battle summary rows into quick_battle_runs.
-- Assumes legacy table now named crab_battles_legacy and has columns:
-- (user_id, victory, duration_seconds, hits, crits, blocks, max_combo, total_damage, dps, created_at)
--
-- insert into public.quick_battle_runs (
--   user_id, battle_type, started_at, finished_at, victory, duration_seconds,
--   hits, crits, blocks, max_combo, total_damage, dps, created_at
-- )
-- select
--   user_id,
--   'king_crab' as battle_type,
--   created_at - (duration_seconds * interval '1 second') as started_at,
--   created_at as finished_at,
--   victory,
--   duration_seconds,
--   hits,
--   crits,
--   blocks,
--   max_combo,
--   total_damage,
--   dps,
--   created_at
-- from public.crab_battles_legacy
-- on conflict do nothing; -- (No PK overlap expected; safeguard if rerun.)

drop view if exists public.crab_battles;
create view public.crab_battles as
select
  uuid_generate_v4() as id,
  user_id,
  coalesce(victory,false) as victory,
  coalesce(duration_seconds, extract(epoch from (finished_at - started_at)))::numeric(6,2) as duration_seconds,
  coalesce(hits,0) as hits,
  coalesce(crits,0) as crits,
  coalesce(blocks,0) as blocks,
  coalesce(max_combo,0) as max_combo,
  coalesce(total_damage,0) as total_damage,
  coalesce(dps,0) as dps,
  started_at as created_at
from public.quick_battle_runs
where battle_type = 'king_crab';
