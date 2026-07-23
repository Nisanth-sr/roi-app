# AI ROI Middleware (Path B MVP)

Per-client margin visibility for AI wrapper companies. Upload AI request logs and client revenue — see which customers are quietly unprofitable.

## Stack

- **Next.js 16** (App Router) + TypeScript
- **Supabase** (Postgres, Auth, Row-Level Security)
- **Vercel** (hosting)

## Quick start

### 1. Supabase setup

1. Create a [Supabase Pro](https://supabase.com) project.
2. Run the migration in [supabase/migrations/00001_initial_schema.sql](./supabase/migrations/00001_initial_schema.sql) via the SQL editor.
3. Run [supabase/seed.sql](./supabase/seed.sql) to seed `model_pricing` (verify rates against live provider pages before pilot).
4. Copy `.env.example` to `.env.local` and fill in your keys.
5. (Optional) Enable **Google** sign-in: Supabase → Authentication → Providers → Google. In Google Cloud, set the authorized redirect URI to `https://<project-ref>.supabase.co/auth/v1/callback`. Set `NEXT_PUBLIC_SITE_URL` to your app origin (e.g. `http://localhost:3000`).

### 2. Local development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 3. First-use flow

1. Sign up with company name (email/password or **Continue with Google**).
2. Add clients (manually or CSV import on **Clients**; use `external_ref` matching IDs in your log exports).
3. Upload AI logs (CSV/JSON) and revenue (CSV/JSON) from **Upload**.
4. View per-client margins on the **Overview** dashboard.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run test` | Unit tests (pricing, validation) |
| `npm run test:rls` | RLS integration tests (requires Supabase env) |
| `npm run lint` | ESLint |

## API routes

```
POST   /api/uploads/logs
POST   /api/uploads/revenue
GET    /api/clients
POST   /api/clients
POST   /api/clients/upload         multipart CSV/JSON → clients
GET    /api/dashboard/summary
GET    /api/dashboard/clients/:id
GET    /api/red-flags
GET    /api/admin/pricing          (owner)
PUT    /api/admin/pricing/:id      (owner)
DELETE /api/uploads/batches/:id    (owner — rollback)
POST   /api/team/members           (owner)
GET    /api/tenant/settings
PATCH  /api/tenant/settings        (owner — red-flag threshold)
POST   /api/dashboard/recompute    (owner — refresh rollups after threshold change)
```

## Upload formats

**Logs (CSV/JSON):** `client_id`, `request_timestamp`, `model_id`, `input_tokens`, `output_tokens`

**Revenue (CSV/JSON):** `client_id`, `revenue_amount`, `currency`, `period_month`

**Clients (CSV/JSON):** `name`, `external_ref` (optional; aliases: `client_name`, `client_id`, etc.)

Invalid rows are counted and reported — never silently dropped.

## Security

- Row-Level Security on all tenant-scoped tables from first migration.
- Service-role key is server-only (team invite, RLS tests).
- No raw prompt/response content stored — token counts only.
- Complete [WEEK0_CHECKLIST.md](./WEEK0_CHECKLIST.md) (DPA) before loading real pilot data.

## Deployment (Vercel Pro)

1. Push to GitHub and import in Vercel.
2. Set environment variables from `.env.example`.
3. Vercel Pro is required for commercial use.

## Fixtures

Sample files for testing: [fixtures/sample-logs.csv](./fixtures/sample-logs.csv), [fixtures/sample-revenue.csv](./fixtures/sample-revenue.csv), [fixtures/sample-clients.csv](./fixtures/sample-clients.csv).

## Deferred (Path A)

Live proxy, job queue, API gateway, and provider connectors are **not** in this MVP. Build when 3+ paying customers request real-time ingestion.

## Documentation

Product and architecture docs live in [`Knowledge/`](./Knowledge/):

- [Founder decision brief](./Knowledge/founder-decision-brief.md)
- [PRD — upload & dashboard](./Knowledge/prd-upload-dashboard-flow.md)
- [Technical architecture spec](./Knowledge/technical-architecture-spec.md)
- [ADR-006 — pricing gap behavior](./Knowledge/adr-006-pricing-gap.md)

Pilot gates: [WEEK0_CHECKLIST.md](./WEEK0_CHECKLIST.md), [PILOT_VALIDATION.md](./PILOT_VALIDATION.md).
