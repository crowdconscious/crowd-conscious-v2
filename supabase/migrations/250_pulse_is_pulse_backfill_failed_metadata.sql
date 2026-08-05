-- 250: Backfill is_pulse when admin create-market metadata UPDATE failed.
--
-- Symptom (confirmed on bb1d35e6-926d-4222-89d5-be5cfc173d60, 2026-07-08):
--   push notification + direct /pulse/[id] work, but listing feeds omit the row.
--   Row has is_pulse=false, description_short=null, published_at=null — the RPC
--   succeeded (outcomes + PULSE_DEFAULT_RESOLUTION_CRITERIA) but the follow-up
--   UPDATE was rolled back (e.g. conscious_fund_percentage overflow before 178).
--   Migration 249 required description_short IS NOT NULL, so it never matched.
--
-- Safe signal: only admin/sponsor Pulse creation passes PULSE_DEFAULT_RESOLUTION_CRITERIA
-- to create_multi_market. Conscious Location/Creator voting markets use different text
-- and are excluded by title pattern.

UPDATE public.prediction_markets
SET
  is_pulse = true,
  published_at = COALESCE(published_at, created_at)
WHERE is_pulse IS NOT TRUE
  AND market_type = 'multi'
  AND is_draft = false
  AND archived_at IS NULL
  AND status IN ('active', 'trading')
  AND resolution_criteria =
    'Consulta de sentimiento público. Los resultados se presentan al cierre del Pulse con análisis ponderado por nivel de certeza de la comunidad.'
  AND title NOT LIKE '¿Es % un lugar Consciente?'
  AND title NOT LIKE '¿Es % un Creador Consciente?';
