-- 207_share_events_source_type.sql
--
-- Adds `source_type` to `share_events` so the Intelligence Hub can split
-- share activity by surface (pulse / location / cause / other) without
-- re-deriving it from (market_id, location_id, other_type) every time.
--
-- This is additive and idempotent. Existing rows are backfilled in place.

ALTER TABLE public.share_events
  ADD COLUMN IF NOT EXISTS source_type TEXT;

-- Drop any prior CHECK with the same name before re-adding, so this
-- migration can be re-run safely in dev.
ALTER TABLE public.share_events
  DROP CONSTRAINT IF EXISTS share_events_source_type_check;

ALTER TABLE public.share_events
  ADD CONSTRAINT share_events_source_type_check
  CHECK (source_type IS NULL OR source_type IN ('pulse', 'location', 'cause', 'other'));

-- Backfill: derive source_type from the existing target columns.
-- - market_id set  → 'pulse' (the predictions marketplace, which is what
--   we surface publicly as a "Pulse")
-- - location_id    → 'location'
-- - other_type='cause' → 'cause'
-- - anything else  → 'other'
UPDATE public.share_events
SET source_type = CASE
  WHEN market_id IS NOT NULL THEN 'pulse'
  WHEN location_id IS NOT NULL THEN 'location'
  WHEN other_type = 'cause' THEN 'cause'
  ELSE 'other'
END
WHERE source_type IS NULL;

-- Partial index for the Intelligence Hub split query
-- (“share events in the last 30 days, grouped by source”).
CREATE INDEX IF NOT EXISTS idx_share_events_source_created
  ON public.share_events (source_type, created_at DESC);

COMMENT ON COLUMN public.share_events.source_type IS
  'Denormalized surface tag derived from (market_id, location_id, other_type). Used by Intelligence Hub to split reshares by funnel.';
