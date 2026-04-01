-- Link Galton / collective intelligence post to CDMX Pulse market for embedded CTA (optional if slug exists).
UPDATE public.blog_posts
SET related_market_ids = ARRAY['365628d5-58bd-4792-8157-d45f18d63344'::uuid]
WHERE slug ILIKE '%galton%'
   OR slug ILIKE '%buey%'
   OR title ILIKE '%galton%';
