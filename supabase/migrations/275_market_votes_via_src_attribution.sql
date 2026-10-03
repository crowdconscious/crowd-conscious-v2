-- 275: Attribution columns on market_votes (via / src)
--
-- Stand QR and Instagram Stories both land on /stand?via=…&src=… which
-- forwards those params to /pulse/<id>. Web votes persist them here so we
-- can count stand traffic by source (src='qr' vs src='social_ig').
--
-- Nullable, never required for vote validity. App updates these after the
-- existing vote RPCs return (same pattern as reasoning) so casting still
-- works if this migration hasn't been applied yet.
--
-- Owner applies this in the Supabase SQL editor before merge.

ALTER TABLE public.market_votes
  ADD COLUMN IF NOT EXISTS via text NULL,
  ADD COLUMN IF NOT EXISTS src text NULL;

COMMENT ON COLUMN public.market_votes.via IS
  'Optional traffic attribution (e.g. semana-accion). Sanitized short slug from landing query param. Migration 275.';

COMMENT ON COLUMN public.market_votes.src IS
  'Optional traffic source (e.g. qr, social_ig). Sanitized short slug from landing query param. Migration 275.';

-- Optional helper indexes for stand analytics filters.
CREATE INDEX IF NOT EXISTS market_votes_market_src_idx
  ON public.market_votes (market_id, src)
  WHERE src IS NOT NULL;

CREATE INDEX IF NOT EXISTS market_votes_market_via_idx
  ON public.market_votes (market_id, via)
  WHERE via IS NOT NULL;
