-- Run in Supabase: Dashboard → SQL Editor → New query → paste → Run
-- Creates customers table. Customers are saved when you close a job (cash, check, or card).

CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text UNIQUE,
  email text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Allow app (anon) to read and upsert customers
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow anon select customers" ON customers;
CREATE POLICY "Allow anon select customers" ON customers FOR SELECT TO anon USING (true);
DROP POLICY IF EXISTS "Allow anon insert customers" ON customers;
CREATE POLICY "Allow anon insert customers" ON customers FOR INSERT TO anon WITH CHECK (true);
DROP POLICY IF EXISTS "Allow anon update customers" ON customers;
CREATE POLICY "Allow anon update customers" ON customers FOR UPDATE TO anon USING (true) WITH CHECK (true);
