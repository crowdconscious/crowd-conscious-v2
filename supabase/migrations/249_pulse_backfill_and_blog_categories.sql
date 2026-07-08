-- 249: Backfill missing is_pulse flags + expand blog_posts.category.
-- Must stay in sync with lib/blog-categories.ts (BLOG_CATEGORY_IDS).

-- 1. Repair admin-created Pulses that were published but never flagged is_pulse=true.
--    Symptom: push/in-app notification + direct /pulse/[id] work, but listing feeds
--    (which filter on is_pulse) omit the row. Admin create-market sets description_short
--    on every new Pulse; creator/location voting markets do not.
UPDATE public.prediction_markets
SET is_pulse = true
WHERE is_pulse IS NOT TRUE
  AND market_type = 'multi'
  AND description_short IS NOT NULL
  AND is_draft = false
  AND archived_at IS NULL;

-- 2. Blog categories — idempotent CHECK refresh (243 + 245 + new pillars).
ALTER TABLE public.blog_posts
  DROP CONSTRAINT IF EXISTS blog_posts_category_check;

ALTER TABLE public.blog_posts
  ADD CONSTRAINT blog_posts_category_check
  CHECK (category IN (
    'insight',
    'pulse_analysis',
    'market_story',
    'world_cup',
    'behind_data',
    'sustainability',
    'city_mobility',
    'civic_culture',
    'conscious_places',
    'creators',
    'causes_fund',
    'consciousness',
    'science',
    'economy',
    'health',
    'community',
    'culture'
  ));
