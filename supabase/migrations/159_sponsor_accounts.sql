-- 159: Sponsor client accounts (token-based dashboard) + link to prediction_markets

CREATE TABLE IF NOT EXISTS public.sponsor_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  company_name text NOT NULL,
  contact_email text NOT NULL,
  contact_name text,
  logo_url text,

  access_token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,

  tier text NOT NULL DEFAULT 'starter',
  is_pulse_client boolean DEFAULT false,
  pulse_subscription_active boolean DEFAULT false,

  stripe_customer_id text,
  stripe_subscription_id text,
  total_spent numeric DEFAULT 0,
  total_fund_contribution numeric DEFAULT 0,

  created_at timestamptz DEFAULT now(),
  last_login_at timestamptz,

  status text DEFAULT 'active' CHECK (status IN ('active', 'paused', 'cancelled'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_sponsor_accounts_contact_email_lower
  ON public.sponsor_accounts (lower(trim(contact_email)));

CREATE INDEX IF NOT EXISTS idx_sponsor_accounts_access_token ON public.sponsor_accounts (access_token);

ALTER TABLE public.prediction_markets
  ADD COLUMN IF NOT EXISTS sponsor_account_id uuid REFERENCES public.sponsor_accounts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_prediction_markets_sponsor_account_id
  ON public.prediction_markets (sponsor_account_id)
  WHERE sponsor_account_id IS NOT NULL;

ALTER TABLE public.sponsor_accounts ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.sponsor_accounts IS 'Sponsor org record; read via service role (token in app URL).';
