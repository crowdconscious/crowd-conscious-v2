-- =============================================================================
-- PENDING USER APPROVAL — apply manually in Supabase Dashboard.
-- Do NOT run via `supabase db push`. Apply ONCE in the shared Supabase project
-- (web + mobile share the same database).
--
-- APPLY ORDER for the creator-market batch: 232 -> 233 -> 234 -> 235.
-- (The OPTIONAL backfill file is NOT part of this chain — review separately.)
-- =============================================================================
-- PROMPT 1 — Blog fields + self-serve creator signup + creator trust tier.
--
-- What this adds:
--   * blog_posts.author_id (the creator who owns the post) + sources jsonb +
--     a 'pending_review' status value.
--   * profiles.social_links jsonb (canonical for the new creator UI),
--     profiles.creator_trust_level int, and profiles.handle (the public creator
--     handle used by /app?ref=<handle> and the app_referral_clicks owner-read
--     policy in migration 231).
--   * Canonical self-serve creator role string = 'influencer' (added by
--     migration 225). We do NOT introduce a separate 'creator' value.
--   * RLS so a creator can CRUD only their OWN drafts, cannot edit others'
--     posts, and cannot self-publish until creator_trust_level >= 2. Admins
--     keep full moderation/publish control and may adjust trust levels.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. profiles — creator handle, trust level, social links
-- ---------------------------------------------------------------------------

-- Public creator handle. Used by /app?ref=<handle> (migration 231) and creator
-- referral links. Nullable until a creator claims one; lowercase + a-z0-9_ only;
-- unique (case-insensitive). bio + avatar_url already exist on profiles.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS handle text;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_handle_format_chk;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_handle_format_chk
  CHECK (handle IS NULL OR handle ~ '^[a-z0-9_]{3,30}$')
  NOT VALID;

-- Case-insensitive uniqueness; multiple NULLs are allowed.
CREATE UNIQUE INDEX IF NOT EXISTS profiles_handle_lower_key
  ON public.profiles (lower(handle))
  WHERE handle IS NOT NULL;

COMMENT ON COLUMN public.profiles.handle IS
  'Public creator handle for /app?ref=<handle> and creator referral attribution. Nullable until set; lowercase [a-z0-9_]{3,30}; unique case-insensitive.';

-- Creator trust tier. 0 = new creator (drafts only), >=2 = may self-publish.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS creator_trust_level integer NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.profiles.creator_trust_level IS
  'Creator trust tier. 0 = drafts only. >= 2 unlocks self-publish of own blog posts. Only admins may change this.';

-- Canonical structured socials for the new creator UI: {instagram,tiktok,x,website}.
-- The legacy scalar columns (twitter, linkedin, instagram, website) are kept for
-- backwards-compat but new creator code reads/writes social_links.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS social_links jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.profiles.social_links IS
  'Canonical creator socials: {instagram,tiktok,x,website}. Supersedes the legacy twitter/linkedin/instagram/website scalar columns for new code.';

-- Re-assert the user_type CHECK so a fresh DB also allows 'influencer'
-- (canonical self-serve creator role; added by migration 225).
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_user_type_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_user_type_check
  CHECK (user_type IN ('user', 'brand', 'admin', 'influencer'));

-- ---------------------------------------------------------------------------
-- 2. blog_posts — author ownership, sources, pending_review status
-- ---------------------------------------------------------------------------

-- The creator who owns/authored the post (distinct from the legacy `edited_by`,
-- which tracks the last editor in the agent-content flow).
ALTER TABLE public.blog_posts
  ADD COLUMN IF NOT EXISTS author_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_blog_posts_author ON public.blog_posts(author_id);

COMMENT ON COLUMN public.blog_posts.author_id IS
  'Creator who owns this post. Drives creator RLS (CRUD own drafts only). Distinct from edited_by (legacy last-editor).';

-- Cited sources: array of {label, url}.
ALTER TABLE public.blog_posts
  ADD COLUMN IF NOT EXISTS sources jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.blog_posts.sources IS
  'Array of cited sources: [{ "label": text, "url": text }]. Defaults to [].';

-- Widen status to include 'pending_review' (creator submits for moderation).
-- 'archived' is retained so existing archived rows stay valid. Default stays 'draft'.
ALTER TABLE public.blog_posts
  DROP CONSTRAINT IF EXISTS blog_posts_status_check;
ALTER TABLE public.blog_posts
  ADD CONSTRAINT blog_posts_status_check
  CHECK (status IN ('draft', 'pending_review', 'published', 'archived'));

-- ---------------------------------------------------------------------------
-- 3. SECURITY DEFINER helper — caller's own creator trust level
--    (an RLS WITH CHECK referencing profiles would otherwise hit profiles RLS;
--     same pattern as is_signal_published in migration 230).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.my_creator_trust_level()
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT creator_trust_level FROM public.profiles WHERE id = auth.uid()),
    0
  );
$$;

GRANT EXECUTE ON FUNCTION public.my_creator_trust_level() TO authenticated;

-- ---------------------------------------------------------------------------
-- 4. blog_posts RLS — creator CRUD-own-drafts; self-publish gated to trust>=2.
--    Existing policies are preserved:
--      * "Anyone can read published posts" (status = 'published')
--      * "Admins manage all posts" (full admin control / moderation / publish)
-- ---------------------------------------------------------------------------
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

-- Creator reads their OWN posts in any status (to manage drafts).
DROP POLICY IF EXISTS blog_posts_author_select_own ON public.blog_posts;
CREATE POLICY blog_posts_author_select_own
  ON public.blog_posts
  FOR SELECT
  TO authenticated
  USING (author_id = auth.uid());

-- Creator inserts only their own row, only as draft/pending_review
-- (never directly as published).
DROP POLICY IF EXISTS blog_posts_author_insert ON public.blog_posts;
CREATE POLICY blog_posts_author_insert
  ON public.blog_posts
  FOR INSERT
  TO authenticated
  WITH CHECK (
    author_id = auth.uid()
    AND status IN ('draft', 'pending_review')
  );

-- Creator updates only their own NOT-YET-published posts. They may move a post
-- to 'published' ONLY when their trust level >= 2; otherwise they are limited to
-- draft/pending_review. Once published, the USING clause excludes the row, so
-- further edits are admin-only.
DROP POLICY IF EXISTS blog_posts_author_update ON public.blog_posts;
CREATE POLICY blog_posts_author_update
  ON public.blog_posts
  FOR UPDATE
  TO authenticated
  USING (
    author_id = auth.uid()
    AND status IN ('draft', 'pending_review')
  )
  WITH CHECK (
    author_id = auth.uid()
    AND (
      status IN ('draft', 'pending_review')
      OR (status = 'published' AND public.my_creator_trust_level() >= 2)
    )
  );

-- Creator deletes only their own un-published drafts.
DROP POLICY IF EXISTS blog_posts_author_delete ON public.blog_posts;
CREATE POLICY blog_posts_author_delete
  ON public.blog_posts
  FOR DELETE
  TO authenticated
  USING (
    author_id = auth.uid()
    AND status IN ('draft', 'pending_review')
  );

-- ---------------------------------------------------------------------------
-- 5. profiles RLS — admins may adjust creator_trust_level (and moderate).
--    Additive: does not alter any existing profiles self-read/self-update policy.
-- ---------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS profiles_admin_update ON public.profiles;
CREATE POLICY profiles_admin_update
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
