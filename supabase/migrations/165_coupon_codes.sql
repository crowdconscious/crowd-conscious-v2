-- Discount / access coupon codes → sponsor_accounts provisioning

CREATE TABLE IF NOT EXISTS public.coupon_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,

  type text NOT NULL DEFAULT 'pulse_trial'
    CHECK (type IN ('pulse_trial', 'sponsor_trial', 'full_access')),

  discount_percent integer NOT NULL DEFAULT 100
    CHECK (discount_percent >= 0 AND discount_percent <= 100),

  max_uses integer NOT NULL DEFAULT 1 CHECK (max_uses > 0),
  current_uses integer NOT NULL DEFAULT 0 CHECK (current_uses >= 0),

  max_pulse_markets integer NOT NULL DEFAULT 3 CHECK (max_pulse_markets >= 0),
  max_live_events integer NOT NULL DEFAULT 0 CHECK (max_live_events >= 0),

  valid_from timestamptz NOT NULL DEFAULT now(),
  valid_until timestamptz,

  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),

  is_active boolean NOT NULL DEFAULT true
);

CREATE INDEX IF NOT EXISTS idx_coupon_codes_active ON public.coupon_codes (is_active) WHERE is_active = true;

CREATE TABLE IF NOT EXISTS public.coupon_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id uuid NOT NULL REFERENCES public.coupon_codes(id) ON DELETE CASCADE,
  redeemed_by_email text NOT NULL,
  redeemed_by_name text,
  sponsor_account_id uuid REFERENCES public.sponsor_accounts(id) ON DELETE SET NULL,
  redeemed_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_coupon_redemptions_coupon_email_lower
  ON public.coupon_redemptions (coupon_id, lower(trim(redeemed_by_email)));

CREATE INDEX IF NOT EXISTS idx_coupon_redemptions_coupon_id ON public.coupon_redemptions (coupon_id);

COMMENT ON TABLE public.coupon_codes IS 'Promo codes for Pulse/sponsor access; redeem via API with service role.';
COMMENT ON TABLE public.coupon_redemptions IS 'One row per email per coupon.';

ALTER TABLE public.coupon_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupon_redemptions ENABLE ROW LEVEL SECURITY;

-- Admins: full access
CREATE POLICY "Admins manage coupon_codes"
  ON public.coupon_codes
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.user_type = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.user_type = 'admin'
    )
  );

-- Anonymous + authenticated can read active, non-expired coupons (optional client validation)
CREATE POLICY "Public read active coupon_codes"
  ON public.coupon_codes
  FOR SELECT
  TO anon, authenticated
  USING (
    is_active = true
    AND (valid_until IS NULL OR valid_until > now())
    AND valid_from <= now()
  );

CREATE POLICY "Admins read coupon_redemptions"
  ON public.coupon_redemptions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.user_type = 'admin'
    )
  );

-- Inserts/updates from app use service role (bypasses RLS). No public INSERT.

-- Seed coupons (idempotent: skip if code exists)
INSERT INTO public.coupon_codes (code, type, discount_percent, max_uses, max_pulse_markets, max_live_events, valid_until)
SELECT t.code, t.type, t.discount_percent, t.max_uses, t.max_pulse_markets, t.max_live_events, t.valid_until
FROM (
  VALUES
    ('PULSE-LAUNCH-2026', 'pulse_trial', 100, 10, 3, 0, now() + interval '30 days'),
    ('WORLDCUP-VIP', 'full_access', 100, 5, 5, 2, timestamptz '2026-07-20 23:59:59+00'),
    ('INFLUENCER-FREE', 'pulse_trial', 100, 20, 1, 0, now() + interval '60 days'),
    ('MUNICIPIO-CDMX', 'full_access', 100, 3, 10, 3, timestamptz '2026-12-31 23:59:59+00'),
    ('BRAND-DEMO-50', 'pulse_trial', 50, 50, 1, 0, now() + interval '90 days')
) AS t(code, type, discount_percent, max_uses, max_pulse_markets, max_live_events, valid_until)
WHERE NOT EXISTS (SELECT 1 FROM public.coupon_codes c WHERE c.code = t.code);
