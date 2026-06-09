-- =============================================================================
-- PENDING USER APPROVAL — apply manually in Supabase Dashboard.
-- Do NOT run via `supabase db push`. Apply ONCE in the shared Supabase project
-- (web + mobile share the same database).
-- =============================================================================
-- app_referral_clicks — click-based attribution for creator app-download links.
--
-- Creators share https://www.crowdconscious.app/app?ref=THEIRHANDLE . The /app
-- route (app/app/route.ts) best-effort logs one row here, then 302-redirects to
-- the iOS App Store. Apple does NOT pass referral data into installs, so this is
-- CLICK attribution only — surface it as "clics referidos", never "instalaciones".
--
-- RLS:
--   * INSERT — public (anon + authenticated). The /app route currently inserts
--     with the service-role client (bypasses RLS), but the public INSERT policy
--     is kept so direct client logging also works. Rate limiting is enforced
--     app-side (Upstash), consistent with migration 227; a DB-side limit is a
--     future item.
--   * SELECT — admins (public.is_admin(), migration 136) read everything.
--     The owning creator reading ONLY their own counts is provided below but is
--     COMMENTED OUT pending confirmation of which column holds the creator
--     handle (see "ACTION REQUIRED").
-- =============================================================================

-- 1. Table -------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.app_referral_clicks (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ref_handle   text,
  referrer_url text,
  user_agent   text,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- Counts are grouped by handle and trended over time.
CREATE INDEX IF NOT EXISTS app_referral_clicks_ref_handle_idx
  ON public.app_referral_clicks (ref_handle);
CREATE INDEX IF NOT EXISTS app_referral_clicks_created_at_idx
  ON public.app_referral_clicks (created_at DESC);

-- 2. RLS ---------------------------------------------------------------------
ALTER TABLE public.app_referral_clicks ENABLE ROW LEVEL SECURITY;

-- INSERT: public click logging (anon + authenticated). Rate-limited app-side.
DROP POLICY IF EXISTS app_referral_clicks_public_insert
  ON public.app_referral_clicks;
CREATE POLICY app_referral_clicks_public_insert
  ON public.app_referral_clicks
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- SELECT: admins read everything (analytics dashboards).
DROP POLICY IF EXISTS app_referral_clicks_admin_select
  ON public.app_referral_clicks;
CREATE POLICY app_referral_clicks_admin_select
  ON public.app_referral_clicks
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- ===========================================================================
-- ACTION REQUIRED before enabling the per-creator read below:
-- Confirm which column on public.profiles stores the creator/referral handle
-- used in /app?ref=THEIRHANDLE. This repo's migrations do not define a
-- `profiles.username`/`handle` column, so the owning-creator policy is left
-- COMMENTED OUT to avoid guessing. Replace `<HANDLE_COLUMN>` with the real
-- column (e.g. username, handle) and run this block.
-- ===========================================================================
-- CREATE OR REPLACE FUNCTION public.app_referral_handle_is_mine(p_ref_handle text)
-- RETURNS boolean
-- LANGUAGE sql
-- STABLE
-- SECURITY DEFINER
-- SET search_path = public
-- AS $$
--   SELECT EXISTS (
--     SELECT 1 FROM public.profiles
--      WHERE id = auth.uid()
--        AND <HANDLE_COLUMN> = p_ref_handle
--   );
-- $$;
-- GRANT EXECUTE ON FUNCTION public.app_referral_handle_is_mine(text) TO authenticated;
--
-- DROP POLICY IF EXISTS app_referral_clicks_owner_select
--   ON public.app_referral_clicks;
-- CREATE POLICY app_referral_clicks_owner_select
--   ON public.app_referral_clicks
--   FOR SELECT
--   TO authenticated
--   USING (
--     ref_handle IS NOT NULL
--     AND public.app_referral_handle_is_mine(ref_handle)
--   );
