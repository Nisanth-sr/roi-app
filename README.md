# AI ROI Middleware (Path B MVP)

Per-client margin visibility for AI wrapper companies. Upload AI request logs and client revenue — see which customers are quietly unprofitable.

## Stack

- **Next.js 16** (App Router) + TypeScript
- **Supabase** (Postgres, Auth, Row-Level Security)
- **Vercel** (hosting)

## Quick start

### 1. Supabase setup

1. Create a [Supabase Pro](https://supabase.com) project.
2. Run the migrations in order via the SQL editor:
   - [supabase/migrations/00001_initial_schema.sql](./supabase/migrations/00001_initial_schema.sql)
   - [supabase/migrations/00002_energy_per_outcome.sql](./supabase/migrations/00002_energy_per_outcome.sql) (energy estimates + coefficient seed)
   - [supabase/migrations/00003_tenant_onboarding_profile.sql](./supabase/migrations/00003_tenant_onboarding_profile.sql) (declared payment gateway + AI models)
3. Run [supabase/seed.sql](./supabase/seed.sql) to seed `model_pricing` (and energy coefficients if you skipped the seed block in 00002). Verify rates against live provider pages before pilot.
4. Copy `.env.example` to `.env.local` and fill in your keys.
5. (Optional) Enable **Google** sign-in: Supabase → Authentication → Providers → Google. In Google Cloud, set the authorized redirect URI to `https://<project-ref>.supabase.co/auth/v1/callback`. Set `NEXT_PUBLIC_SITE_URL` to your app origin (e.g. `http://localhost:3000`).
6. For **password reset**, add `${NEXT_PUBLIC_SITE_URL}/auth/callback` under Supabase → Authentication → URL configuration → Redirect URLs.
**Existing projects:** if Overview still shows margin cards but no energy (or a “schema not applied” banner), paste and run `00002_energy_per_outcome.sql`, then **Settings → Recompute margins & energy**. After `00003`, existing owners are sent to `/onboarding` once to declare their payment gateway and AI models; both are editable later under **Settings → Workspace profile**.

### 2. Local development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 3. First-use flow

1. Sign up with company name (email/password or **Continue with Google**).
2. Declare your payment gateway and AI models during onboarding (editable later under **Settings → Workspace profile**).
3. Upload revenue from **Upload** — drop in a raw Stripe/Paddle/Chargebee/Lemon Squeezy export, or a CSV in the internal format. Clients are created from the export automatically.
4. Upload AI logs using the pre-filled sample from **Upload** (it already lists your declared models and client refs).
5. View per-client margins on the **Overview** dashboard.

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
POST   /api/uploads/revenue        internal CSV or a native gateway export
GET    /api/samples/:type          logs | revenue | clients — per-tenant sample CSV
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

### Payment gateway exports (revenue)

The revenue upload also accepts a raw export from a supported gateway with no
reformatting. The format is detected from the file's column headers, settled
rows are grouped into one figure per client and month, and customers missing
from **Clients** are created automatically (toggle on the upload card). Where to
export from:

- **Stripe** — Dashboard → Payments → date filter → Export. Amounts are whole
  units; rows are kept when status is paid/succeeded and not fully refunded.
- **Paddle** — Reports → Transactions → Generate report, then download the
  emailed CSV. `grand_total` is read as minor units (cents); status must be
  completed, paid, or billed.
- **Chargebee** — Settings → Import & Export Data → Export Data → Invoices, or
  Logs → Transactions filtered to Success. `amount paid` is read as minor units.
- **Lemon Squeezy** — Orders → Export (CSV is emailed to the store owner).
  Revenue is `subtotal` minus `discount_total` in minor units.

Caveats, surfaced in the upload result so they are easy to verify:

- **Refunds and adjustments are not netted out.** Fully refunded charges are
  skipped, but partial refunds and credit notes are not subtracted.
- **Tax is excluded for merchant-of-record gateways** (Lemon Squeezy) since the
  tax collected is not your revenue.
- **One currency per client-month.** A client billed in two currencies in the
  same month is reported as an error instead of being summed — filter the export
  by currency and re-upload.
- **Amount units are assumed per gateway, never guessed from the data.** The
  result panel prints the computed total and the unit used, so a mismatch is
  visible immediately.

Customers are matched to clients by gateway customer id, then email, then name,
against `clients.external_ref` / `id` / `name`.

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

In-app sample downloads (Upload / Clients) come from `GET /api/samples/:type`
and are generated per workspace: the logs sample uses the AI models declared in
**Settings → Workspace profile** and your real client `external_ref`s, so it can
be filled in and uploaded without editing headers. Models entered as free-text
"other" are left out because they have no `model_pricing` row.

Static copies for tests and docs:
[public/samples/sample-logs.csv](./public/samples/sample-logs.csv),
[public/samples/sample-revenue.csv](./public/samples/sample-revenue.csv),
[public/samples/sample-clients.csv](./public/samples/sample-clients.csv).

## Deferred (Path A)

Live proxy, job queue, API gateway, and provider connectors are **not** in this MVP. Build when 3+ paying customers request real-time ingestion.

## Documentation

Product and architecture docs live in [`Knowledge/`](./Knowledge/):

- [Founder decision brief](./Knowledge/founder-decision-brief.md)
- [PRD — upload & dashboard](./Knowledge/prd-upload-dashboard-flow.md)
- [Technical architecture spec](./Knowledge/technical-architecture-spec.md)
- [ADR-006 — pricing gap behavior](./Knowledge/adr-006-pricing-gap.md)

Pilot gates: [WEEK0_CHECKLIST.md](./WEEK0_CHECKLIST.md), [PILOT_VALIDATION.md](./PILOT_VALIDATION.md).
