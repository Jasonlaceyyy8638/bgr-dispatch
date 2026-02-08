-- Optional: track cost per job so Revenue can show profit margin (run in Supabase SQL editor)
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS cost_amount numeric;
