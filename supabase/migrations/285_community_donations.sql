-- 285_community_donations.sql
-- Patrocinio comunitario: card donations to the Fondo Consciente via Stripe Checkout.
-- One row per Checkout Session (idempotency key = stripe_checkout_session_id).
-- The Fondo is credited NET of Stripe card fees (from the charge's balance_transaction).
-- RLS ON with no policies: only service_role (webhook / API) can read or write.

CREATE TABLE IF NOT EXISTS public.community_donations (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_checkout_session_id  text NOT NULL UNIQUE,
  stripe_payment_intent_id    text,
  status                      text NOT NULL DEFAULT 'paid'
                                CHECK (status IN ('paid', 'refunded')),
  currency                    text NOT NULL DEFAULT 'mxn',
  amount_mxn                  numeric(12,2) NOT NULL CHECK (amount_mxn > 0),
  stripe_fee_mxn              numeric(12,2) CHECK (stripe_fee_mxn IS NULL OR stripe_fee_mxn >= 0),
  net_mxn                     numeric(12,2) CHECK (net_mxn IS NULL OR net_mxn >= 0),
  fee_source                  text NOT NULL DEFAULT 'unavailable'
                                CHECK (fee_source IN ('stripe_balance_transaction', 'unavailable')),
  fund_credited               boolean NOT NULL DEFAULT false,
  fund_credited_at            timestamptz,
  donor_name                  text,
  donor_email                 text,
  is_anonymous                boolean NOT NULL DEFAULT false,
  locale                      text NOT NULL DEFAULT 'es' CHECK (locale IN ('es', 'en')),
  receipt_number              text UNIQUE,
  emails_claimed_at           timestamptz,
  donor_receipt_sent_at       timestamptz,
  admin_alert_sent_at         timestamptz,
  paid_at                     timestamptz NOT NULL DEFAULT now(),
  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS community_donations_paid_at_idx ON public.community_donations (paid_at DESC);
CREATE INDEX IF NOT EXISTS community_donations_uncredited_idx
  ON public.community_donations (created_at) WHERE fund_credited = false;

ALTER TABLE public.community_donations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.community_donations FROM anon, authenticated;
GRANT ALL ON public.community_donations TO service_role;

-- Atomically credit the Fondo Consciente with a donation's net amount, once.
-- Returns the credited amount, or NULL if already credited / net unknown.
CREATE OR REPLACE FUNCTION public.credit_community_donation(p_session_id text)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id  uuid;
  v_net numeric;
BEGIN
  UPDATE public.community_donations
     SET fund_credited = true, fund_credited_at = now(), updated_at = now()
   WHERE stripe_checkout_session_id = p_session_id
     AND status = 'paid'
     AND fund_credited = false
     AND net_mxn IS NOT NULL
     AND net_mxn > 0
  RETURNING id, net_mxn INTO v_id, v_net;

  IF v_id IS NULL THEN
    RETURN NULL;
  END IF;

  INSERT INTO public.conscious_fund_transactions (amount, source_type, source_id, market_id, description)
  VALUES (v_net, 'donation', v_id, NULL,
          'Patrocinio comunitario (neto de comisiones de tarjeta). Session: ' || p_session_id);

  UPDATE public.conscious_fund
     SET total_collected = total_collected + v_net,
         current_balance = current_balance + v_net,
         updated_at = now()
   WHERE id = (SELECT id FROM public.conscious_fund ORDER BY id LIMIT 1);

  RETURN v_net;
END;
$$;

REVOKE ALL ON FUNCTION public.credit_community_donation(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.credit_community_donation(text) TO service_role;
