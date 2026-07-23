# FEATURE SPEC ADDENDUM: Energy Per Outcome
## Appended to the ARCHON ROI Solution Architecture Brief

**Status:** Proposed — for solution architect review
**Owns:** ROI Measurement Platform (working name)
**Feature Tier:** MVP add-on layer, not a standalone module

---

## 1. STRATEGIC RATIONALE

### Why this feature, why now

Competitive analysis identified four market gaps in AI ROI measurement: the missing productivity-to-financial link, lack of vertical-specific models, absence of CFO-ready dashboards, and insufficient implementation support. None of the current market leaders — Olakai, Larridin, Worklytics, Exceeds AI, TrueFoundry — expose model energy consumption as a first-class ROI metric. This is unclaimed positioning, not a crowded feature race.

### Positioning discipline

This feature is **efficiency ROI**, not sustainability reporting. It must stay inside the financial-ROI narrative that is this platform's core differentiator, not drift into ESG/compliance territory, which is a different buyer (Chief Sustainability Officer / compliance, not CFO), a different sales motion, and already owned by adjacent vendors (TrueFoundry, Holistic AI, Credo AI).

**Working pitch line:**
> "We don't just tell you what AI cost you — we tell you what it cost you and whether you're burning the wrong model tier to get there."

### Non-goals (explicit scope boundaries)

- This is not a CSRD/ESG disclosure product.
- This is not a carbon-offset or carbon-accounting tool.
- This does not compete with governance/compliance vendors on regulatory reporting.
- This does not claim metered, ground-truth energy data — it is an estimation layer, disclosed as such.

---

## 2. THE CORE TECHNICAL CONSTRAINT

No model provider (OpenAI, Anthropic, Microsoft) currently exposes per-call energy telemetry via API. Google is the only vendor with a published methodology, and that covers aggregate median figures, not per-query metering. This means the feature is necessarily built as an **estimation layer**, not a metering layer, and the product must say so everywhere it surfaces a number. Overclaiming precision here is the single biggest reputational risk in this feature — Google's own August 2025 disclosure was publicly challenged by researchers for accounting choices (market-based vs. location-based emissions, omitted indirect water use). We should assume equivalent scrutiny will be applied to us at a fraction of Google's credibility cushion.

**Design principle:** every number this feature surfaces must be traceable to a visible, one-click methodology explanation. No black-box energy figures.

---

## 3. TECHNICAL ARCHITECTURE DECISION: ESTIMATION METHODOLOGY

Following the same decision-matrix format used elsewhere in this brief:

### Tier 1 — Token-Based Energy Estimator (MVP scope)

**Approach:** Energy ≈ (input tokens + output tokens) × per-token energy coefficient (by model family) × task-type multiplier × infrastructure overhead factor.

**Data required:** Token counts and model identifier per call — already captured by the platform's existing usage-ingestion pipeline under the API-first integration path. This is additive to data already flowing through the system, not a new integration surface.

