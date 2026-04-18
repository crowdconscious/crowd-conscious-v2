-- ============================================================
-- 203: live_events.archived_at — admin maintenance
--   Adds the soft-delete column already used on prediction_markets,
--   conscious_inbox, and agent_content. Lets admins keep the /live
--   listing clean without losing history (markets, leaderboard,
--   chat, share cards still resolve from the row).
--
-- Idempotent.
-- ============================================================

ALTER TABLE public.live_events
  ADD COLUMN IF NOT EXISTS archived_at timestamptz;

-- Partial index optimizes the common case: "give me non-archived events"
CREATE INDEX IF NOT EXISTS idx_live_events_active
  ON public.live_events (match_date DESC)
  WHERE archived_at IS NULL;

COMMENT ON COLUMN public.live_events.archived_at IS
  'Soft-delete marker. Admin-only. Hides the event from /live and B2B listings while preserving market/leaderboard/comment history.';
