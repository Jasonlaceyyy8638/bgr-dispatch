# Schema additions for new features

Run these in your Supabase SQL editor if you want full support for the new features.

## Jobs table

Add columns for job status flow, dispatcher notes, and optional photo:

```sql
-- Status values used: booked, en_route, on_site, Authorized, Closed
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS dispatcher_notes text;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS job_photo_url text;
```

(No change needed for `status` if it already accepts text; use values: `booked`, `en_route`, `on_site`, `Authorized`, `Closed`.)

## Business settings (optional)

To persist company name, phone, tax rate, card fee %, and review link from the Admin → Business settings page:

```sql
CREATE TABLE IF NOT EXISTS app_settings (
  key text PRIMARY KEY,
  value text
);
```

If this table does not exist, the Business settings page still works: it reads defaults from env and save will fail until you create the table.
