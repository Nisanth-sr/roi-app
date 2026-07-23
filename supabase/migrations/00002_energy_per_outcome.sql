-- Energy Per Outcome MVP — Tier 1 estimation layer
-- Safe to re-run (IF NOT EXISTS / ADD COLUMN IF NOT EXISTS).
-- Additive to existing token/model ingest; estimates only (not metering).

-- ---------------------------------------------------------------------------
-- Coefficient table (global, citable, effective-dated)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS energy_coefficients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_family TEXT NOT NULL,
  model_id_pattern TEXT,
  wh_per_million_tokens NUMERIC(14, 6) NOT NULL CHECK (wh_per_million_tokens >= 0),
  overhead_factor NUMERIC(8, 4) NOT NULL DEFAULT 1.0 CHECK (overhead_factor > 0),
  effective_from DATE NOT NULL,
  effective_to DATE,
  source_citation TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_energy_coefficients_lookup
  ON energy_coefficients (model_family, model_id_pattern, effective_from, effective_to);

-- ---------------------------------------------------------------------------
-- Per-request frozen energy estimate (mirrors computed_cost)
-- ---------------------------------------------------------------------------

ALTER TABLE ai_request_log
  ADD COLUMN IF NOT EXISTS computed_energy_wh NUMERIC(18, 10) NOT NULL DEFAULT 0;

-- ---------------------------------------------------------------------------
-- Monthly rollup energy fields
-- ---------------------------------------------------------------------------

ALTER TABLE monthly_client_summary
  ADD COLUMN IF NOT EXISTS total_energy_wh NUMERIC(18, 6) NOT NULL DEFAULT 0;

ALTER TABLE monthly_client_summary
  ADD COLUMN IF NOT EXISTS request_count INTEGER NOT NULL DEFAULT 0;

ALTER TABLE monthly_client_summary
  ADD COLUMN IF NOT EXISTS energy_wh_per_request NUMERIC(18, 10);

-- ---------------------------------------------------------------------------
-- RLS (global read like model_pricing; write owners only)
-- ---------------------------------------------------------------------------

ALTER TABLE energy_coefficients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS energy_coefficients_select ON energy_coefficients;
CREATE POLICY energy_coefficients_select ON energy_coefficients FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS energy_coefficients_insert ON energy_coefficients;
CREATE POLICY energy_coefficients_insert ON energy_coefficients FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM tenant_members WHERE user_id = auth.uid() AND role = 'owner')
  );

DROP POLICY IF EXISTS energy_coefficients_update ON energy_coefficients;
CREATE POLICY energy_coefficients_update ON energy_coefficients FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM tenant_members WHERE user_id = auth.uid() AND role = 'owner')
  );

-- ---------------------------------------------------------------------------
-- Seed placeholder coefficients once (skip if any rows already exist)
-- ---------------------------------------------------------------------------

INSERT INTO energy_coefficients (
  model_family,
  model_id_pattern,
  wh_per_million_tokens,
  overhead_factor,
  effective_from,
  source_citation,
  notes
)
SELECT * FROM (VALUES
  (
    'claude',
    'claude-opus-4-6',
    250.0::numeric,
    1.2::numeric,
    '2026-01-01'::date,
    'https://arxiv.org/abs/2311.16863 (illustrative; placeholder pending architect review)',
    'MVP estimate — frontier reasoning class; not vendor-metered'
  ),
  (
    'claude',
    'claude-sonnet-4-6',
    180.0::numeric,
    1.2::numeric,
    '2026-01-01'::date,
    'https://arxiv.org/abs/2311.16863 (illustrative; placeholder pending architect review)',
    'MVP estimate — mid-tier; not vendor-metered'
  ),
  (
    'claude',
    'claude-haiku-4-5',
    80.0::numeric,
    1.2::numeric,
    '2026-01-01'::date,
    'https://arxiv.org/abs/2311.16863 (illustrative; placeholder pending architect review)',
    'MVP estimate — lighter tier; not vendor-metered'
  ),
  (
    'gemini',
    'gemini-1.5-pro',
    150.0::numeric,
    1.2::numeric,
    '2026-01-01'::date,
    'https://cloud.google.com/architecture/energy-efficiency (illustrative aggregate methodology)',
    'MVP estimate calibrated from public aggregate figures; not per-call metering'
  ),
  (
    'gemini',
    'gemini-1.5-flash',
    60.0::numeric,
    1.2::numeric,
    '2026-01-01'::date,
    'https://cloud.google.com/architecture/energy-efficiency (illustrative aggregate methodology)',
    'MVP estimate — flash tier; not vendor-metered'
  ),
  (
    'gemini',
    'gemini-2.0-flash',
    60.0::numeric,
    1.2::numeric,
    '2026-01-01'::date,
    'https://cloud.google.com/architecture/energy-efficiency (illustrative aggregate methodology)',
    'MVP estimate — flash tier; not vendor-metered'
  ),
  (
    'claude',
    NULL::text,
    180.0::numeric,
    1.2::numeric,
    '2026-01-01'::date,
    'Family fallback — same citation class as model-specific Claude rows',
    'Used only when no model_id_pattern matches; fail closed if family unknown'
  ),
  (
    'gemini',
    NULL::text,
    100.0::numeric,
    1.2::numeric,
    '2026-01-01'::date,
    'Family fallback — same citation class as model-specific Gemini rows',
    'Used only when no model_id_pattern matches; fail closed if family unknown'
  )
) AS v(model_family, model_id_pattern, wh_per_million_tokens, overhead_factor, effective_from, source_citation, notes)
WHERE NOT EXISTS (SELECT 1 FROM energy_coefficients LIMIT 1);
