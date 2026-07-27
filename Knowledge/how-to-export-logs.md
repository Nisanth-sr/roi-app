# How to export payment revenue and AI request logs

Pilot / tenant admin guide for Path B uploads. Export two files for the **same month**, then drop them on **Upload**.

This product does **not** pull live data from Stripe, Paddle, Bedrock, or Vertex. You export files from your systems and upload them here.

---

## What you need

1. **Revenue file** — from your payment gateway (native export) or an internal CSV.
2. **AI request log file** — from *your* application logging (client-tagged token usage), CSV or JSON.
3. **Matching client ids** — log `client_id` and gateway customer ids should match clients in the app (`external_ref`, name, or id).
4. **Token counts only** — do not include prompts or completions. We store usage metadata, not content.

Optional: download a workspace-specific sample from **Upload** (or `GET /api/samples/logs` and `GET /api/samples/revenue`) to see the expected shape. Static copies: [sample-logs.csv](../public/samples/sample-logs.csv), [sample-revenue.csv](../public/samples/sample-revenue.csv).

Declare your payment gateway and AI models under **Settings → Workspace profile** (also set during onboarding). That helps revenue format detection and keeps the logs sample aligned with your models.

---

## 1. Payment gateway exports (revenue)

Upload a **raw** Stripe / Paddle / Chargebee / Lemon Squeezy export with no reformatting. Format is detected from column headers. Settled rows are aggregated to **one revenue figure per client per month**. Missing customers can be created automatically (toggle on the upload card).

Customers are matched by gateway customer id, then email, then name, against `clients.external_ref` / `id` / `name`. Store the gateway customer id (or billing email) as `external_ref` when you can.

### Stripe

