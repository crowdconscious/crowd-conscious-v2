-- Pulse / market listing cover thumbnails (blog_posts + live_events already have cover_image_url where applicable)

ALTER TABLE public.blog_posts
  ADD COLUMN IF NOT EXISTS cover_image_url text;

ALTER TABLE public.prediction_markets
  ADD COLUMN IF NOT EXISTS cover_image_url text;

ALTER TABLE public.live_events
  ADD COLUMN IF NOT EXISTS cover_image_url text;

COMMENT ON COLUMN public.prediction_markets.cover_image_url IS 'Hero image for Pulse listings and cards.';
