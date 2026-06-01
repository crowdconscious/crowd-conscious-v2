-- Influencer blog editor role (author-scoped)
--
-- ⚠️  CONFIRM BEFORE APPLYING in Supabase Dashboard → SQL Editor.
-- Grants blog_posts CRUD to admins (all rows) and influencers (own rows only).
-- App gates: lib/auth/is-blog-editor.ts, lib/auth/blog-post-access.ts
--
-- After applying, promote a user:
--   UPDATE public.profiles SET user_type = 'influencer' WHERE email = 'you@example.com';
--
-- Storage: cover via /api/sponsor/upload-logo; inline images via
-- /api/predictions/admin/blog-posts/upload-image (service role).

ALTER TABLE public.blog_posts
  ADD COLUMN IF NOT EXISTS author_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_blog_posts_author_id ON public.blog_posts(author_id);

COMMENT ON COLUMN public.blog_posts.author_id IS
  'Profile that owns the post for influencer editors; null = legacy/admin/agent content.';

-- Replace admin-only blog policy with split admin + influencer policies.
DROP POLICY IF EXISTS "Admins manage all posts" ON public.blog_posts;
DROP POLICY IF EXISTS "Blog editors manage all posts" ON public.blog_posts;

CREATE POLICY "Admins manage all blog posts"
  ON public.blog_posts
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.user_type = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.user_type = 'admin'
    )
  );

CREATE POLICY "Influencers manage own blog posts"
  ON public.blog_posts
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.user_type = 'influencer'
    )
    AND author_id = auth.uid()
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.user_type = 'influencer'
    )
    AND author_id = auth.uid()
  );

COMMENT ON TABLE public.blog_posts IS
  'Public blog; RLS: published readable by anyone; admin all rows; influencer own rows (author_id).';
