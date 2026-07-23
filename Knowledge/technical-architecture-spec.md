# AI ROI Middleware — Technical Architecture Specification

**Audience:** Engineering team building the MVP.
**Companion document:** `founder-decision-brief.md` (plain-language version for non-technical stakeholders).
**Supersedes:** Section 5 (component diagram) of the original `AI_ROI_Middleware_Architecture_Brief.md`, which describes the post-MVP (Path A) system, not what should be built in the next 90 days. Section 6 (MVP scope), Section 7 (pricing table requirements), and Section 8 (security requirements) of that document remain in force and are incorporated below.
**Status of this document:** Living — update via new ADRs (don't silently edit old ones) as decisions change.
**Last verified against current vendor pricing/versions:** July 2, 2026. AI provider pricing in particular moves fast (see Appendix C) — reverify before relying on any dollar figure in this document for a real cost model.

---

## 0. Quick Reference

| Layer | Choice | Cost |
|---|---|---|
| Application framework | Next.js 16 (App Router) + TypeScript | — |
| Runtime | Node.js 24 LTS | — |
| Database / Auth / Row-level security | Supabase (Postgres, Pro plan) | ~$25/mo |
| Hosting | Vercel (Pro plan) | ~$20/mo |
| MVP scope | Path B only (batch log/revenue ingestion) | — |
| Explicitly deferred | Path A (live proxy), job queue, API gateway, provider SDK connectors | — |
| Non-negotiable from day one | Postgres Row-Level Security on every tenant-scoped table | — |

If you only read one section, read ADR-001 and ADR-005 — they define what NOT to build, which is the highest-leverage decision in this document.

---

## 1. ADR-001: MVP System Shape

**Status:** Accepted

**Context:** The original brief's Section 5 describes a distributed system (API Gateway, Auth Service, Proxy Service, async log-writer queue, dedicated AI provider connector code) sized for Path A — a live proxy sitting inside a real-time request, required to add less than 20ms of latency (50ms hard limit) without dropping a log. Section 6 of the same document correctly scopes the MVP to Path B only (batch upload of logs and revenue, no live provider calls). Those two sections describe different systems. Building Section 5's diagram as written would mean standing up and securing infrastructure with no traffic to justify it for at least the first 90 days.

**Decision:** Build the MVP as a modular monolith — a single deployable application, internally organized into clearly separated modules (`uploads/`, `pricing/`, `dashboard/`, `auth/`), rather than as multiple independently-deployed services. Do not build an API Gateway, a Proxy Service, a background job queue, or AI provider connector code in the MVP.

**Consequences:**
- *Positive:* Fewer moving parts to build, deploy, monitor, and secure in a 90-day window with a small team. One deployment pipeline. One place to look when something breaks.
- *Positive:* The "seam" for Path A is explicit and named (module boundaries drawn now), so extracting the proxy into its own service later is an addition, not a rewrite.
- *Negative:* If Path A gets pulled forward unexpectedly (e.g., a pilot customer makes real-time a hard requirement), the monolith needs the proxy logic added as a new module first, then likely extracted into its own service shortly after — a deliberate two-step rather than day-one separation. This is an acceptable cost given how unlikely that pull-forward is in month one.
- *Negative:* A monolith can accumulate coupling between modules if module boundaries aren't enforced by convention (no shared mutable state between `uploads/` and `dashboard/`, for instance). This needs discipline, not tooling, at this scale.

**Alternatives considered:**
- *Build Section 5's full distributed system now.* Rejected — no current traffic or requirement justifies the operational and security surface area of a live proxy, a queue, and a gateway. This is the single clearest instance of building for a stage that doesn't exist yet.
- *Pure serverless, one function per endpoint, no shared application shell.* Viable, but adds cold-start variability and multiple independently-versioned deployables for a five-person team, without a corresponding benefit at this traffic level. Not chosen, but not unreasonable — revisit if the team specifically wants this operational model.

**Trigger to revisit:** Once Path A is actually being built — realistically, once a handful of paying customers specifically request real-time numbers instead of monthly upload. At that point, extract a dedicated proxy service; do not attempt to make the existing monolith serve live proxy traffic in place.

---

## 2. ADR-002: Application Framework & Language

**Status:** Accepted

**Context:** The MVP needs both a customer-facing dashboard (React-based, per the original brief's Section 6.3 recommendation) and a small set of backend endpoints (file upload, pricing CRUD, dashboard data). Team's stated strength is JavaScript/Node; the team is starting from a blank slate with no existing code or infrastructure commitments.

**Decision:** Next.js 16 (App Router), TypeScript, running on Node.js 24 LTS. Frontend and backend (API routes / route handlers) live in one Next.js project.

| Option | Optimizes for | Cost (money + engineer time) | Weakness | Team fit |
|---|---|---|---|---|
| **Next.js full-stack (chosen)** | Fewest moving parts; one deploy for UI + API | Lowest engineer-time cost for a team that needs both a dashboard and simple CRUD/upload endpoints | Serverless function execution limits make it a poor long-term home for a live, always-on proxy (irrelevant to MVP; relevant to Path A) | High — team already knows JS/Node; React/Next.js is a short hop, not a new stack |
| Express or Fastify (API) + separate React/Vite frontend | Maximum flexibility, no framework opinions on the backend | Two deployables, two sets of tooling, more setup time before the first feature ships | More initial scaffolding for a benefit (flexibility) the MVP doesn't need yet | High — same language, more moving parts |
| NestJS (API) + separate React frontend | Enforced structure, dependency injection, easier onboarding for larger future teams | Steeper learning curve, more ceremony/boilerplate for a 5-person team building one product surface | Optimizes for a team size and complexity level this project doesn't have yet | Medium — Node-based but a more opinionated framework than the team has necessarily used |

**Recommendation rationale:** Given a blank slate, a small team, and a 90-day window, minimizing the number of things to build, deploy, and separately monitor dominates. Next.js full-stack does that without asking the team to learn a new language. This is explicitly a stage call: none of the three options are "wrong" in the abstract, and NestJS in particular would look like the right call once the team and codebase are meaningfully larger.

**Consequences:**
- *Positive:* One CI pipeline, one deploy target, one repo to onboard a new engineer into.
- *Negative:* When Path A is built, its proxy logic should not run as a Next.js API route — it needs a persistent, always-on process. Plan for a second, small Node/Express (or Fastify) service at that point, deployed separately (see ADR-004 for where).

**Alternatives considered:** See table above.

**Trigger to revisit:** If the team grows past roughly 8-10 engineers actively shipping to this codebase and deploys start blocking each other (Conway's Law signal — org structure and code structure diverging), reconsider splitting the monolith along its existing module boundaries.

---

## 3. ADR-003: Data Layer, Authentication & Tenant Isolation

**Status:** Accepted

**Context:** The product's core trust proposition is holding other companies' revenue and usage data. Section 8 of the original brief correctly requires row-level security (RLS) — database-enforced rules that prevent one tenant's queries from ever returning another tenant's rows — as a non-negotiable, not a post-MVP hardening step. The team also needs basic email/password authentication (Section 6.1) without spending scarce engineering time building and maintaining it by hand.

**Decision:** Supabase (Pro plan) for Postgres, authentication, and RLS policy enforcement.

| Option | Optimizes for | Cost | Weakness | Team fit |
|---|---|---|---|---|
| **Supabase (chosen)** | Postgres + Auth + RLS + Storage in one bundle; least custom code to write and maintain | ~$25/mo (Pro; free tier auto-pauses after 1 week of inactivity, unacceptable for anything customer-facing) | Compute is billed 24/7 once on Pro (no scale-to-zero); vendor-coupled auth (migration cost if ever leaving) | High — standard Postgres underneath, works with any Node ORM; RLS policies are plain SQL |
| Railway or Render managed Postgres + hand-rolled auth (e.g., Lucia, Auth.js) | Fewer vendors, potentially marginally cheaper compute | Real engineering time to build and maintain password hashing, session handling, and RLS policy wiring by hand — the exact area where mistakes are least affordable here | More code to get right in the one area this document says can't be simple-and-wrong | High on Node/Postgres fundamentals; adds a genuine auth-implementation task the team hasn't been asked to do yet |
| Self-managed Postgres on raw AWS RDS | Maximum control, no vendor lock-in | Meaningfully more setup and ongoing operational burden (patching, backups, connection pooling) than a 5-person team building an MVP should take on | Solves a problem (control) this stage doesn't have | Requires DevOps depth not confirmed present on this team |

**Recommendation rationale:** RLS is the one place this document insists on doing it right immediately rather than simply. Supabase's RLS tooling and built-in auth materially de-risk that specific requirement and save real engineering time elsewhere in a tight window — a direct trade of a small, predictable monthly fee against the highest-consequence area of the whole build.

**Consequences:**
- *Positive:* Every tenant-scoped table gets a `tenant_id` column and an RLS policy restricting rows to the caller's tenant, enforced at the database layer — not something that can be silently bypassed by a bug in application code.
- *Positive:* Auth (signup, login, session/JWT handling) is not custom code the team has to maintain.
- *Negative:* Compute runs 24/7 on the Pro plan (no idle-based scale-to-zero); acceptable at this cost level, worth monitoring if usage stays extremely low for a long stretch.
- *Negative:* Real vendor coupling on auth specifically — migrating off Supabase Auth later is a genuine (if not urgent) migration project, not a config change.

**Alternatives considered:** See table above.

**Trigger to revisit:** If Supabase's usage-based overages (bandwidth, storage beyond the Pro allocation) start exceeding roughly $150–200/month, get a real quote for self-managed Postgres + a dedicated auth library and compare total cost including engineer time to maintain it, not just the sticker price.

**Required implementation detail (not optional, not deferred):**
- Every table containing tenant-scoped data (`clients`, `ai_request_log`, `client_revenue`, `monthly_client_summary`) has RLS enabled from its first migration.
- RLS policies are written and tested before any real data — including pilot/test data — is loaded.
- The Supabase service-role key (which bypasses RLS) is never used in any code path reachable by a request that carries tenant context; it exists only for trusted server-side admin/migration tasks.

---

## 4. ADR-004: Hosting & Deployment

**Status:** Accepted

**Context:** Blank slate, no existing infrastructure or vendor commitments. Small team, lean/bootstrapped budget assumption (~90-day self-imposed target, not contractual).

**Decision:** Vercel (Pro plan) for the Next.js application. Supabase (per ADR-003) hosts the database.

| Option | Optimizes for | Cost | Weakness | Team fit |
|---|---|---|---|---|
| **Vercel (chosen)** | Best-in-class Next.js deployment experience (same company builds both); zero-config CI/CD, preview URLs per pull request | ~$20/mo for one seat on Pro. **Hobby (free) tier explicitly prohibits commercial use — not an option for this product regardless of budget** | Serverless function execution limits (fine for Path B's CRUD/upload workloads; not a fit for a future always-on proxy); per-seat pricing gets expensive as the team grows | High — purpose-built for exactly the framework chosen in ADR-002 |
| Railway (app + Postgres, skip Supabase) | Single vendor, single bill, usage-based pricing that can be cheaper at low traffic | Realistic $15-30/mo combined; loses Supabase's built-in RLS tooling and auth, pushing real engineering time onto hand-rolled auth (see ADR-003) | Trades a vendor for engineering time in exactly the area this document says shouldn't be simplified | High |
| Render (app + Postgres, skip Supabase) | Predictable flat pricing, mature production track record, better multi-region support | Free tier web services sleep after 15 minutes of inactivity (bad first impression for a pilot customer); Starter tier ~$7/mo/service for always-on | Same auth/RLS trade-off as Railway above | High |

**Recommendation rationale:** Given ADR-002 already commits to Next.js and ADR-003 already commits to Supabase for the database, Vercel is the lowest-friction pairing for the app itself. The Path A proxy — when it's built — should not run on Vercel regardless of this decision, because a live, always-on process doesn't fit a serverless execution model well; it should be a small dedicated service on Railway, Render, Fly.io, or similar, decided at that time. This keeps today's decision cheap to be wrong about.

**Consequences:**
- *Positive:* Deploy-on-git-push, automatic preview environments per pull request, minimal DevOps burden for a team without a dedicated infrastructure engineer.
- *Negative:* Must be on the paid Pro tier from the start — budget ~$20/month as a hard floor, not an eventual upgrade.
- *Negative:* If the team scales past 2-3 people needing dashboard/deploy access, per-seat pricing compounds; revisit at that point.

**Alternatives considered:** See table above.

**Trigger to revisit:** When Path A's proxy service needs to be built (same trigger as ADR-001/ADR-005) — that service gets its own hosting decision at that time, made against the actual latency and uptime requirements known then, not guessed at now.

---

## 5. ADR-005: Explicit Deferral of Path A Infrastructure

**Status:** Accepted — this ADR exists specifically so "we're not building X" is a recorded decision, not a silent omission someone rediscovers by accident.

**Context:** See ADR-001. This ADR itemizes precisely what's deferred and the trigger for each, consolidated in one place so nobody has to reconstruct the reasoning from four other documents.

**Decision:** The following are explicitly out of scope for the MVP. Building any of them without revisiting this ADR is a scope change that should be a conscious decision, not a drift.

| Deferred item | Original brief section | Trigger to build |
|---|---|---|
| Live Proxy Service | 4.1 (Path A), 5.2 | 3+ paying customers specifically requesting real-time numbers over monthly upload |
| Redis-backed async log queue | 5.2 | Same as above — only needed to keep a live request non-blocking; nothing in the MVP is a live request |
| API Gateway | 5 | Same as above — becomes relevant once external systems call this product live, not while 5 known pilots upload files |
| AWS Bedrock / Google Vertex connector code | 5, Q1/Q2 (Section 9) | Same as above |
| Decision on whose cloud credentials to hold (customer-owned vs. cross-account IAM) | Section 9, Q1 | Same as above — this question doesn't exist until there's a live proxy to hold credentials for |
| Edge vs. regional deployment for proxy latency | Section 9, Q2 | Same as above. Note: the raw latency budget (<20ms target, <50ms hard limit) is already set in Section 5.2; only the deployment topology to hit it is deferred |
| On-prem / self-hosted deployment option | Section 9, Q7 | First real prospect who makes it a hard requirement |
| Stripe/Paddle billing integration | 6.1 | Once past pilot stage and manual CSV revenue upload becomes the bottleneck |

**Consequences:** Anyone proposing to build one of these items should open a new ADR referencing this one, stating what changed (usually: a specific customer commitment), rather than adding the code quietly.

---

## 6. Data Model

Builds on and refines the original brief's schema. Tenant-scoped tables (marked 🔒) require RLS per ADR-003.

### `tenants`
The AI wrapper company using this product (your paying customer).
- `id` (uuid, pk)
- `name`
- `created_at`

### `tenant_members` 🔒
Maps Supabase `auth.users` to tenants (supports more than one user per tenant from day one, even though MVP onboarding likely starts with one).
- `tenant_id` (fk → tenants)
- `user_id` (fk → Supabase `auth.users`)
- `role` (`owner` | `member`)

### `clients` 🔒
Your tenant's own customers — the entity "per-client margin" is calculated for.
- `id` (uuid, pk)
- `tenant_id` (fk)
- `name`
- `external_ref` (optional — the client identifier as it appears in the tenant's own systems, for matching upload rows)
- `created_at`

### `model_pricing`
Not tenant-scoped — one shared, admin-editable table (Section 7 of the original brief requires this be editable without a code deploy).
- `id` (uuid, pk)
- `provider` (`bedrock` | `vertex`)
- `model_id` (provider's model identifier)
- `input_price_per_1m` (numeric)
- `output_price_per_1m` (numeric)
- `cached_input_price_per_1m` (numeric, nullable)
- `effective_from` (date)
- `effective_to` (date, nullable — null means currently active; **never delete a row, only close its date range**, per the original brief's Q6 answer, so historical logs can always be re-priced correctly)
- `verified_at` (timestamp — when a human last confirmed this against the provider's live pricing page; added specifically because provider pricing changes fast enough that "when was this last checked" is operationally important, not cosmetic)
- `source_url`

### `ai_request_log` 🔒
Path B ingestion target. One row per AI request, as reported by the tenant's own logs.
- `id` (uuid, pk)
- `tenant_id` (fk)
- `client_id` (fk → clients)
- `requested_at` (timestamp, from the source log — not upload time)
- `provider`, `model_id`
- `input_tokens`, `output_tokens`
- `computed_cost` (numeric — calculated at ingestion time against `model_pricing` effective at `requested_at`, never recalculated retroactively; this is the specific design choice that keeps historical numbers stable even after prices change)
- `upload_batch_id` (fk → `upload_batches` — lets a bad upload be identified and rolled back cleanly)
- `source` (`csv` | `json`)

### `upload_batches` 🔒
- `id` (uuid, pk)
- `tenant_id` (fk)
- `uploaded_by` (fk → user)
- `file_type` (`ai_request_log` | `client_revenue`)
- `row_count`, `error_count`
- `uploaded_at`

### `client_revenue` 🔒
- `id` (uuid, pk)
- `tenant_id` (fk)
- `client_id` (fk)
- `month` (date, first-of-month convention)
- `revenue_amount` (numeric)
- `currency`
- `upload_batch_id` (fk, nullable — null if entered manually)

### `monthly_client_summary` 🔒
Computed, not user-entered. Rebuilt by the rollup job.
- `tenant_id`, `client_id`, `month` (composite key)
- `total_cost`, `total_revenue`, `margin` (`total_revenue - total_cost`), `margin_percent`
- `red_flag` (boolean — margin_percent below a configurable threshold; threshold itself lives in `tenants` or a settings table, not hardcoded)
- `computed_at`

**RLS pattern (applies to every 🔒 table):** policy restricts rows to where `tenant_id` matches the tenant(s) the authenticated user belongs to per `tenant_members`. Implement and test this policy before loading any data, including test/pilot data.

---

## 7. API Surface (MVP)

All routes tenant-scoped via the authenticated session except where noted.

```
POST   /api/uploads/logs              multipart CSV/JSON upload → ai_request_log
POST   /api/uploads/revenue           multipart CSV upload → client_revenue
GET    /api/clients                   list clients for the authenticated tenant
POST   /api/clients                   create a client
GET    /api/dashboard/summary         portfolio-level overview (current month)
GET    /api/dashboard/clients/:id     per-client margin detail + history
GET    /api/red-flags                 clients below the margin threshold, current month
GET    /api/admin/pricing             view model_pricing (admin role)
PUT    /api/admin/pricing/:id         edit/close a model_pricing row (admin role, audit-logged)
GET    /api/tenant/settings           tenant name + red_flag_threshold
PATCH  /api/tenant/settings           update threshold (owner)
POST   /api/dashboard/recompute       rebuild monthly_client_summary (owner)
```

Authentication itself (`signup`, `login`, `session`) is handled by the Supabase client library, not custom routes — do not build a parallel auth API.

---

## 8. Security & Compliance Checklist

Operationalized from the original brief's Section 8, plus the RLS emphasis from ADR-003.

- [ ] RLS enabled on every 🔒 table before any data (including test data) is loaded
- [ ] RLS policies covered by automated tests that assert cross-tenant reads fail
- [ ] Supabase service-role key confined to trusted server-side/admin paths only, never exposed to any client-reachable code path
- [ ] All traffic over HTTPS (default on Vercel + Supabase — verify no plain-HTTP fallback is left enabled anywhere)
- [ ] Basic rate limiting on upload endpoints (prevents accidental or malicious repeated large uploads; doesn't require a dedicated gateway at this scale)
- [ ] Audit log on `model_pricing` edits — who changed what, when (pricing errors directly affect a customer-facing margin number, so this needs to be reconstructable)
- [ ] Data Processing Agreement drafted and reviewed by an actual lawyer before the first pilot customer's data is loaded — **not something this document or any AI tool should draft**
- [ ] Backup posture: Supabase Pro's standard automatic daily backups, unless a specific customer commitment requires more (flag to revisit if so — see Open Items)

---

## 9. Build Sequencing (90-day window)

A sequencing suggestion, not a locked commitment — adjust against actual team velocity after week 2.

| Weeks | Focus |
|---|---|
| 1–2 | Repo + Next.js scaffold, Supabase project, core schema migration with RLS policies, auth wiring, basic CI/deploy to Vercel |
| 3–5 | Upload flows: CSV/JSON parsing and validation for logs and revenue, `model_pricing` seed data + admin edit screen |
| 6–8 | Rollup job (cost computation + monthly aggregation), dashboard UI (portfolio view, per-client view, red-flag list) |
| 9–10 | Pilot onboarding flow, multi-user-per-tenant basics, edge cases (partial/duplicate uploads, malformed files) |
| 11–12 | Buffer: bug fixes, onboard first pilot customers, validate the log-export assumption (see founder brief's "Risks worth watching"), decide on Path A timing based on real pilot feedback |

---

## 10. Non-Goals (explicit)

Do not build, in this phase: multi-currency conversion beyond storing a currency field, role-based permissions beyond `owner`/`member`, white-labeling, SSO, any AI provider beyond Bedrock and Vertex, mobile apps, or anything listed in ADR-005.

---

## 11. Open Items

| Item | Status | Default if unresolved |
|---|---|---|
| Database backup/recovery SLA beyond Supabase standard | Open | Supabase Pro standard daily backups |
| Margin-percent threshold for `red_flag` | **Implemented** — `tenants.red_flag_threshold` (default 20%), editable in Settings | Start at 20%; adjust per tenant without a migration |
| Pricing gap (row outside any priced range) | **Resolved — ADR-006** | Fail row, keep batch; see `Knowledge/adr-006-pricing-gap.md` |
| DPA legal review | Open — not an engineering task | Block pilot customer data loading until resolved — track in `WEEK0_CHECKLIST.md` |

---

## Appendix A: Version Reference (verified July 2, 2026 — reverify before relying on these for a production build months from now)

- **Node.js:** 24.x is the current Active LTS release; 22.x remains in Maintenance LTS. Build against 24 LTS.
- **Next.js:** 16.2.x is current stable, requires Node 20+ (24 LTS exceeds this comfortably), uses Turbopack as the default bundler and React 19.2.

## Appendix B: Hosting Cost Reference (verified July 2, 2026)

- **Supabase Pro:** $25/mo base (includes $10 compute credit covering one Micro instance), 8GB database, RLS + Auth + Storage included. Free tier available but auto-pauses after 7 days of inactivity — not viable for a product real customers log into.
- **Vercel Pro:** $20/mo per seat. **Hobby (free) tier prohibits commercial use by its own terms — not a legally viable option regardless of budget.**

## Appendix C: AI Provider Pricing Reference — illustrative only, DO NOT hardcode

Provider pricing and even model lineups changed multiple times in the few months before this document was written (new model families launched, older ones deprecated on public timelines). This is precisely why `model_pricing` is a database table with `verified_at` and `source_url` columns rather than a constant in code. Example rates observed July 2, 2026, per million tokens (input/output), for seeding development data only:

- AWS Bedrock — Claude Sonnet 4.6: $3 / $15. Claude Opus 4.6: $5 / $25. Claude Haiku 4.5: $1 / $5. (Claude Sonnet 5 has also just become available on Bedrock at introductory pricing time-limited through August 31, 2026 — confirm current rate before using it as a seed value.)
- Google Vertex AI — Gemini pricing varies widely by tier and changes frequently; recent examples ranged from roughly $0.10/$0.40 (Flash-Lite tier) to $2/$12 (Pro tier) per million tokens, with several model generations turning over within the same quarter.

Before the first real customer log is priced, whoever owns `model_pricing` must pull current rates directly from `aws.amazon.com/bedrock/pricing` and `cloud.google.com/vertex-ai/generative-ai/pricing` — not from this appendix.
