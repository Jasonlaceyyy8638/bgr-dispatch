-- Run this in Supabase: Dashboard → SQL Editor → New query → paste all → Run
-- Adds columns needed for Cash and Check payment recording.

ALTER TABLE jobs ADD COLUMN IF NOT EXISTS payment_method text;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS payment_amount numeric;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS check_number text;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS check_photo_url text;
