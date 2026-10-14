-- 283_org_pilot_requests
-- ALREADY APPLIED in production (schema_migrations version 20261013234947,
-- applied out of band). Committed to the repo on 2026-10-14 to match the DB.
-- It was reconstructed from the live schema, and IF NOT EXISTS makes it a no-op there.
-- Columns added later live in 284_org_pilot_requests_v2_fields.sql.

CREATE TABLE IF NOT EXISTS public.org_pilot_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  kind text NOT NULL CONSTRAINT org_pilot_requests_kind_check CHECK (kind = ANY (ARRAY['pilot','proposal','call'])),
  plan text NOT NULL DEFAULT 'pilot' CONSTRAINT org_pilot_requests_plan_check CHECK (plan = ANY (ARRAY['pilot','anual','continua','sello'])),
  status text NOT NULL DEFAULT 'pending_payment' CONSTRAINT org_pilot_requests_status_check
    CHECK (status = ANY (ARRAY['pending_payment','awaiting_transfer','paid','payment_failed','proposal_requested','call_requested','cancelled'])),
  company_name text NOT NULL CONSTRAINT org_pilot_requests_company_name_check CHECK (char_length(company_name) BETWEEN 1 AND 200),
  contact_name text NOT NULL CONSTRAINT org_pilot_requests_contact_name_check CHECK (char_length(contact_name) BETWEEN 1 AND 200),
  email text NOT NULL CONSTRAINT org_pilot_requests_email_check CHECK (char_length(email) BETWEEN 3 AND 320),
  phone text CONSTRAINT org_pilot_requests_phone_check CHECK (phone IS NULL OR char_length(phone) <= 40),
  rfc text CONSTRAINT org_pilot_requests_rfc_check CHECK (rfc IS NULL OR rfc ~ '^[A-ZÑ&]{3,4}[0-9]{6}[A-Z0-9]{3}$'),
  razon_social text CONSTRAINT org_pilot_requests_razon_social_check CHECK (razon_social IS NULL OR char_length(razon_social) <= 300),
  regimen_fiscal text CONSTRAINT org_pilot_requests_regimen_fiscal_check CHECK (regimen_fiscal IS NULL OR regimen_fiscal ~ '^[0-9]{3}$'),
  cp_fiscal text CONSTRAINT org_pilot_requests_cp_fiscal_check CHECK (cp_fiscal IS NULL OR cp_fiscal ~ '^[0-9]{5}$'),
  uso_cfdi text CONSTRAINT org_pilot_requests_uso_cfdi_check CHECK (uso_cfdi IS NULL OR char_length(uso_cfdi) <= 5),
  message text CONSTRAINT org_pilot_requests_message_check CHECK (message IS NULL OR char_length(message) <= 2000),
  locale text NOT NULL DEFAULT 'es' CONSTRAINT org_pilot_requests_locale_check CHECK (locale = ANY (ARRAY['es','en'])),
  source text CONSTRAINT org_pilot_requests_source_check CHECK (source IS NULL OR char_length(source) <= 64),
  subtotal_mxn numeric(12,2),
  iva_mxn numeric(12,2),
  total_mxn numeric(12,2),
  fund_mxn numeric(12,2),
  stripe_checkout_session_id text CONSTRAINT org_pilot_requests_stripe_checkout_session_id_key UNIQUE,
  stripe_payment_intent_id text,
  stripe_customer_id text,
  paid_at timestamptz,
  receipt_number text CONSTRAINT org_pilot_requests_receipt_number_key UNIQUE,
  emails_claimed_at timestamptz,
  client_receipt_sent_at timestamptz,
  admin_alert_sent_at timestamptz,
  CONSTRAINT org_pilot_requests_pilot_fiscal CHECK (
    kind <> 'pilot' OR (rfc IS NOT NULL AND razon_social IS NOT NULL AND regimen_fiscal IS NOT NULL AND cp_fiscal IS NOT NULL AND uso_cfdi IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS org_pilot_requests_created_at_idx ON public.org_pilot_requests (created_at DESC);
CREATE INDEX IF NOT EXISTS org_pilot_requests_status_idx ON public.org_pilot_requests (status);

ALTER TABLE public.org_pilot_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.org_pilot_requests FROM anon, authenticated;
GRANT ALL ON public.org_pilot_requests TO service_role;
