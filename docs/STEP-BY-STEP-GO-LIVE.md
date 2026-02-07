# Step-by-step: Go live at dispatch.bgrdayton.com

Use this exact order. You’re putting this new app live and using **dispatch.bgrdayton.com** for it (replacing whatever is there now).

---

## Part 1: Put your code on GitHub

1. Open **GitHub.com** and sign in.
2. Click the **+** (top right) → **New repository**.
3. **Repository name:** `bgr-dispatch` (or any name you like).
4. Leave it **Private** if you want, then click **Create repository**.
5. On your computer, open **Command Prompt** or **PowerShell** in the folder where your BGR Dispatch code lives (the folder that has `package.json` and `app`).
6. Run these one at a time (replace `YOUR-GITHUB-USERNAME` with your GitHub username):

   ```text
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/YOUR-GITHUB-USERNAME/bgr-dispatch.git
   git push -u origin main
   ```

7. If it asks for login, use your GitHub username and a **Personal Access Token** (not your password). You can create a token at: GitHub → Settings → Developer settings → Personal access tokens.

When you’re done, the code for this app should be on GitHub.

---

## Part 2: Create the site on Netlify

1. Go to **https://app.netlify.com** and sign in.
2. Click **Add new site** → **Import an existing project**.
3. Click **Deploy with GitHub** (or GitLab/Bitbucket if you use that).
4. If Netlify asks for access to GitHub, approve it.
5. Find **bgr-dispatch** in the list and click it.
6. On the next screen you’ll see:
   - **Branch to deploy:** `main` (leave it).
   - **Build command:** should already be `npm run build` (leave it).
   - **Publish directory:** leave blank or as Netlify suggests.
7. **Do not click “Deploy” yet.** First add your environment variables (Part 3).

---

## Part 3: Add your environment variables

1. On that same Netlify “Configure build” screen, scroll down to **Environment variables**.
2. Click **Add a variable** or **New variable** (or **Import from .env**).
3. Open the **.env.local** file on your computer (in your BGR Dispatch project folder). You’ll copy from there.
4. Add **each** of these variables in Netlify. For each one: **Key** = the name below, **Value** = copy the value from your `.env.local` (the part after the `=`).

   | Key (name) | Where to get the value |
   |------------|------------------------|
   | `NEXT_PUBLIC_SUPABASE_URL` | From .env.local (line that starts with this) |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | From .env.local |
   | `RINGCENTRAL_CLIENT_ID` | From .env.local |
   | `RINGCENTRAL_CLIENT_SECRET` | From .env.local |
   | `RINGCENTRAL_SERVER_URL` | From .env.local (usually `https://platform.ringcentral.com`) |
   | `RINGCENTRAL_JWT` | From .env.local (long token) |
   | `RINGCENTRAL_FROM_NUMBER` | From .env.local |
   | `STRIPE_PUBLISHABLE_KEY` | From .env.local |
   | `STRIPE_SECRET_KEY` | From .env.local |
   | `RESEND_API_KEY` | From .env.local |
   | `RESEND_FROM_EMAIL` | From .env.local (e.g. `Buckeye Garage Door Repair <office@bgrdayton.com>`) |

5. Add them one by one. For **Import from .env**: paste the *contents* of your `.env.local` (Netlify will map the names; remove any comments if it errors).
6. When all are in, click **Deploy site** (or **Save and deploy**).

---

## Part 4: Wait for the first deploy

1. Netlify will build and deploy. Wait until the status says **Published** or **Site is live** (usually 2–5 minutes).
2. Netlify will show a random URL like **something-random-123.netlify.app**. That’s your new app. You can click it to test (login, etc.).
3. Copy or remember that **something-random-123.netlify.app** URL — you’ll need it for the next part.

---

## Part 5: Use dispatch.bgrdayton.com for this site

1. In Netlify, open your **new** site (the one you just deployed).
2. Go to **Domain management** (or **Site configuration** → **Domain management**).
3. Click **Add custom domain** or **Add domain alias**.
4. Type: **dispatch.bgrdayton.com**
5. Click **Verify** or **Add**.
6. Netlify will say something like “Domain not yet configured” and show you what to do at your DNS. They’ll show a **Netlify hostname** like:  
   **random-name-123.netlify.app**  
   Write that down.

---

## Part 6: Point dispatch.bgrdayton.com at Netlify (DNS)

You need to change where **dispatch.bgrdayton.com** points so it goes to this new Netlify site instead of the old one.

1. Log in where **bgrdayton.com** is managed (GoDaddy, Namecheap, Cloudflare, Google Domains, etc.).
2. Find **DNS** or **DNS settings** or **Manage DNS** for **bgrdayton.com**.
3. Look for a record for **dispatch** (or **dispatch.bgrdayton.com**):
   - If there’s already a **CNAME** for **dispatch** pointing to an old address, **edit** it.
   - If there’s no **dispatch** record, **add** one.
4. Set it like this:
   - **Type:** CNAME  
   - **Name / Host:** `dispatch` (or whatever your provider uses for “dispatch.bgrdayton.com”)  
   - **Value / Target / Points to:** the Netlify hostname from Part 5 (e.g. **random-name-123.netlify.app**)  
   - No `https://` — just the hostname.
5. Save.

---

## Part 7: Turn on HTTPS and wait

1. Back in Netlify, under **Domain management**, Netlify will usually offer **Verify DNS configuration** or **Enable HTTPS**. Click it.
2. Wait 5–15 minutes (sometimes up to an hour) for DNS to update.
3. When it’s ready, open **https://dispatch.bgrdayton.com** in your browser. You should see your new BGR Dispatch app (login screen).
4. Test: log in, open a job, try dispatch — make sure it’s the new app.

---

## If dispatch.bgrdayton.com was already on Netlify (old site)

- If the **old** dispatch site was also on Netlify, you now have **two** Netlify sites:
  - Old one (currently at dispatch.bgrdayton.com)
  - New one (this app)
- In **Part 6**, when you set the CNAME for **dispatch** to the **new** Netlify hostname (the one from Part 5), dispatch.bgrdayton.com will switch to the new app. The old site will still exist on Netlify but won’t be at dispatch.bgrdayton.com anymore. You can delete the old site later in Netlify if you want.

---

## Checklist

- [ ] Code is on GitHub (Part 1).
- [ ] New site created on Netlify from that repo (Part 2).
- [ ] All env vars added in Netlify (Part 3).
- [ ] First deploy finished and site is “Published” (Part 4).
- [ ] Custom domain **dispatch.bgrdayton.com** added in Netlify (Part 5).
- [ ] CNAME for **dispatch** points to the **new** Netlify hostname (Part 6).
- [ ] HTTPS works and https://dispatch.bgrdayton.com opens the new app (Part 7).

If a step fails, say which part and what you see (error message or screen), and we can fix it step by step.
