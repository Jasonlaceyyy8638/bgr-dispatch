# Go live on Netlify (dispatch.bgrdayton.com)

Get BGR Dispatch live at **dispatch.bgrdayton.com** and adjust things later as needed.

---

## 1. Push your code

- Commit and push this repo to **GitHub**, **GitLab**, or **Bitbucket** (if you haven’t already).
- Netlify will build and deploy from this repo.

---

## 2. Create the site on Netlify

1. Go to [netlify.com](https://www.netlify.com) and sign in.
2. **Add new site** → **Import an existing project**.
3. Connect your Git provider and choose the **bgr-dispatch** repo.
4. Netlify will detect **Next.js** and prefill:
   - **Build command:** `npm run build`
   - **Publish directory:** (leave as set by Next.js – Netlify uses the Next.js runtime)
5. **Do not deploy yet** – add environment variables first (step 3).

---

## 3. Set environment variables

In the Netlify site: **Site configuration** → **Environment variables** → **Add a variable** (or **Import from .env**).

Add the **same variable names** you use in `.env.local`, and paste the **values** from your local `.env.local` (do not commit `.env.local` or paste secrets into the repo).

| Variable | Used for |
|----------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `RINGCENTRAL_CLIENT_ID` | RingCentral SMS |
| `RINGCENTRAL_CLIENT_SECRET` | RingCentral SMS |
| `RINGCENTRAL_SERVER_URL` | `https://platform.ringcentral.com` |
| `RINGCENTRAL_JWT` | RingCentral JWT |
| `RINGCENTRAL_FROM_NUMBER` | Outbound SMS number |
| `STRIPE_PUBLISHABLE_KEY` | Stripe (public) |
| `STRIPE_SECRET_KEY` | Stripe (secret) |
| `RESEND_API_KEY` | Email receipts |
| `RESEND_FROM_EMAIL` | e.g. `Buckeye Garage Door Repair <office@bgrdayton.com>` |

- For **production**, use the same Supabase project (or a separate one) and the same Stripe/Resend/RingCentral keys you use in production.
- Optional: `RESEND_LOGO_URL` = `https://dispatch.bgrdayton.com/logo.png` (or your main site logo URL) so receipt emails use the correct logo.

---

## 4. Deploy

- Click **Deploy site** (or trigger a deploy from the **Deploys** tab).
- Wait for the build to finish. The site will be live at a URL like `random-name-123.netlify.app`.

---

## 5. Use your subdomain: dispatch.bgrdayton.com

1. In Netlify: **Site configuration** → **Domain management** → **Add custom domain** (or **Add domain alias**).
2. Enter **dispatch.bgrdayton.com**.
3. Netlify will show what to add at your DNS provider (where **bgrdayton.com** is managed – e.g. GoDaddy, Cloudflare, Namecheap).

**At your DNS provider (for bgrdayton.com):**

- Add a **CNAME** record:
  - **Name/host:** `dispatch` (or `dispatch.bgrdayton.com` depending on the provider).
  - **Value/target:** the Netlify hostname they give you, e.g. `random-name-123.netlify.app`.
- Or add an **A** record if Netlify gives you an IP (less common for Netlify).

4. In Netlify, enable **HTTPS** (Netlify will issue a certificate for dispatch.bgrdayton.com).
5. Wait for DNS to propagate (minutes to a few hours). Then open **https://dispatch.bgrdayton.com** – that’s your live app.

---

## 6. After go-live

- **PWA / “Install app”:** Techs open **https://dispatch.bgrdayton.com** in the browser and use **Add to Home Screen** / **Install app** so it works like an app.
- **Receipt links:** If you send receipts that link back to the app, use `https://dispatch.bgrdayton.com` as the base URL (e.g. in Resend or any “origin”/base URL config).
- **Stripe:** If you use Stripe redirect URLs, add `https://dispatch.bgrdayton.com` where needed (e.g. success/cancel URLs).
- **Supabase:** If you have redirect URLs or allowed origins in Supabase Auth, add `https://dispatch.bgrdayton.com`.

---

## Quick checklist

- [ ] Repo pushed to Git; site created on Netlify from that repo.
- [ ] All env vars set in Netlify (same names as `.env.local`).
- [ ] First deploy succeeded.
- [ ] Custom domain **dispatch.bgrdayton.com** added in Netlify.
- [ ] CNAME (or A) record added at DNS for `dispatch` → Netlify.
- [ ] HTTPS working on https://dispatch.bgrdayton.com.
- [ ] Login and main flows tested on the live URL.

You can change copy, features, and config later; the same repo and Netlify site will keep deploying on each push.
