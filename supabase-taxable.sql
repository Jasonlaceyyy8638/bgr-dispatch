-- Run in Supabase: Dashboard → SQL Editor → New query → paste → Run
-- Adds taxable flag and tax_amount for invoice tax toggle.

ALTER TABLE jobs ADD COLUMN IF NOT EXISTS taxable boolean DEFAULT true;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS tax_amount numeric;
