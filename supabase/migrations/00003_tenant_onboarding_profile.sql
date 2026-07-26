-- Tenant onboarding profile — declared payment gateway + AI models in use.
-- Safe to re-run. Profile metadata only: does not affect model_pricing,
-- upload validation, or energy estimates.

ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS payment_gateway TEXT;

ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS payment_gateway_other TEXT;

ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS ai_model_ids TEXT[] NOT NULL DEFAULT '{}';

ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS ai_models_other TEXT[] NOT NULL DEFAULT '{}';

ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tenants_payment_gateway_check'
  ) THEN
    ALTER TABLE tenants
      ADD CONSTRAINT tenants_payment_gateway_check
      CHECK (
        payment_gateway IS NULL
        OR payment_gateway IN (
          'stripe',
          'paddle',
          'chargebee',
          'lemon_squeezy',
          'other'
        )
      );
  END IF;
END $$;
