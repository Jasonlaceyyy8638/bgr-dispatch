-- Admin sign-in with email and password (run in Supabase SQL editor)
-- Add columns to tech_users for admin auth (only used when role = 'admin')

ALTER TABLE tech_users ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE tech_users ADD COLUMN IF NOT EXISTS password_hash text;

-- Optional: create a unique index so one email per admin
-- CREATE UNIQUE INDEX IF NOT EXISTS tech_users_email_key ON tech_users(email) WHERE email IS NOT NULL;
