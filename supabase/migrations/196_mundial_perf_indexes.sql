-- ============================================================================
-- 196 · Performance indexes for Mundial traffic (Phase 4 · Step 4.3)
-- ============================================================================
-- Target: sustain 10-50x current traffic (9 → 150 daily predictors) with
-- the existing Supabase instance. Each index below is chosen to cover a
-- query that already exists in the API layer (see audit 2026-04-16).
--
-- All indexes are IF NOT EXISTS so this migration is safe to re-run.
-- CREATE INDEX CONCURRENTLY is *not* supported in a transaction, and
-- Supabase wraps migrations in one — so we use plain CREATE INDEX.
-- Each index below is selective; none should take more than a few
-- seconds to build on the current row volume (<100k rows per table).
-- ============================================================================

-- ------------------------------------------------------------
-- market_votes
-- ------------------------------------------------------------
-- Listing / pagination by time (digests, activity feeds).
CREATE INDEX IF NOT EXISTS idx_market_votes_created_at
  ON public.market_votes (created_at DESC);

-- Anonymous-participant lookups (conversion flow, analytics).
-- The existing `market_votes_market_anon_participant_uniq` unique index
-- is a composite on (market_id, anonymous_participant_id) filtered to
-- non-null participants; it doesn't serve single-column lookups, so
-- add a plain partial index for analytics.
CREATE INDEX IF NOT EXISTS idx_market_votes_anon_participant_id
  ON public.market_votes (anonymous_participant_id)
  WHERE anonymous_participant_id IS NOT NULL;

-- ------------------------------------------------------------
-- prediction_markets
-- ------------------------------------------------------------
-- Public list endpoint filters on status + archived_at most often.
-- There is no `is_featured` column on prediction_markets (see audit),
-- so we index the two filters that actually ship.
CREATE INDEX IF NOT EXISTS idx_prediction_markets_status_active
  ON public.prediction_markets (status)
  WHERE status IN ('active', 'trading');

CREATE INDEX IF NOT EXISTS idx_prediction_markets_category
  ON public.prediction_markets (category);

-- Soft-archive filter used by every public list query.
CREATE INDEX IF NOT EXISTS idx_prediction_markets_not_archived
  ON public.prediction_markets (created_at DESC)
  WHERE archived_at IS NULL;

-- ------------------------------------------------------------
-- conscious_locations
-- ------------------------------------------------------------
-- Location → market joins (e.g. insights dashboard, sponsor section).
CREATE INDEX IF NOT EXISTS idx_conscious_locations_current_market_id
  ON public.conscious_locations (current_market_id)
  WHERE current_market_id IS NOT NULL;

-- ------------------------------------------------------------
-- anonymous_participants
-- ------------------------------------------------------------
-- Conversion-funnel metrics in the CEO digest filter on
-- converted_to_user_id IS NOT NULL and on converted_at windows.
CREATE INDEX IF NOT EXISTS idx_anon_participants_converted_user
  ON public.anonymous_participants (converted_to_user_id)
  WHERE converted_to_user_id IS NOT NULL;

-- ------------------------------------------------------------
-- Ensure statistics reflect new distribution
-- ------------------------------------------------------------
ANALYZE public.market_votes;
ANALYZE public.prediction_markets;
ANALYZE public.conscious_locations;
ANALYZE public.anonymous_participants;
