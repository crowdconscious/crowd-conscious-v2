-- Tier entitlements for Conscious Pulse + dashboard limits

ALTER TABLE public.sponsor_accounts
  ADD COLUMN IF NOT EXISTS max_pulse_markets integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS used_pulse_markets integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS max_live_events integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS used_live_events integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS has_custom_branding boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_api_access boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_white_label boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.sponsor_accounts.max_pulse_markets IS 'Max concurrent Pulse markets this account may create (999 = unlimited).';
COMMENT ON COLUMN public.sponsor_accounts.used_pulse_markets IS 'Pulse markets created under this account (is_pulse + sponsor_account_id).';
COMMENT ON COLUMN public.sponsor_accounts.max_live_events IS 'Conscious Live events cap for tier.';
COMMENT ON COLUMN public.sponsor_accounts.used_live_events IS 'Live events used (reserved for future enforcement).';

-- One-time backfill from tier + actual Pulse count
UPDATE public.sponsor_accounts sa
SET
  max_pulse_markets = CASE sa.tier
    WHEN 'pulse_unico' THEN 1
    WHEN 'pulse_pack' THEN 3
    WHEN 'suscripcion' THEN 999
    WHEN 'enterprise' THEN 999
    ELSE 1
  END,
  max_live_events = CASE sa.tier
    WHEN 'suscripcion' THEN 5
    WHEN 'enterprise' THEN 999
    ELSE 0
  END,
  has_custom_branding = sa.tier IN ('suscripcion', 'enterprise'),
  has_api_access = sa.tier IN ('suscripcion', 'enterprise'),
  has_white_label = sa.tier = 'enterprise'
WHERE sa.tier IS NOT NULL;

UPDATE public.sponsor_accounts sa
SET used_pulse_markets = COALESCE(sub.c, 0)
FROM (
  SELECT sponsor_account_id, COUNT(*)::integer AS c
  FROM public.prediction_markets
  WHERE is_pulse = true
    AND sponsor_account_id IS NOT NULL
  GROUP BY sponsor_account_id
) sub
WHERE sa.id = sub.sponsor_account_id;
