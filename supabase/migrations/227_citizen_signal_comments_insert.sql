-- =============================================================================
-- PENDING USER APPROVAL — apply manually in Supabase Dashboard.
-- Do NOT run via `supabase db push`. Apply ONCE in the shared Supabase project
-- (web + mobile share the same database). The identical file ships in the mobile
-- repo (supabase/migrations/20260603_citizen_signal_comments_insert.sql).
-- =============================================================================
-- citizen_signal_comments INSERT policy — allow authenticated users to post a
-- comment on a PUBLISHED signal directly via supabase-js, so mobile does not
-- depend on the SIGNALS_ENABLED, cookie-auth'd web API.
--
-- Mirrors the existing read gate (citizen_signal_comments_published_select,
-- migration 219): writes are only allowed when the parent signal is published,
-- and only for the author's own row (author_user_id = auth.uid()).
--
-- Direct inserts bypass the web's Upstash rate limiting; client-side
-- moderation (lib/moderation.ts) + the content report flow are the
-- abuse mitigations. A per-user rate-limit trigger/RPC is a future item.
-- =============================================================================

DROP POLICY IF EXISTS citizen_signal_comments_insert_published
  ON public.citizen_signal_comments;

CREATE POLICY citizen_signal_comments_insert_published
  ON public.citizen_signal_comments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    author_user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.citizen_signals s
       WHERE s.id = citizen_signal_comments.signal_id
         AND s.publication_status = 'published'
    )
  );
