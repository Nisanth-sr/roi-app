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

### 2. Local development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 3. First-use flow

1. Sign up with your company name.
2. Add clients (use `external_ref` matching IDs in your log exports).
3. Upload AI logs (CSV/JSON) and revenue (CSV) from **Upload**.
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
GET    /api/dashboard/summary
GET    /api/dashboard/clients/:id
GET    /api/red-flags
GET    /api/admin/pricing          (owner)
PUT    /api/admin/pricing/:id      (owner)
DELETE /api/uploads/batches/:id    (owner — rollback)
POST   /api/team/members           (owner)
```

## Upload formats

**Logs (CSV/JSON):** `client_id`, `request_timestamp`, `model_id`, `input_tokens`, `output_tokens`

**Revenue (CSV):** `client_id`, `revenue_amount`, `currency`, `period_month`

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

Sample files for testing: [fixtures/sample-logs.csv](./fixtures/sample-logs.csv), [fixtures/sample-revenue.csv](./fixtures/sample-revenue.csv).

## Deferred (Path A)

Live proxy, job queue, API gateway, and provider connectors are **not** in this MVP. Build when 3+ paying customers request real-time ingestion.

## Documentation

Product and architecture docs live in the sibling folder `../ROI-MIDDLEWARE-DOCS/`.
