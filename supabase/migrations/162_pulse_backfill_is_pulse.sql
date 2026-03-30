-- ============================================================
-- 162: Backfill is_pulse for markets created before the flag
-- existed or when the admin update did not persist is_pulse.
-- /pulse and /pulse/[id] require is_pulse = true.
-- ============================================================

-- 1) Any row that already has Pulse client branding
UPDATE public.prediction_markets
SET is_pulse = true
WHERE is_pulse = false
  AND archived_at IS NULL
  AND (
    pulse_client_name IS NOT NULL
    OR pulse_client_logo IS NOT NULL
    OR pulse_client_email IS NOT NULL
  );

-- 2) Typical Conscious Pulse demo: multi-outcome + government + several options
UPDATE public.prediction_markets pm
SET is_pulse = true
WHERE pm.is_pulse = false
  AND pm.archived_at IS NULL
  AND COALESCE(pm.market_type, '') = 'multi'
  AND pm.category = 'government'
  AND pm.status IN ('active', 'trading', 'resolved')
  AND (
    (SELECT COUNT(*)::integer FROM public.market_outcomes mo WHERE mo.market_id = pm.id) >= 4
    OR pm.title ILIKE '%CDMX%'
    OR pm.title ILIKE '%pulse%'
    OR pm.title ILIKE '%conscious pulse%'
    OR COALESCE(pm.description, '') ILIKE '%pulse%'
  );

-- 3) Large multi-outcome surveys (6+ options) — common Pulse demos
UPDATE public.prediction_markets pm
SET is_pulse = true
WHERE pm.is_pulse = false
  AND pm.archived_at IS NULL
  AND COALESCE(pm.market_type, '') = 'multi'
  AND (SELECT COUNT(*)::integer FROM public.market_outcomes mo WHERE mo.market_id = pm.id) >= 6;
