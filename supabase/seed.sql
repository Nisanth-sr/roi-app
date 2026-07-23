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
