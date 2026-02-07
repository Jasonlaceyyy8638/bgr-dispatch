# Add Supabase env vars in Netlify

Your `.env.local` file is **only used when you run the app on your computer** (e.g. `npm run dev`). Netlify does **not** read `.env.local` — it never gets deployed to GitHub (and shouldn’t be, for security).

So the live site at **bgrdispatch.netlify.app** (or dispatch.bgrdayton.com) has **no** Supabase URL or anon key unless you add them in Netlify.

## Steps

1. Open **[Netlify](https://app.netlify.com)** and select your site (**bgrdispatch**).
2. Go to **Site configuration** → **Environment variables** (or **Build & deploy** → **Environment**).
3. Click **Add a variable** or **Edit** and add:
   - **Key:** `NEXT_PUBLIC_SUPABASE_URL`  
     **Value:** paste the same value you have in `.env.local` (your Supabase project URL).
   - **Key:** `NEXT_PUBLIC_SUPABASE_ANON_KEY`  
     **Value:** paste the same value you have in `.env.local` (your Supabase anon/public key).
4. Save.
5. Go to **Deploys** → **Trigger deploy** → **Deploy site** (so the next build runs with these variables).

After the deploy finishes, the Customers page (and any other feature that uses Supabase) will work on the live site.
