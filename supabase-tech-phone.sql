-- Run in Supabase: Dashboard → SQL Editor → New query → paste → Run
-- Adds phone for techs (used for new-job SMS notifications).

ALTER TABLE tech_users ADD COLUMN IF NOT EXISTS phone text;
