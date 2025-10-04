-- CRAB_BATTLE_RLS.sql
-- Row Level Security policies for crab battle gameplay tables.
-- Apply AFTER the base schema (UNIFIED_CRAB_SCHEMA.sql) is deployed.
-- Idempotent guards included to allow repeated execution safely.

-- 1. Enable RLS (only if not already enabled)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'quick_battle_runs'
  ) THEN
    RAISE NOTICE 'quick_battle_runs table not found; skipping RLS enable.';
  ELSE
    EXECUTE 'ALTER TABLE public.quick_battle_runs ENABLE ROW LEVEL SECURITY';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'quick_battle_events'
  ) THEN
    RAISE NOTICE 'quick_battle_events table not found; skipping RLS enable.';
  ELSE
    EXECUTE 'ALTER TABLE public.quick_battle_events ENABLE ROW LEVEL SECURITY';
  END IF;
END;$$;

-- 2. Drop existing policies (if present) to allow redefinition
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN (
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE tablename IN ('quick_battle_runs','quick_battle_events')
  ) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', pol.policyname, pol.schemaname, pol.tablename);
  END LOOP;
END;$$;

-- 3. quick_battle_runs policies
-- Allow authenticated users to insert their own run start row.
CREATE POLICY quick_battle_runs_insert_self ON public.quick_battle_runs
  FOR INSERT WITH CHECK ( auth.uid() IS NOT NULL AND user_id = auth.uid() );

-- Allow selecting only own runs.
CREATE POLICY quick_battle_runs_select_self ON public.quick_battle_runs
  FOR SELECT USING ( user_id = auth.uid() );

-- Allow updating only unfinished own runs (finish endpoint). Protect against tampering after finished.
CREATE POLICY quick_battle_runs_update_self_unfinished ON public.quick_battle_runs
  FOR UPDATE USING ( user_id = auth.uid() AND finished_at IS NULL )
  WITH CHECK ( user_id = auth.uid() );

-- (Optional) no deletes by regular users; omit DELETE policy so only service role can delete.

-- 4. quick_battle_events policies
-- Insert events only for runs owned by user and still unfinished.
CREATE POLICY quick_battle_events_insert_self ON public.quick_battle_events
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM public.quick_battle_runs r
      WHERE r.id = quick_battle_events.run_id
        AND r.user_id = auth.uid()
        AND r.finished_at IS NULL
    )
  );

-- Select only events for user's runs.
CREATE POLICY quick_battle_events_select_self ON public.quick_battle_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.quick_battle_runs r
      WHERE r.id = quick_battle_events.run_id
        AND r.user_id = auth.uid()
    )
  );

-- 5. Safety: Block UPDATE/DELETE on events for normal users by not defining policies; only service role may do so.

-- 6. Service Role Guidance (not enforced here): use service key for admin maintenance tasks.

-- 7. Verification Queries (run manually after applying):
-- SELECT * FROM pg_policies WHERE tablename IN ('quick_battle_runs','quick_battle_events');
-- Attempt cross-user select/update in SQL editor with different JWT to confirm denial.

