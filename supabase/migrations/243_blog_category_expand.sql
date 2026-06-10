-- 243: extend blog_posts.category with civic content pillars.
-- Additive only — every value from migration 168 is preserved.
-- Must stay in sync with lib/blog-categories.ts (BLOG_CATEGORY_IDS).

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
    'causes_fund'
  ));
