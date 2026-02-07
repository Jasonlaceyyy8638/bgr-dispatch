# BGR Garage Dispatch – Master Plan

**Use this doc as the single source of truth. We’ll refer back to it so nothing is forgotten.**

---

## Step progress (we go one step at a time)

| Step | Description | Status |
|------|-------------|--------|
| **Step 1** | Foundation: black theme, logo on all pages, base layout (Workiz/ServiceTitan style), Customers nav + placeholder page | ✅ Done |
| Step 2 | SMS: text customer when tech en route (RingCentral) | Next |
| Step 3 | SMS: text tech when assigned a new job (RingCentral) | Pending |
| Step 4 | Payments: Stripe wired to jobs/invoices | Pending |
| Step 5 | Admin Revenue screen: real data (jobs done, money in) | Pending |
| Step 6 | Customer database: add/edit/search, link to jobs | Pending |
| Step 7 | Inventory list: full build-out | Pending |
| Step 8+ | Polish and “the whole 9” | Pending |

---

## 1. Design & Look

- **Background:** Black everywhere (already in place).
- **Logo:** Your logo (`/logo.png`) on **every page** – login, dashboard, dispatch, inventory, revenue, tech views, etc.
- **Feel:** Similar to **Workiz** / **ServiceTitan** – professional field service / garage dispatch:
  - Sidebar nav with logo at top
  - Clear sections: Dashboard, Dispatch, Customers, Inventory, Revenue (admin), etc.
  - Cards and tables, clean typography, mobile-friendly

---

## 2. Integrations You Already Have

- **Stripe** – take payments (already in project).
- **RingCentral** – SMS/communications (SDK already in project; you have keys).
- **Supabase** – database and auth (already in project).

---

## 3. Features to Build (in order as we go)

| # | Feature | Notes |
|---|--------|------|
| 1 | **Foundation** | Black theme, logo on all pages, layout like Workiz/ServiceTitan. |
| 2 | **SMS – Customer** | Text customer when tech is **en route** (RingCentral). |
| 3 | **SMS – Tech** | Text tech when they are **assigned a new job** (RingCentral). |
| 4 | **Payments** | Take payments (Stripe – wire up to jobs/invoices). |
| 5 | **Admin Revenue Screen** | Main screen for admin: jobs done, money coming in, key metrics. |
| 6 | **Customer Database** | Add/edit/search customers; link to jobs. |
| 7 | **Inventory List** | Track parts/materials; link to jobs if needed. |
| 8 | **Rest of “the whole 9”** | Polish: dispatch flow, tech job flow, invoices, etc. |

---

## 4. Tech Stack (current)

- **Next.js 16** (App Router)
- **React 19**
- **Supabase** (DB + auth)
- **Stripe** (payments)
- **RingCentral SDK** (SMS)
- **Tailwind CSS**
- **TypeScript**

---

## 5. Pages / Areas

- **Login** – logo, black background, PIN login (tech users).
- **Dashboard (home)** – tech’s schedule; admin could see company overview.
- **Dispatch Center** – create/schedule jobs, assign techs.
- **Customers** – customer database (to be built/improved).
- **Inventory** – parts/materials list (to be built/improved).
- **Revenue** (admin) – jobs done, money in, transactions.
- **Admin – User management** – techs/users.
- **Tech – Job detail** – single job view, mark en route, complete, etc.
- **Tech – Invoice / Payment** – invoice and Stripe payment flow.

---

## 6. How we’re working

- **One step at a time** – we do one chunk (e.g. “Step 1: Foundation”), you can ask questions before we move on.
- **This file** – we’ll keep coming back to this plan so we don’t forget anything from the start.

---

*Last updated: when we started the rebuild. We’ll update this doc as we add or change features.*
