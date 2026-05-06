-- Blog: short TL;DR shown under the cover image to lower reader friction,
-- and a new pulse embed position that puts the vote right after the TL;DR.

ALTER TABLE public.blog_posts
  ADD COLUMN IF NOT EXISTS tldr text;

ALTER TABLE public.blog_posts
  ADD COLUMN IF NOT EXISTS tldr_en text;

COMMENT ON COLUMN public.blog_posts.tldr IS
  'Short TL;DR (3–5 lines or single paragraph) shown under the cover image, before the body. Plain text; lines render as bullets when multi-line.';
COMMENT ON COLUMN public.blog_posts.tldr_en IS 'English TL;DR (optional).';

-- Expand pulse_embed_position to include after_tldr (vote right after the TL;DR,
-- before any body markdown). This is the highest-converting placement on mobile.
ALTER TABLE public.blog_posts
  DROP CONSTRAINT IF EXISTS blog_posts_pulse_embed_position_check;

ALTER TABLE public.blog_posts
  ADD CONSTRAINT blog_posts_pulse_embed_position_check
  CHECK (pulse_embed_position IN ('after_tldr', 'after_intro', 'before_cta', 'full_section'));
