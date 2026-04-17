-- PILOTO coupon for the Pilot Pulse $1,500 MXN trial tier.
--
-- Strategy
-- --------
-- The Pilot Pulse is positioned as the lowest-friction way to prove the
-- billing loop end-to-end with a cold prospect. The dedicated /pulse/pilot
-- page bypasses coupons entirely (it sells the `pilot` tier directly).
-- This coupon exists so a sales conversation that started against the public
-- pricing grid (Starter $5,000 MXN) can be converted to a $1,500 MXN trial
-- with a single code, no link change required.
--
-- 70% off applied to `pulse_unico` produces $1,500 MXN exactly.
-- It will NOT produce the same number on Pulse Pack ($12K) or Suscripción
-- ($20K); that is intentional — those tiers are not pilots.
--
-- Idempotency
-- -----------
-- Insert is guarded by NOT EXISTS on the code, mirroring the seeds in
-- migration 165. Re-running this migration is safe.

INSERT INTO public.coupon_codes (
  code,
  type,
  discount_percent,
  max_uses,
  max_pulse_markets,
  max_live_events,
  valid_until
)
SELECT
  'PILOTO',
  'pulse_trial',
  70,
  100,
  1,
  0,
  now() + interval '180 days'
WHERE NOT EXISTS (
  SELECT 1 FROM public.coupon_codes c WHERE c.code = 'PILOTO'
);
