-- Run in Supabase: Dashboard → SQL Editor → New query → paste → Run
-- Adds tech_notes so techs can add notes when at a job.

ALTER TABLE jobs ADD COLUMN IF NOT EXISTS tech_notes text;
