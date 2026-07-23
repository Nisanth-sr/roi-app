# PRD — Upload & dashboard flow
AI ROI Middleware · MVP (Path B) · Draft v0.1

**Status:** Draft
**Scope:** The recurring pipeline — upload, validate & price, store, roll up, dashboard. Tenant onboarding (signup, adding clients) is a dependency of this flow, not part of its scope.
**Stakeholders:** Founder/PM, engineering (~5-person team)

---

## 1. Executive summary

This flow is the product. A tenant drags in two files — their AI request logs and that month's client revenue — and within seconds sees which of their clients are quietly costing more than they pay. Everything else in the system (auth, tenant setup) exists to get a tenant to this screen; the entire pitch depends on this screen being fast, accurate, and safe to trust with someone else's revenue numbers.

## 2. Problem statement

### 2a. User problem
**Persona:** Founder or PM at a small AI-wrapper SaaS company (content generators, AI writing tools) charging flat subscription fees while paying their LLM provider by usage.

**Current state:** They can see overall gross margin from their accounting, but nothing connects any individual client to their AI spend — that link exists only, unread, in raw request logs.

**Desired state:** Upload what they already have and see real margin per client, without manually cross-referencing two systems.

### 2b. Business problem
A single client's usage outgrowing what the wrapper company's pricing assumed can flip a healthy margin negative — and by the time it's visible in the aggregate P&L, it's already been happening for a while.

