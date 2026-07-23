# ADR-007: Energy Per Outcome MVP — Tier 1 estimation only

**Status:** Accepted  
**Date:** 2026-07-23  
**Related:** `Knowledge/ARCHON_Energy_Per_Outcome_Feature_Spec.md`, `src/modules/energy/`, migration `00002_energy_per_outcome.sql`

## Context

The Energy Per Outcome feature spec Phase 1 lists Tier 1 (token-based estimator) plus Tier 3 (task-type multipliers). This codebase already captures `model_id`, `input_tokens`, and `output_tokens` on `ai_request_log`, but has no task-type classification and no business-outcome units (tickets, PRs, documents). Spec §7 says: if task-type classification is missing, re-scope rather than treat Tier 3 as an MVP add-on.

Providers also do not expose per-call energy telemetry. Any product number is necessarily an estimate.

## Decision

**Ship Tier 1 only for MVP.**

1. **Estimation formula:**  
   `energy_wh ≈ (input_tokens + output_tokens) / 1e6 × wh_per_million_tokens × overhead_factor`  
   Frozen on each log row as `computed_energy_wh` at ingest (same posture as `computed_cost`).

2. **Coefficients:** Global `energy_coefficients` table, effective-dated, with citable `source_citation`. Prefer exact `model_id_pattern`, then family fallback. Missing coefficient → fail that row (ADR-006 posture), never invent a silent default for unknown families.

3. **Normalized metric:** Estimated **Wh per request** (portfolio + per-client), not true per-business-outcome. Absolute Wh shown only with methodology disclosure in the same view.

4. **Disclosure:** Every energy surface labeled estimate; `MethodologyDisclosure` panel mandatory next to the overview card.

5. **Recompute:** Settings → Recompute backfills `computed_energy_wh` from stored tokens + effective-dated coefficients for the request date, then re-rolls monthly summaries.

## Deferred (explicit non-goals for this ADR)

- Tier 3 task-type multipliers / `task_type` ingest  
- True “per ticket / PR / document” outcome denominators  
- Model-tier efficiency alerts, trend decomposition, vendor-benchmark ingestion  
- ESG / CSRD / carbon-accounting product positioning  

## Coefficient governance

| Cadence | Owner | Action |
|---|---|---|
| Quarterly | Solution architect (or designee) | Review published vendor / peer-reviewed figures; update `energy_coefficients` with new `effective_from` (do not delete history); bump `updated_at` |
| On model add | Engineering | Add model-specific or family coefficient before that model can ingest |

UI shows “last updated” from `max(updated_at)` on the coefficient table. Placeholder seed values are illustrative until the first architect review.

## Consequences

- Additive engineering on the existing upload → rollup → dashboard path.  
- Pilot tenants must run migration `00002` and seed coefficients (or recompute after seed) for energy figures to appear.  
- Tier 3 remains a separate roadmap item once call-type classification exists in the cost-ROI pipeline.
