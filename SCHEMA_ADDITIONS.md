# Schema additions for new features

## Quick setup (one place to look)

1. **SQL Editor** — Run the SQL below (Jobs columns, **job_photos** table for the Photos page, and optionally `app_settings`).
2. **Dashboard → Storage** — Create the `job-photos` bucket (public, with insert policy). This is **not** done via SQL.

---

Run the following in your **Supabase SQL Editor** if you want full support for the new features.

## Jobs table

Add columns for job status flow, dispatcher notes, and optional photo:

```sql
-- Status values used: booked, en_route, on_site, Authorized, Closed
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS dispatcher_notes text;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS job_photo_url text;
```

(No change needed for `status` if it already accepts text; use values: `booked`, `en_route`, `on_site`, `Authorized`, `Closed`.)

## Photos page (job_photos table)

So the **Photos** section (sidebar + mobile) can list all job photos with address and search by customer name:

```sql
-- jobs.id is bigint, so job_id must match; multiple photos per job (no UNIQUE on job_id)
CREATE TABLE IF NOT EXISTS job_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id bigint NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  photo_url text NOT NULL,
  address text,
  customer_name text,
  created_at timestamptz DEFAULT now()
);
```

If you already created the table with `UNIQUE(job_id)`, allow multiple photos per job:

```sql
ALTER TABLE job_photos DROP CONSTRAINT IF EXISTS job_photos_job_id_key;
```

**Required so photos actually save and show on the Photos page** — allow the app to read/write `job_photos` (run in SQL Editor):

```sql
ALTER TABLE job_photos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anon to read job_photos" ON job_photos;
CREATE POLICY "Allow anon to read job_photos"
  ON job_photos FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "Allow anon to insert job_photos" ON job_photos;
CREATE POLICY "Allow anon to insert job_photos"
  ON job_photos FOR INSERT TO anon WITH CHECK (true);
```

This lets the app (using the anon key) save and load photos even without the service role key.

When a job gets a photo (Take pic, Choose file, or paste URL), the app inserts a row here. The Photos page reads from this table and supports search by customer name.

## Business settings (optional)

To persist company name, phone, tax rate, card fee %, and review link from the Admin → Business settings page:

```sql
CREATE TABLE IF NOT EXISTS app_settings (
  key text PRIMARY KEY,
  value text
);
```

If this table does not exist, the Business settings page still works: it reads defaults from env and save will fail until you create the table.

## Job photos (optional)

To let techs **take or choose a photo** on the job screen (instead of only pasting a URL):

1. In **Supabase Dashboard** → **Storage**, create a new bucket named **`job-photos`**.
2. Make the bucket **Public** (so the app can show uploaded images via public URL).
3. Under **Policies** for `job-photos`, add a policy that allows **insert** (upload) for your app — e.g. allow `anon` to insert, or use a policy like: “Allow uploads for authenticated users” if you use Supabase Auth. For the simplest setup, use “New policy” → “For full customization” and add an **INSERT** policy with target “bucket = job-photos” and expression `true` (or restrict by role if you prefer).

If the bucket does not exist or upload is denied, techs will see an error and can still use **“Or paste photo URL”** as a fallback.