### 2c. Evidence
- One production AI company's gross margin reportedly swung from 36% to -14% after a single customer's usage outgrew its pricing — the exact scenario this flow exists to catch early.
- Adjacent tools (Langfuse, Datadog's LLM observability add-on, Braintrust) already track AI cost per customer. None combine it with the tenant's own revenue to produce a margin number — that fusion, not the token-counting, is the wedge.

## 3. Goals & success metrics

| Metric | Type | Target | Notes |
|---|---|---|---|
| Time from successful upload to a visible per-client margin number | Primary | Single-digit seconds at pilot scale | [ASSUMPTION: no formal target exists in source docs; this operationalizes the stated goal of "a few seconds after dragging in a file"] |
| % of uploaded log rows priced successfully without manual intervention | Secondary | — | Data-quality signal; no baseline yet |
| % of pilots completing first upload without a support contact | Secondary | — | Onboarding-quality signal |
| Rows silently dropped | Counter | 0%, always | Every failed row must appear in a visible error count — a stated design principle, not a target to trade off |

## 4. Non-goals (explicitly out of scope)

This flow will **not**:
- Call any AI provider directly, or sit in the path of a live AI request (that's Path A)
- Route through an API Gateway, background job queue, or dedicated proxy service
- Connect directly to AWS Bedrock or Google Vertex
- Sync revenue automatically from Stripe/Paddle (revenue arrives via the same upload as logs)
- Support on-prem or self-hosted deployment

All five share one trigger: 3+ paying pilots specifically requesting real-time numbers over monthly upload. None are being designed around — they're deferred, not foreclosed.

## 5. User stories

**Story 1 — Upload**
AS A tenant admin, I WANT TO upload my AI request log file and my client revenue file, SO THAT I see real per-client margin without manual spreadsheet work.
- GIVEN a tenant with at least one client already added
- WHEN they upload a valid log file and a valid revenue file
- THEN both are validated, priced, and stored, and an `upload_batches` record tracks the attempt
- AND they see a success confirmation with row counts

**Story 2 — Validation errors**
AS A tenant admin, I WANT TO see exactly which rows failed and why, SO THAT I can fix my export and re-upload with confidence.
- GIVEN an uploaded file with some invalid rows (missing client, non-numeric tokens, bad timestamp)
- WHEN validation runs
- THEN valid rows are priced and stored; invalid rows are excluded and counted
- BUT no row is ever dropped without being reflected in that count

**Story 3 — Portfolio dashboard**
AS A tenant admin, I WANT TO see all my clients' margins at a glance, worst-first, SO THAT I know where to look immediately.
- GIVEN at least one successful upload and rollup for the current period
- WHEN the tenant opens the dashboard
- THEN they see a portfolio summary and a worst-to-best sorted client list
- AND clients crossing the red-flag threshold are visually distinguished

**Story 4 — Red flags**
AS A tenant admin, I WANT TO see a dedicated list of clients crossing the margin threshold, SO THAT I don't have to scan the full list to find who needs attention.
- GIVEN a rollup has run for the current period
- WHEN the tenant views the red-flag list
- THEN they see only clients below the configured threshold, most severe first

**Story 5 — Client history**
AS A tenant admin, I WANT TO click into one client and see their margin over time, SO THAT I can tell a one-off spike from a trend.
- GIVEN a client with at least two rolled-up periods
- WHEN the tenant clicks into that client
- THEN they see cost, revenue, and margin history across periods

## 6. Solution design

### 6a. Approach selected
Batch upload into the same Next.js codebase as the dashboard (no separate service), synchronous validation and pricing at ingestion (no queue), a precomputed rollup table the dashboard reads from (not live aggregation on every page view).

### 6b. Alternatives considered

| Alternative | Rejected because |
|---|---|
| Compute margin live on every dashboard view | Doesn't stay fast as log volume grows, and recomputes the same answer repeatedly for nothing; precomputing once per upload keeps dashboard reads simple |
| Nightly rollup batch | No load reason to batch overnight at pilot scale; an immediate number after upload directly serves the "demo it live" use case |
| Silently reject invalid rows | A tenant who doesn't know 200 rows didn't count can't trust the resulting margin number; flag-and-continue costs a small UX hit and buys real trust |

### 6c. Key design decisions
- **Cost is frozen at ingestion**, priced against whatever `model_pricing` rate was in effect at `requested_at` — never today's rate, never recalculated later. A price change next month can't silently rewrite a number already shown to a tenant.
- **`model_pricing` rows are closed, never deleted** (`effective_to`), so any historical request can always be re-priced correctly, even years later.

## 7. Functional requirements

**P0 — blocks pilot launch:**
- FR-01: Accept CSV/JSON upload of AI request logs (timestamp, client, model, tokens)
- FR-02: Accept CSV/JSON upload of client revenue for a period
- FR-03: Validate every row; flag failures with a visible error count, never silent-drop
- FR-04: Price every valid log row against the `model_pricing` rate effective at `requested_at`; freeze the result
- FR-05: Enforce row-level tenant isolation on every table this flow touches
- FR-06: Roll up cost, revenue, margin, margin %, and red-flag status per client per period, triggered automatically after a successful upload
- FR-07–FR-10: Dashboard — portfolio summary, worst-to-best list, red-flag list, per-client history
- FR-11: Track every upload as a batch, so a bad file can be identified and rolled back

**P1 — included if capacity allows:**
- FR-12: Explicit behavior for log rows priced outside any `model_pricing` date range (currently undecided — see Open Questions)
- FR-13: Per-tenant configurable red-flag threshold, not one global default

**P2 — future, not this build:**
- FR-14: CSV export of dashboard data *(not sourced from either doc — a plausible future add, not a decision)*
- FR-15: Real-time ingestion (Path A) — deferred; trigger is 3+ pilots requesting it

## 8. Non-functional requirements

- **Tenant isolation:** hard requirement, enforced at the database layer via RLS, verified with an automated cross-tenant-read test suite. The one NFR treated as non-negotiable rather than a dial to tune later.
- **Performance:** no formal SLA is defined at pilot scale. The working target is qualitative — "a real number a few seconds after upload" — not a measured P95. [ASSUMPTION: treat this as the bar until real usage data says otherwise; set a real number before expanding past the pilot cohort.]
- **Everything else** (formal uptime SLA, accessibility compliance beyond good practice, localization): not specified in either source document. Inventing numbers here for a 5-pilot MVP would be noise, not signal — worth real targets once there's a non-pilot customer base.

## 9. Dependencies & risks

| Item | Type | Status | Mitigation |
|---|---|---|---|
| Pilots have client-tagged logs to export | Risk | Open, unverified | Ask directly this week, before upload code is written |
| `model_pricing` stays current | Dependency | Ongoing, admin-maintained | Separate admin screen; outside this flow's build but this flow depends on its accuracy |
| DPA signed before real pilot data loads | Dependency | Open, needs legal review | Run in parallel with weeks 1–2 |
| Backup/recovery SLA beyond Supabase's default | Risk | Open, undecided | Default to standard daily backups unless a specific pilot requires more |
| Red-flag margin threshold | Risk | Open, product decision | Decide before week 6 — Roll up (FR-06) depends on it |
| Pricing-gap edge case (row outside any priced range) | Risk | Open, undecided | Decide during weeks 3–5, alongside the pricing engine build |

## 10. Implementation plan

| Phase | Weeks | Deliverable | Success gate |
|---|---|---|---|
| Foundation | 1–2 | Scaffold, schema + RLS, auth | Cross-tenant RLS test suite fails closed |
| Upload + pricing | 3–5 | Both upload routes, validation, pricing engine, admin pricing screen | A real pilot's log file prices correctly end to end |
| Roll up + dashboard | 6–8 | Rollup job, all three dashboard views | A real margin number appears seconds after upload |
| Pilot onboarding | 9–10 | Onboarding polish, multi-user | First real pilot onboards without support contact |
| Buffer | 11–12 | Validate assumptions with real pilots, decide Path A timing | — |

## 11. Rollout strategy

**Alpha:** internal + the first pilot who confirms (this week) they have exportable, client-tagged logs. Goal: prove the loop on a real file, not synthetic data.

**Beta:** remaining confirmed pilots, up to the 5 currently in the pipeline. Goal: confirm the log-export assumption holds broadly, not just for the friendliest pilot.

**Beyond this cohort:** not yet defined. The trigger for expanding past these pilots and the trigger for building Path A are the same one: real customers asking for something this version doesn't do.

## 12. Open questions

| Question | Owner | Impact if unresolved |
|---|---|---|
| What happens to a log row priced outside any `model_pricing` date range? | Eng | **Resolved — ADR-006:** fail that row, keep valid rows; error counted and returned |
| What's the per-tenant red-flag threshold? | Founder/PM | Roll up ships with an undecided default that may not fit every tenant |
| Do we need backup/recovery guarantees beyond Supabase's default? | Founder | Only matters if already promised to a specific customer |
| Has a pilot confirmed they have exportable, client-tagged logs? | Founder | This is the core assumption the entire flow is built on |
