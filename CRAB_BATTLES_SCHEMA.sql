-- SQL Migration for crab_battles table
-- Run in Supabase SQL editor (adjust extensions if needed)

-- Ensure uuid extension (usually enabled by default)
-- create extension if not exists "uuid-ossp";

create table if not exists public.crab_battles (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  victory boolean not null,
  duration_seconds numeric(6,2) not null,
  hits int not null default 0,
  crits int not null default 0,
  blocks int not null default 0,
  max_combo int not null default 0,
  total_damage int not null default 0,
  dps numeric(8,2) not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists crab_battles_user_id_idx on public.crab_battles(user_id);
create index if not exists crab_battles_victory_idx on public.crab_battles(victory);
create index if not exists crab_battles_victory_time_idx on public.crab_battles(duration_seconds) where victory = true;
create index if not exists crab_battles_dps_idx on public.crab_battles(dps);

-- (Optional) RLS policies if using RLS (example):
-- alter table public.crab_battles enable row level security;
-- create policy "Users can insert own battles" on public.crab_battles for insert with check (auth.uid() = user_id);
-- create policy "Users can view their battles" on public.crab_battles for select using (auth.uid() = user_id);
-- create policy "Leaderboard public victories" on public.crab_battles for select using (victory = true);
