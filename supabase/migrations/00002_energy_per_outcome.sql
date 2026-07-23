-- Energy Per Outcome MVP — Tier 1 estimation layer
-- Additive to existing token/model ingest; estimates only (not metering).

-- ---------------------------------------------------------------------------
-- Coefficient table (global, citable, effective-dated)
-- ---------------------------------------------------------------------------

CREATE TABLE energy_coefficients (
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

CREATE INDEX idx_energy_coefficients_lookup
  ON energy_coefficients (model_family, model_id_pattern, effective_from, effective_to);

-- ---------------------------------------------------------------------------
-- Per-request frozen energy estimate (mirrors computed_cost)
-- ---------------------------------------------------------------------------

ALTER TABLE ai_request_log
  ADD COLUMN computed_energy_wh NUMERIC(18, 10) NOT NULL DEFAULT 0
    CHECK (computed_energy_wh >= 0);

-- ---------------------------------------------------------------------------
-- Monthly rollup energy fields
-- ---------------------------------------------------------------------------

ALTER TABLE monthly_client_summary
  ADD COLUMN total_energy_wh NUMERIC(18, 6) NOT NULL DEFAULT 0
    CHECK (total_energy_wh >= 0),
  ADD COLUMN request_count INTEGER NOT NULL DEFAULT 0
    CHECK (request_count >= 0),
  ADD COLUMN energy_wh_per_request NUMERIC(18, 10);

-- ---------------------------------------------------------------------------
-- RLS (global read like model_pricing; write owners only)
-- ---------------------------------------------------------------------------

ALTER TABLE energy_coefficients ENABLE ROW LEVEL SECURITY;

CREATE POLICY energy_coefficients_select ON energy_coefficients FOR SELECT
  TO authenticated USING (true);

CREATE POLICY energy_coefficients_insert ON energy_coefficients FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM tenant_members WHERE user_id = auth.uid() AND role = 'owner')
  );

CREATE POLICY energy_coefficients_update ON energy_coefficients FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM tenant_members WHERE user_id = auth.uid() AND role = 'owner')
  );
