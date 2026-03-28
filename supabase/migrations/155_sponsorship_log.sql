-- 155: Public transparency log for each sponsorship payment (Stripe)

CREATE TABLE IF NOT EXISTS public.sponsorship_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_session_id text UNIQUE,
  sponsorship_id uuid REFERENCES public.sponsorships(id) ON DELETE SET NULL,
  sponsor_name text NOT NULL,
  is_anonymous boolean NOT NULL DEFAULT false,
  sponsor_tier text NOT NULL CHECK (sponsor_tier IN ('starter', 'growth', 'champion', 'anchor')),
  amount_paid numeric(12, 2) NOT NULL CHECK (amount_paid >= 0),
  stripe_fee numeric(12, 2) NOT NULL DEFAULT 0 CHECK (stripe_fee >= 0),
  net_amount numeric(12, 2) NOT NULL,
  fund_allocation numeric(12, 2) NOT NULL CHECK (fund_allocation >= 0),
  fund_percent numeric(5, 4) NOT NULL CHECK (fund_percent >= 0 AND fund_percent <= 1),
  platform_revenue numeric(12, 2) NOT NULL CHECK (platform_revenue >= 0),
  market_id uuid REFERENCES public.prediction_markets(id) ON DELETE SET NULL,
  cause_id uuid REFERENCES public.fund_causes(id) ON DELETE SET NULL,
  paid_at timestamptz NOT NULL DEFAULT now(),
  is_public boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sponsorship_log_paid_at ON public.sponsorship_log (paid_at DESC);
CREATE INDEX IF NOT EXISTS idx_sponsorship_log_is_public ON public.sponsorship_log (is_public);

COMMENT ON TABLE public.sponsorship_log IS 'Per-payment transparency row (public dashboard + audit).';

ALTER TABLE public.sponsorship_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view public sponsorship logs" ON public.sponsorship_log;
CREATE POLICY "Anyone can view public sponsorship logs"
  ON public.sponsorship_log FOR SELECT
  USING (is_public = true);

DROP POLICY IF EXISTS "Admins can manage sponsorship logs" ON public.sponsorship_log;
CREATE POLICY "Admins can manage sponsorship logs"
  ON public.sponsorship_log FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.sponsorship_log;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
