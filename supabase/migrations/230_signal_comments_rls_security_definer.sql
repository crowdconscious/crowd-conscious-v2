-- =============================================================================
-- PENDING/idempotent — already applied manually in Supabase; committed for
-- record. web + mobile share one DB. Do NOT run via `supabase db push`.
-- The identical file ships in the mobile repo
-- (supabase/migrations/20260608_signal_comments_rls_security_definer.sql).
-- =============================================================================
-- Final state of the citizen_signal_comments RLS for direct supabase-js access
-- from mobile (and anon/auth web reads).
--
-- Root cause this supersedes: the original INSERT/SELECT policies (migration
-- 219 read gate + 227 insert gate) used an inline
--   EXISTS (SELECT 1 FROM public.citizen_signals s WHERE s.id = signal_id
--           AND s.publication_status = 'published')
-- subquery. That subquery runs under `citizen_signals` RLS, where anon and
-- non-author authenticated users have NO direct SELECT (public reads go only
-- through the `citizen_signals_public` view). So the EXISTS evaluated to false:
--   * INSERT was rejected (42501)
--   * SELECT returned ZERO rows → comments never displayed ("be the first…").
--
-- Fix: a SECURITY DEFINER helper `public.is_signal_published(uuid)` that checks
-- publication_status with the function owner's privileges (bypassing the
-- caller's RLS on citizen_signals), used by both policies. Visibility is
-- preserved: comments on published signals are publicly readable; only the
-- author may insert their own row.
-- =============================================================================

-- 1. SECURITY DEFINER helper -------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_signal_published(signal_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
      FROM public.citizen_signals s
     WHERE s.id = signal_id
       AND s.publication_status = 'published'
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_signal_published(uuid) TO anon, authenticated;

-- 2. INSERT policy (author posts own comment on a published signal) ----------
DROP POLICY IF EXISTS citizen_signal_comments_insert_published
  ON public.citizen_signal_comments;

CREATE POLICY citizen_signal_comments_insert_published
  ON public.citizen_signal_comments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    author_user_id = auth.uid()
    AND public.is_signal_published(signal_id)
  );

-- 3. SELECT policy (public read of comments on published signals) ------------
DROP POLICY IF EXISTS citizen_signal_comments_published_select
  ON public.citizen_signal_comments;

CREATE POLICY citizen_signal_comments_published_select
  ON public.citizen_signal_comments
  FOR SELECT
  TO anon, authenticated
  USING (public.is_signal_published(signal_id));
