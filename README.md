# uVote

A pay-per-vote fundraising platform for school departments, clubs and halls —
awards nights, pageants, talent shows and similar campus events. Voters pay
with mobile money or card to support a nominee; there's no account required
to vote, no public leaderboard, and no one-person-one-vote limit — it's a
fundraiser, not an election.

**Stack:** Next.js 16 (App Router) · PostgreSQL + Drizzle ORM · JWT auth ·
Paystack (test-mode simulation by default, real integration when you add keys)

## Local development

1. **Postgres** — have a local Postgres 16 instance running, then create the
   database:
   ```bash
   createdb campusvote
   ```
2. **Environment variables** — copy `.env.local` (already present in this
   repo for local dev) and fill in real values before deploying anywhere
   public. See [Environment variables](#environment-variables) below.
3. **Install & migrate:**
   ```bash
   npm install
   npm run db:migrate   # applies drizzle/ migrations
   npm run db:seed      # creates the admin + demo organizer login only —
                         # no fake events, categories or votes
   ```
4. **Run it:**
   ```bash
   npm run dev
   ```
   Visit http://localhost:3000. Demo logins from the seed script:
   - `admin@uvote.app` / `admin12345` (platform admin)
   - `organizer@uvote.app` / `organizer123` (organizer, Computer Science Dept)

## Environment variables

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | Yes | Postgres connection string. |
| `JWT_SECRET` | Yes | Long random string signing session cookies. Generate with `openssl rand -base64 32`. |
| `NEXT_PUBLIC_APP_URL` | Yes | Public base URL (`http://localhost:3000` locally; your real domain in production). Used to build Paystack callback/webhook URLs. |
| `PAYSTACK_SECRET_KEY` | No (see below) | Paystack secret key. Leave blank to use the built-in test-mode simulator. |
| `PAYSTACK_PUBLIC_KEY` | No | Paystack public key, needed once you go live. |
| `PLATFORM_COMMISSION_PERCENT` | No | Default commission percent applied to new organizations (currently defaulted at the DB level to 8%). |

**About test mode:** with `PAYSTACK_SECRET_KEY` unset, `src/lib/paystack.ts`
simulates a successful payment and redirects straight to the callback route
— useful for building and testing without a Paystack account. The webhook
route (`/api/webhooks/paystack`) rejects unsigned requests once a real key
is present, so nothing "fake-settles" once you're live.

## Deploying

1. **Host:** [Vercel](https://vercel.com) is the natural fit for a Next.js
   app — connect the GitHub repo and it deploys on every push.
2. **Database:** local Postgres won't be reachable from Vercel. Use a
   hosted Postgres with a free tier — [Neon](https://neon.tech) or
   [Supabase](https://supabase.com) both work well with Drizzle. Point
   `DATABASE_URL` at it and run `npm run db:migrate` once (locally, with
   `DATABASE_URL` temporarily pointed at the hosted DB, or via a one-off
   Vercel deploy hook).
3. **Environment variables:** set all of the table above in Vercel's
   Project Settings → Environment Variables. Set `NEXT_PUBLIC_APP_URL` to
   your real deployed URL.
4. **Domain:** the free `*.vercel.app` subdomain works immediately; add a
   custom domain in Vercel's settings whenever you're ready.

### Going live with Paystack

The app runs in a safe, no-money-moves test mode until you add real keys:

1. Create a Paystack business account and complete KYC (Ghanaian business
   registration + bank/mobile money details for payouts).
2. Copy the **live** secret and public keys into `PAYSTACK_SECRET_KEY` /
   `PAYSTACK_PUBLIC_KEY` in your production environment.
3. In the Paystack dashboard, add a webhook pointed at
   `https://<your-domain>/api/webhooks/paystack` — this is the
   authoritative path that confirms payment and counts a vote (see
   `src/lib/vote-settlement.ts`); the browser callback is just a fast
   redirect and never trusts the client's word alone.
4. Do one real, small test transaction end-to-end before announcing it
   publicly.

### A note on the checkout rate limiter

`src/lib/rate-limit.ts` is an in-memory limiter — it works because this app
runs as a single long-lived process. If you ever move to a platform that
runs multiple serverless instances (Vercel's default for API routes can),
each instance gets its own memory, so the effective limit multiplies by
instance count. If that starts to matter, swap it for a shared store
(Upstash Redis or Vercel KV) behind the same `checkRateLimit()` function
signature — nothing calling it needs to change.

## Project structure

- `src/app` — routes (App Router). Public site, `/login` `/register`,
  `/dashboard/organizer/*`, `/dashboard/admin/*`, `/events/[slug]` (public
  voting page), `/api/*` (all mutations and Paystack integration).
- `src/db/schema.ts` — Drizzle schema (organizations, users, events,
  categories, nominees, payments, payouts).
- `src/lib` — auth/session helpers, data-fetching helpers, Paystack client,
  vote settlement (the one place a vote is ever counted), rate limiting.
- `drizzle/` — generated SQL migrations. Run `npm run db:generate` after
  changing `src/db/schema.ts`, then `npm run db:migrate` to apply.

## Scripts

```bash
npm run dev          # local dev server (Turbopack)
npm run build         # production build
npm run start          # run a production build locally
npm run lint            # eslint
npm run db:generate      # generate a new migration from schema changes
npm run db:migrate        # apply pending migrations
npm run db:seed            # create admin + demo organizer login (no fake events)
```
