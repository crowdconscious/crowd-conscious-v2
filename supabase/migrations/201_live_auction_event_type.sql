-- ============================================================
-- 201: Conscious Live — add `live_auction` event type
--   Conscious Locations stream auctions (fashion, art, food) and
--   the audience votes on which item gets the next discount.
--   Drop the old CHECK and recreate it including the new value.
-- Idempotent: only re-creates the CHECK constraint when needed.
-- ============================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema = 'public'
      AND table_name = 'live_events'
      AND constraint_type = 'CHECK'
      AND constraint_name = 'live_events_event_type_check'
  ) THEN
    ALTER TABLE public.live_events DROP CONSTRAINT live_events_event_type_check;
  END IF;
END $$;

ALTER TABLE public.live_events
  ADD CONSTRAINT live_events_event_type_check
  CHECK (
    event_type IN (
      'soccer_match',
      'product_launch',
      'government_conference',
      'entertainment',
      'community_event',
      'live_auction',
      'custom'
    )
  );

COMMENT ON COLUMN public.live_events.event_type IS
  'Conscious Live template: soccer_match, product_launch, government_conference, entertainment, community_event, live_auction, custom.';
