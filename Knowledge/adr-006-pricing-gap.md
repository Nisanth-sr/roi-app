# ADR-006: Pricing gap for log rows outside any `model_pricing` range

**Status:** Accepted  
**Date:** 2026-07-23  
**Related:** PRD open question (FR-12), `validateLogRows` in `src/modules/uploads/validate.ts`

## Context

When a log row’s `(model_id, requested_at)` does not fall inside any `model_pricing` effective date range, the product must choose between failing the whole upload, silently omitting the row, or flagging the row and continuing.

## Decision

**Fail that row, keep the batch.** The row is counted in `error_count`, included in the returned `errors` list with a clear message (`No pricing for model … at …`), and is **not** inserted into `ai_request_log`. Valid rows in the same file are priced, stored, and rolled up.

## Consequences

- Tenants always see how many rows were excluded — no silent drops (PRD counter-metric).
- Partial uploads are usable; the tenant can fix pricing or the export and re-upload.
- Closing/opening `model_pricing` ranges (never deleting) remains the way to fill gaps before re-upload.

## Alternatives rejected

- Hard-fail entire upload — too brittle for pilot CSV quality.
- Silent skip — violates the “0% silently dropped” design principle.