1. Open [Stripe Dashboard](https://dashboard.stripe.com) → **Payments**.
2. Filter to the month you care about.
3. **Export** the payments CSV.
4. Upload that file under **Upload → Client revenue**.

**How we read it:** amounts are major units (dollars, not cents). Rows kept when status is paid / succeeded (and similar), `captured` is not false, amount > 0, and not fully refunded.

### Paddle

1. Open Paddle → **Reports → Transactions**.
2. Generate a report for the period; download the CSV from the email.
3. Upload under **Upload → Client revenue**.

**How we read it:** `grand_total` is minor units (cents). Status must be completed, paid, or billed.

### Chargebee

1. **Settings → Import & Export Data → Export Data → Invoices**, **or**
2. **Logs → Transactions** filtered to Success, then export.
3. Upload under **Upload → Client revenue**.

**How we read it:** `amount paid` (and similar) as minor units.

### Lemon Squeezy

1. Open **Orders → Export**.
2. Download the CSV emailed to the store owner.
3. Upload under **Upload → Client revenue**.

**How we read it:** revenue = `subtotal` − `discount_total` in minor units. Tax is excluded (merchant of record).

### Internal revenue CSV (fallback)

If you do not use a supported gateway export, upload CSV/JSON with:

| Column | Required | Notes |
|--------|----------|--------|
| `client_id` | Yes | Aliases: `client`, `external_ref`, `external_id` |
| `revenue_amount` | Yes | Aliases: `revenue`, `amount`, `mrr` |
| `currency` | Yes | e.g. `USD` |
| `period_month` | Yes | Aliases: `month`, `period` (month of the revenue) |

### Revenue caveats

- **Partial refunds / credit notes are not netted.** Fully refunded charges are skipped; partial refunds are not subtracted.
- **One currency per client-month.** Mixed currencies for the same client in one month error out — filter by currency and re-upload.
- **Amount units are fixed per gateway**, never guessed. Check the upload result panel for the computed total and unit used.
- After upload, confirm the summary on **Upload**. Batch history (and owner rollback) is under **Settings → Recent uploads**.

---

## 2. AI request logs

Logs must come from **your product’s request logger or analytics export** — one row per AI call, tagged with which of *your* clients it belongs to.

Provider consoles (AWS CloudWatch, Vertex / Cloud Logging usage views) usually give **token totals without client attribution**. That is not enough for per-client margin. If you only have provider metrics today, add a thin application log (or SQL export) that joins each call to a `client_id` before uploading.

There is **no** live Bedrock / Vertex connector in this MVP.

### Required columns

CSV or JSON. Headers are matched case-insensitively; common aliases work.

| Column | Required | Aliases |
|--------|----------|---------|
| `client_id` | Yes | `clientid`, `client`, `external_ref`, `external_id` |
| `request_timestamp` | Yes | `timestamp`, `requested_at`, `date`, `time` |
| `model_id` | Yes | `model`, `model_name` |
| `input_tokens` | Yes | `input`, `prompt_tokens` |
| `output_tokens` | Yes | `output`, `completion_tokens` |
| `provider` | No | `bedrock` or `vertex` (otherwise inferred from model id) |

Example:

```csv
client_id,request_timestamp,model_id,input_tokens,output_tokens
client-a,2026-06-01T10:00:00Z,claude-sonnet-4-6,50000,30000
```

`model_id` values must exist in **Settings → Model pricing** (seeded Bedrock Claude / Vertex Gemini ids, or rates you added). Unpriced models fail those rows — see [ADR-006](./adr-006-pricing-gap.md).

### How to produce the file

1. **Preferred:** Export from the DB or logger that already records each Bedrock/Vertex call with `client_id`, timestamp, model, and token counts.
2. Map ids so log `client_id` equals the client’s `external_ref` in this app (same id you use for revenue matching when possible).
3. Filter to the **same calendar month** as the revenue file.
4. Export CSV or JSON **without** prompt/response bodies.
5. Optionally download the Upload sample CSV and replace rows with your data (headers already match).

### Provider tips (not one-click exports)

**AWS Bedrock**

- Model invocation logging / CloudWatch can help you verify token counts.
- Still attribute each request to a client in *your* app when you call Bedrock (pass your internal client id into your own log row).
- Use the same model ids you declared in workspace profile / pricing (e.g. Claude Sonnet / Opus / Haiku ids we seed).

**Google Vertex AI**

- Cloud Logging and billing usage show aggregate consumption.
- Per-client margin still needs your application log with `client_id` + tokens + model per request.
- Align `model_id` with Gemini ids in model pricing.

### AI log checklist

- [ ] Same month as revenue
- [ ] Every row has a `client_id` that matches a client `external_ref` (or will match after clients are created)
- [ ] `model_id` values are priced in Settings
- [ ] Token fields are integers; no prompt text
- [ ] File is CSV or JSON

---

## 3. Upload and verify

1. Sign in → **Upload**.
2. Upload **Client revenue** (gateway export or internal CSV).
3. Upload **AI request logs**.
4. Read the result panel: valid/error counts, gateway summary (if any), skipped unpaid/refunded rows. Download the errors CSV if rows failed.
5. Open **Overview**, pick the month, confirm per-client margins look right.
6. If a batch is wrong, an owner can **Rollback** under **Settings → Recent uploads**.

Use [PILOT_VALIDATION.md](../PILOT_VALIDATION.md) when onboarding a real pilot.

---

## 4. Troubleshooting

| Symptom | What to do |
|---------|------------|
| No client tags on AI usage | Per-client margin is impossible until you log `client_id` on each request. Ask: *“Can you send a sample export with client tags right now?”* |
| Rows fail with unpriced model | Fix `model_id` spelling or add/update rates under **Settings → Model pricing**. |
| Gateway not detected / wrong totals | Confirm export type matches Stripe / Paddle / Chargebee / Lemon Squeezy; check the result panel’s unit and total; or use the internal revenue CSV. |
| Currency clash for one client-month | Filter the export to one currency and re-upload. |
| Clients not matching revenue | Set each client’s `external_ref` to the gateway customer id (or billing email) used in the export. |
| Margins empty for a month | Confirm both uploads landed in that month; check **Recent uploads**; recompute from Settings if needed after pricing changes. |

---

## Related docs

- [README — Upload formats](../README.md#upload-formats)
- [PRD — upload & dashboard](./prd-upload-dashboard-flow.md)
- [Week 0 checklist](../WEEK0_CHECKLIST.md)
- [Pilot validation](../PILOT_VALIDATION.md)
