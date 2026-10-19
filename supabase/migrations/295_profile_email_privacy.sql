-- 295_profile_email_privacy.sql  (PREPARED, NOT APPLIED)
-- Stops exposing private profile columns to the anon/authenticated API roles.
-- PREREQUISITES (in this order):
--   1. Mobile OTA that drops `email` from its profiles select (useProfile).
--   2. Deploy the web code from the same PR.
--   3. Apply this migration, then run supabase/sql-manual/295_profile_email_privacy_verify.sql
-- Rollback: supabase/sql-manual/295_profile_email_privacy_rollback.sql
BEGIN;

-- 1. profiles: column-level SELECT. Rows stay publicly readable (existing policy), but
--    private columns are only readable by service_role (server code).
REVOKE SELECT ON public.profiles FROM anon, authenticated;
GRANT SELECT (id, full_name, avatar_url, user_type, created_at, bio, location, website, twitter, linkedin, instagram, is_public, follower_count, following_count, admin_level, suspended, suspended_at, is_corporate_user, corporate_account_id, corporate_role, training_xp, training_level, email_notifications, terms_accepted_at, terms_version, handle, creator_trust_level, social_links)
  ON public.profiles TO anon, authenticated;
COMMENT ON POLICY "Public can view profiles" ON public.profiles IS
  'Rows are public; private columns (email, stripe_connect_id, stripe_onboarding_complete, stripe_charges_enabled, stripe_payouts_enabled, suspended_by, suspension_reason) are not granted to anon/authenticated (mig 295).';

-- 2. leaderboard_view: never return email. Column kept as NULL for one release so
--    older mobile builds that still select it keep working; drop it in a later migration.
CREATE OR REPLACE VIEW public.leaderboard_view WITH (security_invoker = true) AS
 SELECT COALESCE(ux.user_id, us.user_id) AS user_id,
    COALESCE(ux.total_xp, us.total_xp, 0) AS total_xp,
    COALESCE(ux.current_tier,
        CASE
            WHEN (COALESCE(ux.total_xp, us.total_xp, 0) >= 7501) THEN 5
            WHEN (COALESCE(ux.total_xp, us.total_xp, 0) >= 3501) THEN 4
            WHEN (COALESCE(ux.total_xp, us.total_xp, 0) >= 1501) THEN 3
            WHEN (COALESCE(ux.total_xp, us.total_xp, 0) >= 501) THEN 2
            ELSE 1
        END) AS tier,
    COALESCE(p.full_name, 'Anonymous User'::text) AS full_name,
    NULL::text AS email,
    p.avatar_url
   FROM ((user_xp ux
     FULL JOIN user_stats us ON ((ux.user_id = us.user_id)))
     LEFT JOIN profiles p ON ((COALESCE(ux.user_id, us.user_id) = p.id)))
  WHERE ((COALESCE(ux.total_xp, us.total_xp, 0) > 0) AND (COALESCE(p.user_type, ''::text) <> 'admin'::text) AND (COALESCE(p.admin_level, ''::text) <> ALL (ARRAY['super'::text, 'super_admin'::text])))
  ORDER BY COALESCE(ux.total_xp, us.total_xp, 0) DESC;
COMMIT;

