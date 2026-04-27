-- ============================================================
-- 212: Draft mode for prediction markets
-- ============================================================
-- Adds an admin-only draft state so a market can be created and
-- previewed at its public URL by admins/creators before being
-- listed publicly.
--
-- Decisions (verified against existing schema):
--   * `prediction_markets.status` already encodes lifecycle
--     (proposed/approved/active/trading/resolved/disputed/cancelled)
--     and is referenced by indexes (see migration 196). Reusing it
--     for draft/published would conflate concerns and break those
--     indexes, so this migration introduces a separate `is_draft`
--     boolean + `published_at` timestamp.
--   * Existing `Anyone can view markets` policy (migration 128) is
--     too permissive for drafts and is replaced with three SELECT
--     policies: public reads only non-drafts, admins read all,
--     creators read their own drafts.
--   * Admin detection reuses `public.is_admin()` (migration 136),
--     which already powers the INSERT/UPDATE policies on this table.
-- ============================================================

-- 1. Columns
-- ============================================================
ALTER TABLE public.prediction_markets
  ADD COLUMN IF NOT EXISTS is_draft boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS published_at timestamptz;

-- 2. Backfill: every existing row is treated as already published.
-- ============================================================
UPDATE public.prediction_markets
SET published_at = COALESCE(published_at, created_at)
WHERE is_draft = false AND published_at IS NULL;

-- 3. Index for fast public-list filtering.
-- The most common public query shape is "active/trading, not archived,
-- not draft, sort by votes/created_at". A partial index on the cheap
-- side of the predicate keeps the planner happy and the index small.
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_prediction_markets_published_active
  ON public.prediction_markets (published_at DESC)
  WHERE is_draft = false AND archived_at IS NULL;

-- 4. RLS — replace the permissive public-read policy.
-- ============================================================
ALTER TABLE public.prediction_markets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view markets" ON public.prediction_markets;
DROP POLICY IF EXISTS "public_read_published_markets" ON public.prediction_markets;
DROP POLICY IF EXISTS "admin_read_all_markets" ON public.prediction_markets;
DROP POLICY IF EXISTS "creator_read_own_markets" ON public.prediction_markets;

-- Public (anon + authenticated) can read every non-draft market.
CREATE POLICY "public_read_published_markets"
  ON public.prediction_markets
  FOR SELECT
  USING (is_draft = false);

-- Admins (profiles.user_type = 'admin') read everything, drafts included.
CREATE POLICY "admin_read_all_markets"
  ON public.prediction_markets
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- Creators can read their own drafts (and their published markets, which
-- already match the public policy — both being permissive is fine).
CREATE POLICY "creator_read_own_markets"
  ON public.prediction_markets
  FOR SELECT
  TO authenticated
  USING (created_by = auth.uid());

-- Note: existing INSERT/UPDATE policies (migration 136) already gate writes
-- to admins via public.is_admin(). Publishing a draft is an UPDATE so that
-- pathway already works without further changes.

COMMENT ON COLUMN public.prediction_markets.is_draft IS
  'When true, the market is hidden from public listings and visible only to admins and the creator at its direct URL. Set to false on publish.';
COMMENT ON COLUMN public.prediction_markets.published_at IS
  'Timestamp at which is_draft transitioned to false. NULL while a market is still a draft.';