**Coefficient sourcing:** Calibrated from published, citable benchmarks:
- Vendor-disclosed aggregate figures (e.g., Google's per-prompt methodology paper) where available
- Independent peer-reviewed estimates of per-query inference energy for comparable model classes
- Published accelerator efficiency data (FLOP/s-per-watt by hardware generation) as a cross-check where vendor figures are unavailable

**Effort:** Low-medium. No new data collection required; primarily a coefficients table plus a calculation layer on existing token data.

**Risk:** Coefficient staleness — model efficiency is improving fast enough that a coefficient more than one quarter old may materially understate current efficiency.

**Mitigation:** Quarterly coefficient review cycle, versioned coefficient table, "last updated" timestamp shown alongside every energy figure.

### Tier 2 — Vendor-Disclosed Benchmark Layer (Phase 2)

**Approach:** As model providers publish their own per-query or aggregate methodology (following Google's precedent), ingest these directly and use them to recalibrate Tier 1 coefficients rather than replace the estimation layer entirely — full per-call metering from vendors is not expected to become available industry-wide in the near term.

**Effort:** Low incremental effort once Tier 1 exists; mainly an ongoing maintenance process, not a new build.

### Tier 3 — Task-Type Multiplier Layer (MVP scope, high priority)

**Approach:** Apply multipliers to the Tier 1 base estimate based on call type:
- Standard completion: 1x (baseline)
- Reasoning/extended-thinking calls: 5–12x baseline
- Agentic/multi-step tool-use workflows: multiplier scales with call chain length
- Multimodal generation (image/video): treated as a distinct order of magnitude, not a multiplier on text baseline

**Why this is the highest-value layer:** This is where the feature stops being a reporting line and becomes an actionable insight. A client running agentic workflows on a frontier reasoning model for tasks a lighter model could handle is burning cost and energy simultaneously — the same "waste detection" instinct that underpins existing spend-management vendors, applied to energy.

**Effort:** Medium. Requires call-type classification, which should already exist or be near-existing if the platform tracks task type for cost-ROI purposes.

### Quality Gate for This Section

- [ ] Coefficient sources are documented and citable, not proprietary black-box assumptions
- [ ] Methodology explicitly labeled as estimation, not metering, in every UI surface
- [ ] Task-type multipliers are directionally validated against at least two independent published sources before launch
- [ ] Coefficient refresh cadence is scheduled and owned

---

## 4. DASHBOARD FEATURE SPECIFICATION

### Primary card: Energy Per Business Outcome

Not a standalone energy report — folded into the same outcome-linked view as the platform's core financial ROI metric.

**Display:** Wh (or kWh at scale) per unit of defined business outcome — e.g., per ticket resolved, per document processed, per PR merged, per customer interaction — mirroring however the platform already normalizes cost-per-outcome.

**Why normalized, not absolute:** Absolute energy totals invite board-level scrutiny without context and are easy to attack ("your AI energy use went up 40%!" without noting output tripled). A per-outcome figure is defensible and survives that scrutiny.

### Secondary card: Model Tier Efficiency Flag

**Function:** Surfaces the specific waste-detection insight — e.g., "X% of Q3 queries used a frontier reasoning model for task types a lighter/non-reasoning model handles at a fraction of the energy and cost."

**Why this matters commercially:** Directly ties an energy metric back into the cost-optimization conversation the CFO buyer already cares about. This is the load-bearing insight of the whole feature — everything else is context for this flag.

### Trend framing: Separate Client Behavior from Vendor-Side Gains

**Problem to design around:** Underlying model efficiency is improving industry-wide independent of anything the client does. A falling energy-per-outcome number might reflect vendor-side hardware/model efficiency gains, not client behavior change.

**Requirement:** The dashboard must decompose the trend line into "efficiency gains attributable to vendor/model improvements" vs. "efficiency gains attributable to the client's own model-tier or workflow choices." Failing to do this invites a credit-stealing critique similar to what's been leveled at Google's own disclosure.

### Methodology Disclosure Panel (mandatory, always visible)

One-click panel, visible from every energy figure in the product, stating:
- This is an estimate, not a direct measurement
- The coefficient sources and last-updated date
- What is and is not included (e.g., excludes end-user device energy, network transmission, training amortization)

This is both a credibility defense and, for regulated-industry vertical buyers, an actual trust signal that will be checked during procurement.

---

## 5. RISKS & MITIGATIONS

| Risk | Mitigation |
|---|---|
| Overclaiming precision on estimated figures | Estimation language and methodology panel mandatory on every surface |
| Feature becomes the headline instead of supporting financial ROI | Product and sales positioning locked to "efficiency ROI," never marketed as a sustainability product |
| Scope creep into full ESG/CSRD compliance reporting | Explicit non-goals documented (Section 1); any compliance-reporting requests routed to partnership discussion, not roadmap |
| Coefficient staleness as models get more efficient | Quarterly review cycle; versioned, timestamped coefficients |
| Client disputes an absolute energy number publicly | No absolute company-wide totals published without methodology caveats attached in the same view |
| Perceived as "greenwashing" if efficiency gains are vendor-driven, not client-driven | Trend decomposition (Section 4) separates the two explicitly |

---

## 6. PHASED ROLLOUT

**Phase 1 (MVP):** Tier 1 token-based estimator + Tier 3 task-type multipliers + single dashboard card + methodology disclosure panel. No vendor-benchmark ingestion yet.

**Phase 2:** Tier 2 vendor-disclosed benchmark ingestion; trend decomposition (client vs. vendor-driven efficiency gains); model tier efficiency flag becomes a proactive alert rather than a passive dashboard element.

**Phase 3 (conditional):** Evaluate expansion into a full efficiency-optimization recommendation engine (e.g., auto-suggesting model-tier downgrades for specific workflow types) — only if Phase 1–2 adoption data shows clients acting on the tier-efficiency flag, not just viewing it.

---

## 7. GO/NO-GO ADDENDUM

Add to existing go/no-go decision framework:

- **Go signal:** Solution architect confirms token/model-identifier data is already captured in the existing ingestion pipeline (expected, given API-first integration decision) — meaning this is additive engineering effort, not a new integration.
- **No-go / hold signal:** If task-type classification (needed for Tier 3 multipliers) does not already exist in the cost-ROI pipeline, this becomes a larger build and should be re-scoped as its own roadmap item rather than an MVP add-on.

---

**END OF ADDENDUM**
