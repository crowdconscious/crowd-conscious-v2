-- =============================================================================
-- PENDING USER APPROVAL — apply manually in Supabase Dashboard.
-- Do NOT run via `supabase db push`. Apply ONCE in the shared Supabase project
-- (web + mobile share the same database). The identical file ships in the mobile
-- repo (supabase/migrations/20260603_location_comments.sql).
-- =============================================================================
-- NEW TABLE: location_comments — per-entity comment thread on a Conscious
-- Location. conscious_locations (migration 186) has no comment table today;
-- this is genuinely net-new. Pattern mirrors blog_comments (migration 171) and
-- the citizen_signal published-gate (migration 219).
--
-- conscious_locations.id is uuid; status IN ('pending','active','under_review',
-- 'suspended','revoked') with 'active' being the public state.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.location_comments (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id uuid NOT NULL REFERENCES public.conscious_locations(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body        text NOT NULL CHECK (char_length(body) >= 1 AND char_length(body) <= 500),
  is_flagged  boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_location_comments_location_created
  ON public.location_comments (location_id, created_at ASC);

COMMENT ON TABLE public.location_comments IS
  'Public comments on a Conscious Location. Public read on active locations; authenticated users insert their own row; author + admin delete.';

ALTER TABLE public.location_comments ENABLE ROW LEVEL SECURITY;

-- Public read, but only on active (publicly visible) locations — mirrors the
-- conscious_locations "Anyone can view active locations" SELECT gate.
DROP POLICY IF EXISTS location_comments_public_select ON public.location_comments;
CREATE POLICY location_comments_public_select
  ON public.location_comments
  FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.conscious_locations l
       WHERE l.id = location_comments.location_id
         AND l.status = 'active'
    )
  );

-- Authenticated users insert their own comment only.
DROP POLICY IF EXISTS location_comments_insert_own ON public.location_comments;
CREATE POLICY location_comments_insert_own
  ON public.location_comments
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Authors can delete their own comment.
DROP POLICY IF EXISTS location_comments_author_delete ON public.location_comments;
CREATE POLICY location_comments_author_delete
  ON public.location_comments
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Admin moderation (mirror citizen_signal_comments_admin_all).
DROP POLICY IF EXISTS location_comments_admin_all ON public.location_comments;
CREATE POLICY location_comments_admin_all
  ON public.location_comments
  FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.user_type = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.user_type = 'admin'));
