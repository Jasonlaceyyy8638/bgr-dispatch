# Everything to add in Supabase for BGR Dispatch

## 1. Run the SQL (required for app features)

1. Open **Supabase Dashboard** → **SQL Editor** → **New query**.
2. Paste the entire contents of **`supabase-full-setup.sql`**.
3. Click **Run**.

**If you get an error about `tech_users(id)` or foreign key:**  
Your `tech_users.id` column might not be `uuid`. In **Table Editor** → **tech_users**, check the type of **id**. If it’s **text**, edit the script: in the `time_entries` block change:

```sql
tech_id uuid NOT NULL REFERENCES tech_users(id) ...
```

to:

```sql
tech_id text NOT NULL REFERENCES tech_users(id) ON DELETE CASCADE,
```

Then run the script again (drop the `time_entries` table first if it was partially created).

---

## 2. Storage bucket (for job photo uploads)

So techs can **upload** photos (not only paste URLs):

1. In Supabase go to **Storage**.
2. **New bucket** → Name: **`job-photos`**.
3. Make it **Public** (so the app can show image URLs).
4. Open the bucket → **Policies** → **New policy** → **For full customization**:
   - **Policy name:** e.g. `Allow anon insert`
   - **Allowed operation:** **INSERT**
   - **Target:** bucket = `job-photos`
   - **WITH CHECK expression:** `true`  
   (Or use a stricter expression if you use Supabase Auth.)

Without this bucket, photo **upload** will fail; **paste URL** still works.

---

## Summary

| What | Where | Purpose |
|-----|--------|---------|
| **supabase-full-setup.sql** | SQL Editor | Jobs columns, job_photos, time_entries, app_settings |
| **job-photos bucket** | Storage | Techs can upload job photos |

After 1 + 2, the app has everything it needs in Supabase.
