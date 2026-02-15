-- ============================================================
-- BGR Dispatch — FULL Supabase setup
-- Run this entire script in: Supabase Dashboard → SQL Editor → New query
-- ============================================================
-- If tech_users.id is NOT uuid (e.g. text), change time_entries.tech_id to:
--   tech_id text NOT NULL REFERENCES tech_users(id) ON DELETE CASCADE,
-- ============================================================

-- ----- 1. Jobs table: extra columns -----
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS dispatcher_notes text;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS job_photo_url text;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS signature_data text;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS partial_payments jsonb DEFAULT '[]';

-- ----- 2. Job photos (Photos page) -----
CREATE TABLE IF NOT EXISTS job_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id bigint NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  photo_url text NOT NULL,
  address text,
  customer_name text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE job_photos DROP CONSTRAINT IF EXISTS job_photos_job_id_key;

ALTER TABLE job_photos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow anon to read job_photos" ON job_photos;
CREATE POLICY "Allow anon to read job_photos" ON job_photos FOR SELECT TO anon USING (true);
DROP POLICY IF EXISTS "Allow anon to insert job_photos" ON job_photos;
CREATE POLICY "Allow anon to insert job_photos" ON job_photos FOR INSERT TO anon WITH CHECK (true);
DROP POLICY IF EXISTS "Allow anon to delete job_photos" ON job_photos;
CREATE POLICY "Allow anon to delete job_photos" ON job_photos FOR DELETE TO anon USING (true);

-- ----- 3. Time clock -----
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
CREATE POLICY "Allow anon to manage time_entries" ON time_entries FOR ALL TO anon USING (true) WITH CHECK (true);

ALTER TABLE time_entries ADD COLUMN IF NOT EXISTS break_start timestamptz;
ALTER TABLE time_entries ADD COLUMN IF NOT EXISTS break_end timestamptz;
ALTER TABLE time_entries ADD COLUMN IF NOT EXISTS job_id bigint REFERENCES jobs(id) ON DELETE SET NULL;
ALTER TABLE time_entries ADD COLUMN IF NOT EXISTS edited_at timestamptz;
ALTER TABLE time_entries ADD COLUMN IF NOT EXISTS edit_note text;

-- ----- 4. Business settings (Admin → Business settings) -----
CREATE TABLE IF NOT EXISTS app_settings (
  key text PRIMARY KEY,
  value text
);
