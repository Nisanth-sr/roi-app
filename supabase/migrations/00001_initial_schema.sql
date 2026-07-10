-- AI ROI Middleware MVP — schema + RLS
-- Run via Supabase SQL editor or: supabase db push

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  red_flag_threshold NUMERIC(6, 2) NOT NULL DEFAULT 20,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE tenant_members (
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'member')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, user_id)
);

CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  external_ref TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, external_ref)
);

CREATE TABLE model_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL CHECK (provider IN ('bedrock', 'vertex')),
  model_id TEXT NOT NULL,
  input_price_per_1m NUMERIC(12, 6) NOT NULL,
  output_price_per_1m NUMERIC(12, 6) NOT NULL,
  cached_input_price_per_1m NUMERIC(12, 6),
  effective_from DATE NOT NULL,
  effective_to DATE,
  verified_at TIMESTAMPTZ,
  source_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_model_pricing_lookup ON model_pricing (model_id, effective_from, effective_to);

CREATE TABLE upload_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES auth.users(id),
  file_type TEXT NOT NULL CHECK (file_type IN ('ai_request_log', 'client_revenue')),
  row_count INTEGER NOT NULL DEFAULT 0,
  error_count INTEGER NOT NULL DEFAULT 0,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE ai_request_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  requested_at TIMESTAMPTZ NOT NULL,
  provider TEXT NOT NULL CHECK (provider IN ('bedrock', 'vertex')),
  model_id TEXT NOT NULL,
  input_tokens INTEGER NOT NULL CHECK (input_tokens >= 0),
  output_tokens INTEGER NOT NULL CHECK (output_tokens >= 0),
  computed_cost NUMERIC(14, 8) NOT NULL,
  upload_batch_id UUID NOT NULL REFERENCES upload_batches(id) ON DELETE CASCADE,
  source TEXT NOT NULL CHECK (source IN ('csv', 'json')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_request_log_tenant_client_month
  ON ai_request_log (tenant_id, client_id, requested_at);

CREATE TABLE client_revenue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  month DATE NOT NULL,
  revenue_amount NUMERIC(14, 4) NOT NULL CHECK (revenue_amount >= 0),
  currency TEXT NOT NULL DEFAULT 'USD',
  upload_batch_id UUID REFERENCES upload_batches(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, client_id, month)
);

CREATE TABLE monthly_client_summary (
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  month DATE NOT NULL,
  total_cost NUMERIC(14, 4) NOT NULL DEFAULT 0,
  total_revenue NUMERIC(14, 4) NOT NULL DEFAULT 0,
  margin NUMERIC(14, 4) NOT NULL DEFAULT 0,
  margin_percent NUMERIC(8, 4),
  red_flag BOOLEAN NOT NULL DEFAULT false,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, client_id, month)
);

CREATE TABLE pricing_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pricing_id UUID NOT NULL REFERENCES model_pricing(id),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  action TEXT NOT NULL,
  changes JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- RLS helpers
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.user_tenant_ids()
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.user_is_tenant_owner(p_tenant_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM tenant_members
    WHERE user_id = auth.uid() AND tenant_id = p_tenant_id AND role = 'owner'
  );
$$;

-- ---------------------------------------------------------------------------
-- Enable RLS
-- ---------------------------------------------------------------------------

ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE model_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE upload_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_request_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_revenue ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_client_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_audit_log ENABLE ROW LEVEL SECURITY;

-- tenants
CREATE POLICY tenants_select ON tenants FOR SELECT
  USING (id IN (SELECT public.user_tenant_ids()));

CREATE POLICY tenants_insert ON tenants FOR INSERT
  WITH CHECK (true);

CREATE POLICY tenants_update ON tenants FOR UPDATE
  USING (public.user_is_tenant_owner(id));

-- tenant_members
CREATE POLICY tenant_members_select ON tenant_members FOR SELECT
  USING (tenant_id IN (SELECT public.user_tenant_ids()));

CREATE POLICY tenant_members_insert ON tenant_members FOR INSERT
  WITH CHECK (user_id = auth.uid() OR tenant_id IN (SELECT public.user_tenant_ids()));

CREATE POLICY tenant_members_delete ON tenant_members FOR DELETE
  USING (public.user_is_tenant_owner(tenant_id));

-- clients
CREATE POLICY clients_all ON clients FOR ALL
  USING (tenant_id IN (SELECT public.user_tenant_ids()))
  WITH CHECK (tenant_id IN (SELECT public.user_tenant_ids()));

-- model_pricing — read: authenticated; write: owners only (global table)
CREATE POLICY model_pricing_select ON model_pricing FOR SELECT
  TO authenticated USING (true);

CREATE POLICY model_pricing_insert ON model_pricing FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM tenant_members WHERE user_id = auth.uid() AND role = 'owner')
  );

CREATE POLICY model_pricing_update ON model_pricing FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM tenant_members WHERE user_id = auth.uid() AND role = 'owner')
  );

-- upload_batches
CREATE POLICY upload_batches_all ON upload_batches FOR ALL
  USING (tenant_id IN (SELECT public.user_tenant_ids()))
  WITH CHECK (tenant_id IN (SELECT public.user_tenant_ids()));

-- ai_request_log
CREATE POLICY ai_request_log_all ON ai_request_log FOR ALL
  USING (tenant_id IN (SELECT public.user_tenant_ids()))
  WITH CHECK (tenant_id IN (SELECT public.user_tenant_ids()));

-- client_revenue
CREATE POLICY client_revenue_all ON client_revenue FOR ALL
  USING (tenant_id IN (SELECT public.user_tenant_ids()))
  WITH CHECK (tenant_id IN (SELECT public.user_tenant_ids()));

-- monthly_client_summary
CREATE POLICY monthly_client_summary_all ON monthly_client_summary FOR ALL
  USING (tenant_id IN (SELECT public.user_tenant_ids()))
  WITH CHECK (tenant_id IN (SELECT public.user_tenant_ids()));

-- pricing_audit_log
CREATE POLICY pricing_audit_log_select ON pricing_audit_log FOR SELECT
  TO authenticated USING (true);

CREATE POLICY pricing_audit_log_insert ON pricing_audit_log FOR INSERT
  TO authenticated WITH CHECK (user_id = auth.uid());
