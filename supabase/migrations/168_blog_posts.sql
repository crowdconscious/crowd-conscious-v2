-- Blog posts for /blog, agent-generated drafts, newsletter digests

CREATE TABLE IF NOT EXISTS public.blog_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  title_en text,
  excerpt text NOT NULL,
  excerpt_en text,
  content text NOT NULL,
  content_en text,
  cover_image_url text,
  category text NOT NULL DEFAULT 'insight'
    CHECK (category IN ('insight', 'pulse_analysis', 'market_story', 'world_cup', 'behind_data')),
  tags text[] NOT NULL DEFAULT '{}',

  meta_title text,
  meta_description text,

  related_market_ids uuid[] NOT NULL DEFAULT '{}',
  related_pulse_id uuid,

  generated_by text,
  agent_content_id uuid,
  edited_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,

  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'published', 'archived')),
  published_at timestamptz,

  view_count integer NOT NULL DEFAULT 0 CHECK (view_count >= 0),

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_blog_slug ON public.blog_posts(slug);
CREATE INDEX IF NOT EXISTS idx_blog_status ON public.blog_posts(status);
CREATE INDEX IF NOT EXISTS idx_blog_published ON public.blog_posts(published_at DESC NULLS LAST);

COMMENT ON TABLE public.blog_posts IS 'Public blog; RLS: published readable by anyone; admins full access.';

ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read published posts"
  ON public.blog_posts
  FOR SELECT
  TO anon, authenticated
  USING (status = 'published');

CREATE POLICY "Admins manage all posts"
  ON public.blog_posts
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.user_type = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.user_type = 'admin'
    )
  );

-- Service role bypasses RLS for cron/agents

CREATE OR REPLACE FUNCTION public.increment_blog_post_view(p_slug text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.blog_posts
  SET view_count = view_count + 1, updated_at = now()
  WHERE slug = p_slug AND status = 'published';
END;
$$;

REVOKE ALL ON FUNCTION public.increment_blog_post_view(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_blog_post_view(text) TO anon, authenticated, service_role;

-- Newsletter: allow blog-only sends without a market row
ALTER TABLE public.email_digest_log
  ALTER COLUMN market_id DROP NOT NULL;

ALTER TABLE public.email_digest_log
  ADD COLUMN IF NOT EXISTS blog_post_id uuid REFERENCES public.blog_posts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_email_digest_blog_sent ON public.email_digest_log (blog_post_id, sent_at DESC);

COMMENT ON COLUMN public.email_digest_log.blog_post_id IS 'Featured post for blog_digest emails; market_id may be null.';

-- agent_content: blog_post type for social variants + dashboard link
ALTER TABLE public.agent_content DROP CONSTRAINT IF EXISTS agent_content_content_type_check;
ALTER TABLE public.agent_content ADD CONSTRAINT agent_content_content_type_check
  CHECK (content_type IN (
    'news_summary', 'sentiment_report', 'data_alert', 'social_post',
    'weekly_digest', 'market_insight', 'sponsor_report', 'social_scrape_log',
    'market_suggestion', 'content_brief', 'blog_post'
  ));
