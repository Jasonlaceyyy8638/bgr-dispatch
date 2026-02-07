-- Run in Supabase: Dashboard → SQL Editor → New query → paste → Run
-- Adds invoice_number so receipts can be stored and searched (e.g. INV-12345).

ALTER TABLE jobs ADD COLUMN IF NOT EXISTS invoice_number text;
