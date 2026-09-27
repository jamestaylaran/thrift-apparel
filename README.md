# Thrift Apparel

A full-stack thrift fashion e-commerce application built with React (Vite), Express, and **Supabase**.

## Features

- Customer storefront and product catalog
- Customer registration and login (**Supabase Auth**)
- Admin login and protected dashboard
- Product, inventory, order, and customer management
- Product image upload from the admin dashboard (**Supabase Storage**)
- Wishlist and cart flows with stock validation
- Checkout with database-backed, atomic order creation
- Responsive design for desktop, tablet, and mobile

## Tech Stack

- Frontend: React + Vite
- Backend: Node.js + Express (deployed as one Vercel Function)
- Database: Supabase (Postgres) — users, products, categories, carts, orders/sales, reviews
- Authentication: Supabase Auth (email + password), verified by the API
- Storage: Supabase Storage (`product-images` bucket)

## Project Structure

- `client/` – React frontend
- `server/` – Express API (all routes use the Supabase JS client)
- `lib/supabase.js` – server-side Supabase client (**service-role key**)
- `client/src/lib/supabase.js` – browser Supabase client (publishable key) + auth helpers
- `api/index.js` – Vercel entry point that exports the Express app
- `database/supabase_setup.sql` – full database schema for Supabase (run once)
- `database/supabase_seed.sql` – sample categories and products (optional)

---

## 1. Supabase setup

1. Create a project at <https://supabase.com/dashboard> (you already have one:
   `ygaaxvyhjiqigxeavfof`).
2. Open **SQL Editor → New query**, paste the entire contents of
   `database/supabase_setup.sql`, and press **Run**.
   This drops the old MySQL-style tables and recreates them linked to Supabase Auth,
   with Row Level Security enabled, the checkout function, and the Storage bucket.
3. *(Optional)* Seed sample data: paste `database/supabase_seed.sql` and **Run**.
4. Go to **Project Settings → API** and copy:
   - **Project URL** → `SUPABASE_URL`
   - **Project reference keys → secret** (`sb_secret_…`) → `SUPABASE_SECRET_KEY`
   - **Project reference keys → publishable** (`sb_publishable_…`) →
     `VITE_SUPABASE_PUBLISHABLE_KEY` (you may already have this value)

   Put the two `SUPABASE_*` values in the root `.env.local` (server) and the
   `VITE_*` values in `client/.env` (browser) — see `client/.env.example`.

### Create your admin account

1. Register an account on the site (or via the Admin Login page), then run:

   ```sql
   update public.users set role = 'admin' where email = 'you@example.com';
   ```

   Signups can never grant themselves the admin role — it is only set here.
   Alternative from the command line: `node scripts/promote-admin.mjs you@example.com`

### Email confirmation (recommended setting for development)

Supabase confirms emails by default, so new signups must click a link in their
inbox before they can log in. To simplify testing, turn it off under
**Authentication → Sign In / Providers → Email → Confirm email**. If you leave it
on, the register page shows a "check your email" message instead of logging in.

---

## 2. Local development

1. Install dependencies:

   ```bash
   npm install
   cd client && npm install && cd ..
   ```

2. Configure environment variables:

   - Root `.env.local`: `SUPABASE_URL`, `SUPABASE_SECRET_KEY`
   - `client/.env`: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`

3. Run the database scripts from step 1 (Supabase setup + optional seed).

4. Start backend and frontend together:

   ```bash
   npm run dev
   ```

5. Open the app:

   - Customer storefront: <http://localhost:5173>
   - Admin login: <http://localhost:5173/admin/login>

---

## 3. Deploying to Vercel

The whole app (React frontend + Express API) ships as **one Vercel project**:
the client is built as static files, and every `/api/*` request is handled by the
Express app running as a single serverless function (`api/index.js`).

Configuration lives in `vercel.json`:

```json
{
  "framework": null,
  "installCommand": "npm install",
  "buildCommand": "npm run build",
  "outputDirectory": "client/dist",
  "rewrites": [
    { "source": "/api/:path*", "destination": "/api/index" },
    { "source": "/:path((?!api/).*)", "destination": "/index.html" }
  ]
}
```

### Step A — push to GitHub

```bash
git add -A
git commit -m "Migrate to Supabase and add Vercel deployment"
git push
```

`.env`, `.env.local`, and logs are git-ignored — secrets never reach GitHub.

### Step B — import the project into Vercel

1. Go to <https://vercel.com/new> and import your repository.
2. **Root Directory** → leave it at the repository root (do **not** set it to `client`).
3. Build & Development settings are picked up from `vercel.json` automatically —
   leave the defaults alone (Framework: Other, Build: `npm run build`,
   Output: `client/dist`).

### Step C — set the environment variables

In Vercel: **Project → Settings → Environment Variables**, add for
*Production*, *Preview*, and *Development*:

| Name                               | Value                                             |
| ---------------------------------- | ------------------------------------------------- |
| `SUPABASE_URL`                     | `https://ygaaxvyhjiqigxeavfof.supabase.co`        |
| `SUPABASE_SECRET_KEY`              | `sb_secret_…` (from Supabase → Project Settings)  |
| `CLIENT_URL`                       | `https://your-app.vercel.app` (your real URL)     |
| `VITE_SUPABASE_URL`                | `https://ygaaxvyhjiqigxeavfof.supabase.co`        |
| `VITE_SUPABASE_PUBLISHABLE_KEY`    | `sb_publishable_…`                                |
| `VITE_API_URL`                     | `/api`                                            |
| `EMAIL_USER`                       | *(optional)* Gmail that sends order emails        |
| `EMAIL_APP_PASSWORD`               | *(optional)* Gmail app password                   |

> `VITE_*` variables are baked in at **build time** — re-deploy after changing them.
> `VITE_API_URL=/api` makes the client call the API on the same domain (no CORS needed).

### Step D — deploy

Press **Deploy**. When it finishes, open the site and check:

1. Storefront loads products: `https://your-app.vercel.app/api/health`
2. Register + login work
3. Admin dashboard loads (after promoting your account to admin)
4. Uploading a product image from the dashboard works (stored in Supabase Storage)

Every push to `main` now redeploys automatically.

### Optional — Gmail order emails

Enable 2-Step Verification on the sending Gmail account, create an
**App Password**, and set `EMAIL_USER` + `EMAIL_APP_PASSWORD` (locally in
`.env.local`, on Vercel in the dashboard). Checkout still succeeds if email is
not configured — the server just logs that the notification was skipped.

---

## Important notes

- The database is the source of truth for stock. Checkout runs the
  `place_order()` database function, which validates stock, creates the order,
  decreases inventory, and clears the cart in one transaction.
- Row Level Security is enabled with no browser policies: the browser can only
  reach the database through the Express API, which uses the secret key.
- The secret key (`SUPABASE_SECRET_KEY`) must never be exposed to the browser.
- Vercel functions have a request body limit of about 4.5 MB, so product images
  should stay under ~4 MB.

## Helper scripts

- `scripts/promote-admin.mjs <email>` – grant the admin role to an existing account
- `scripts/e2e-full.mjs` – end-to-end API smoke test (storefront, cart, checkout, admin)
- `scripts/e2e-admin.mjs` – admin product CRUD + image upload/Storage cleanup test

Run them with `node scripts/<name>.mjs` while the API is running locally.

## Legacy files

- `database/schema.sql` / `database/seed.sql` – the original MySQL versions,
  kept for reference only. Use `database/supabase_setup.sql` and
  `database/supabase_seed.sql` instead.
