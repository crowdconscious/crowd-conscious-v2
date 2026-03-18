-- ADD: image_url to fund_causes, promoted_to_cause status to conscious_inbox
-- Run in Supabase SQL Editor

-- 1. Add image_url to fund_causes (optional, for cause cards)
ALTER TABLE public.fund_causes
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- 2. Add promoted_to_cause status to conscious_inbox
ALTER TABLE conscious_inbox DROP CONSTRAINT IF EXISTS conscious_inbox_status_check;
ALTER TABLE conscious_inbox ADD CONSTRAINT conscious_inbox_status_check
  CHECK (status IN ('pending', 'reviewed', 'approved', 'rejected', 'published', 'promoted_to_cause'));
