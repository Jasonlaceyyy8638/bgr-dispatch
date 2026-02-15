-- ============================================================
-- Supabase: Time clock (clock in/out, breaks, job-linked, edit)
-- Run this entire script in Supabase → SQL Editor → New query
-- ============================================================

-- 1. Time entries table (if you already have it, this is a no-op)
-- NOTE: tech_id references tech_users(id). If your tech_users.id is NOT uuid,
-- change the first line below to match (e.g. tech_id text REFERENCES tech_users(id)).
CREATE TABLE IF NOT EXISTS time_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tech_id uuid NOT NULL REFERENCES tech_users(id) ON DELETE CASCADE,
  clock_in timestamptz NOT NULL DEFAULT now(),
  clock_out timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS time_entries_tech_id_clock_in ON time_entries(tech_id, clock_in);

ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anon to manage time_entries" ON time_entries;
CREATE POLICY "Allow anon to manage time_entries"
  ON time_entries FOR ALL TO anon USING (true) WITH CHECK (true);

-- 2. Break/lunch, job-linked time, and admin edit columns
ALTER TABLE time_entries ADD COLUMN IF NOT EXISTS break_start timestamptz;
ALTER TABLE time_entries ADD COLUMN IF NOT EXISTS break_end timestamptz;
ALTER TABLE time_entries ADD COLUMN IF NOT EXISTS job_id bigint REFERENCES jobs(id) ON DELETE SET NULL;
ALTER TABLE time_entries ADD COLUMN IF NOT EXISTS edited_at timestamptz;
ALTER TABLE time_entries ADD COLUMN IF NOT EXISTS edit_note text;
