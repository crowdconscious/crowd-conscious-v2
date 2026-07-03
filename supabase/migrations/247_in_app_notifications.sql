-- In-app notification center (mobile app).
--
-- The mobile app reads public.notifications directly through supabase-js
-- (RLS from migration 134 already limits SELECT/UPDATE to the owning user).
-- This migration:
--   1. Ensures the `data` jsonb column exists. It stores the same payload the
--      Expo push carries ({ route, type, marketId|slug }); the mobile app uses
--      data.route to deep-link straight to the right screen.
--   2. Widens the type check to cover every event that already fans out an
--      Expo push, so lib/in-app-notifications.ts can mirror pushes 1:1.
--   3. Adds a partial index for the unread-badge count query.

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS data jsonb;

COMMENT ON COLUMN public.notifications.data IS
  'Push-style payload ({route, type, ...}). Mobile uses data.route to deep-link; web ignores it.';

ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_type_check CHECK (
    type IN (
      -- legacy types (134/146)
      'market_resolved',
      'inbox_upvote',
      'xp_earned',
      'fund_vote_available',
      'daily_market_digest',
      'vote_confirmation',
      'reengagement_weekly',
      -- push-mirrored types (247)
      'pulse_published',
      'pulse_vote_invite',
      'pulse_resolved',
      'blog_published',
      'signal_cosign_invite',
      'signal_milestone',
      'location_published'
    )
  );

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON public.notifications(user_id)
  WHERE read = false;
