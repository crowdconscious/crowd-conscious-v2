-- Public discussion threads on blog posts (inserts via API / service role).

CREATE TABLE IF NOT EXISTS public.blog_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blog_post_id uuid NOT NULL REFERENCES public.blog_posts(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  anonymous_participant_id uuid REFERENCES public.anonymous_participants(id) ON DELETE SET NULL,
  author_name text NOT NULL,
  author_avatar text,
  content text NOT NULL CHECK (char_length(content) >= 1 AND char_length(content) <= 1000),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT blog_comments_one_author CHECK (
    (user_id IS NOT NULL AND anonymous_participant_id IS NULL)
    OR (user_id IS NULL AND anonymous_participant_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_blog_comments_post ON public.blog_comments (blog_post_id, created_at ASC);

COMMENT ON TABLE public.blog_comments IS 'Blog post comments; writes via API (service role).';

ALTER TABLE public.blog_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read blog comments"
  ON public.blog_comments
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Inserts from logged-in users (optional direct client path)
CREATE POLICY "Authenticated users insert own comment"
  ON public.blog_comments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND anonymous_participant_id IS NULL
  );

-- Anonymous / server-only inserts use service role (bypasses RLS).
