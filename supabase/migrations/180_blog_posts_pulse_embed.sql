-- Blog: optional embedded Conscious Pulse data block

ALTER TABLE public.blog_posts
  ADD COLUMN IF NOT EXISTS pulse_market_id uuid REFERENCES public.prediction_markets(id) ON DELETE SET NULL;

ALTER TABLE public.blog_posts
  ADD COLUMN IF NOT EXISTS pulse_embed_position text NOT NULL DEFAULT 'before_cta';

ALTER TABLE public.blog_posts
  ADD COLUMN IF NOT EXISTS pulse_embed_components jsonb NOT NULL DEFAULT '["results_bars", "executive_summary", "key_insights", "confidence_chart", "vote_timeline", "vote_metrics"]'::jsonb;

ALTER TABLE public.blog_posts
  DROP CONSTRAINT IF EXISTS blog_posts_pulse_embed_position_check;

ALTER TABLE public.blog_posts
  ADD CONSTRAINT blog_posts_pulse_embed_position_check
  CHECK (pulse_embed_position IN ('after_intro', 'before_cta', 'full_section'));

COMMENT ON COLUMN public.blog_posts.pulse_market_id IS 'Optional Pulse market to embed in the article body.';
COMMENT ON COLUMN public.blog_posts.pulse_embed_position IS 'Where to inject the embed relative to ## headings.';
COMMENT ON COLUMN public.blog_posts.pulse_embed_components IS 'Which Pulse visualizations to show (JSON array of string keys).';
