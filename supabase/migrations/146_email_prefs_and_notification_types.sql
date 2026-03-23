-- Email preferences on profiles (skip marketing/transactional sends when false)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email_notifications boolean DEFAULT true;

COMMENT ON COLUMN public.profiles.email_notifications IS 'When false, user opts out of prediction digest/re-engagement emails (and related in-app copies).';

-- Optional body column (mirror of message for newer clients); keep message for compatibility
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS body text;

UPDATE public.notifications
SET body = COALESCE(body, message)
WHERE body IS NULL AND message IS NOT NULL;

-- Widen notification types for prediction emails
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_type_check CHECK (
    type IN (
      'market_resolved',
      'inbox_upvote',
      'xp_earned',
      'fund_vote_available',
      'daily_market_digest',
      'vote_confirmation',
      'reengagement_weekly'
    )
  );
