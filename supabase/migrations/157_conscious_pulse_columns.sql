-- ============================================================
-- 157: Conscious Pulse — B2B sentiment (same row as prediction_markets)
-- ============================================================

ALTER TABLE public.prediction_markets
  ADD COLUMN IF NOT EXISTS is_pulse boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS pulse_client_name text,
  ADD COLUMN IF NOT EXISTS pulse_client_logo text,
  ADD COLUMN IF NOT EXISTS pulse_client_email text,
  ADD COLUMN IF NOT EXISTS pulse_embed_enabled boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.prediction_markets.is_pulse IS 'Conscious Pulse B2B sentiment product — public results at /pulse/[id].';
COMMENT ON COLUMN public.prediction_markets.pulse_embed_enabled IS 'Allow embedding Pulse results in client properties (future).';
