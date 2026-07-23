-- Dev seed for model_pricing (verify against live provider pages before pilot)
-- Illustrative rates from technical-architecture-spec Appendix C (July 2026)
-- cached_input_price_per_1m intentionally left null — unused in MVP (see pricing engine)

INSERT INTO model_pricing (provider, model_id, input_price_per_1m, output_price_per_1m, effective_from, verified_at, source_url)
VALUES
  ('bedrock', 'claude-sonnet-4-6', 3.0, 15.0, '2026-01-01', now(), 'https://aws.amazon.com/bedrock/pricing/'),
  ('bedrock', 'claude-opus-4-6', 5.0, 25.0, '2026-01-01', now(), 'https://aws.amazon.com/bedrock/pricing/'),
  ('bedrock', 'claude-haiku-4-5', 1.0, 5.0, '2026-01-01', now(), 'https://aws.amazon.com/bedrock/pricing/'),
  ('vertex', 'gemini-1.5-pro', 2.0, 12.0, '2026-01-01', now(), 'https://cloud.google.com/vertex-ai/generative-ai/pricing'),
  ('vertex', 'gemini-1.5-flash', 0.10, 0.40, '2026-01-01', now(), 'https://cloud.google.com/vertex-ai/generative-ai/pricing'),
  ('vertex', 'gemini-2.0-flash', 0.10, 0.40, '2026-01-01', now(), 'https://cloud.google.com/vertex-ai/generative-ai/pricing');

-- Energy coefficients (illustrative estimates for pilot — not metered ground truth).
-- Directionally informed by published per-query / aggregate inference energy literature;
-- replace via quarterly review before treating as production-grade. See ADR-007.
INSERT INTO energy_coefficients (
  model_family,
  model_id_pattern,
  wh_per_million_tokens,
  overhead_factor,
  effective_from,
  source_citation,
  notes
)
VALUES
  (
    'claude',
    'claude-opus-4-6',
    250.0,
    1.2,
    '2026-01-01',
    'https://arxiv.org/abs/2311.16863 (illustrative; placeholder pending architect review)',
    'MVP estimate — frontier reasoning class; not vendor-metered'
  ),
  (
    'claude',
    'claude-sonnet-4-6',
    180.0,
    1.2,
    '2026-01-01',
    'https://arxiv.org/abs/2311.16863 (illustrative; placeholder pending architect review)',
    'MVP estimate — mid-tier; not vendor-metered'
  ),
  (
    'claude',
    'claude-haiku-4-5',
    80.0,
    1.2,
    '2026-01-01',
    'https://arxiv.org/abs/2311.16863 (illustrative; placeholder pending architect review)',
    'MVP estimate — lighter tier; not vendor-metered'
  ),
  (
    'gemini',
    'gemini-1.5-pro',
    150.0,
    1.2,
    '2026-01-01',
    'https://cloud.google.com/architecture/energy-efficiency (illustrative aggregate methodology)',
    'MVP estimate calibrated from public aggregate figures; not per-call metering'
  ),
  (
    'gemini',
    'gemini-1.5-flash',
    60.0,
    1.2,
    '2026-01-01',
    'https://cloud.google.com/architecture/energy-efficiency (illustrative aggregate methodology)',
    'MVP estimate — flash tier; not vendor-metered'
  ),
  (
    'gemini',
    'gemini-2.0-flash',
    60.0,
    1.2,
    '2026-01-01',
    'https://cloud.google.com/architecture/energy-efficiency (illustrative aggregate methodology)',
    'MVP estimate — flash tier; not vendor-metered'
  ),
  (
    'claude',
    NULL,
    180.0,
    1.2,
    '2026-01-01',
    'Family fallback — same citation class as model-specific Claude rows',
    'Used only when no model_id_pattern matches; fail closed if family unknown'
  ),
  (
    'gemini',
    NULL,
    100.0,
    1.2,
    '2026-01-01',
    'Family fallback — same citation class as model-specific Gemini rows',
    'Used only when no model_id_pattern matches; fail closed if family unknown'
  );
