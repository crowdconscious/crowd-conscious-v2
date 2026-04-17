-- Founder seed for the Conscious Fund.
--
-- Context
-- -------
-- Migration 182 resets `conscious_fund` and `conscious_fund_transactions`
-- so production reflects only real Stripe webhook + trade RPC inflows.
-- Showing a $0 MXN balance on the public landing thermometer kills
-- credibility in the pre-launch window, so this migration credits the
-- fund with a founder-supplied seed.
--
-- This is a CONSCIOUS DECISION by the founder, not a bug fix. The
-- transaction is logged in the public ledger with `source_type = 'donation'`
-- and a description that names the source explicitly so anyone reading the
-- ledger sees it is a founder contribution rather than sponsor revenue.
--
-- Idempotency
-- -----------
-- The seed transaction is identified by the exact description string. Re-
-- running this migration will NOT double-credit the fund.
--
-- Configuration
-- -------------
-- Update `v_seed_amount` below before applying. Default is 10,000 MXN.

DO $$
DECLARE
  v_seed_amount NUMERIC(20,2) := 10000.00;
  v_seed_description TEXT := 'Aportación fundacional — Crowd Conscious';
  v_already_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM public.conscious_fund_transactions
    WHERE description = v_seed_description
      AND source_type = 'donation'
  ) INTO v_already_exists;

  IF v_already_exists THEN
    RAISE NOTICE 'Founder seed already applied; skipping.';
    RETURN;
  END IF;

  INSERT INTO public.conscious_fund_transactions (
    amount,
    source_type,
    description
  ) VALUES (
    v_seed_amount,
    'donation',
    v_seed_description
  );

  -- Maintain the running balance the same way trade fee + Stripe handlers do.
  UPDATE public.conscious_fund
  SET
    total_collected = total_collected + v_seed_amount,
    current_balance = current_balance + v_seed_amount,
    updated_at = now();

  RAISE NOTICE 'Founder seed of % MXN credited to conscious_fund.', v_seed_amount;
END $$;
