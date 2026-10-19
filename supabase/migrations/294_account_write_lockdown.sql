-- 294_account_write_lockdown.sql
-- Profiles: signed-in users may only change user-editable columns on their own row;
-- direct profile inserts are limited to the service role. Role/trust/moderation/payment/
-- counter columns become server-written only.
-- user_stats: server-written only (server code, triggers, SECURITY DEFINER functions).
-- Prerequisite: web code from the same PR deployed.
-- Rollback: supabase/sql-manual/294_account_write_lockdown_rollback.sql
BEGIN;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.profiles FROM anon;
REVOKE INSERT, UPDATE, TRUNCATE ON public.profiles FROM authenticated;
GRANT UPDATE (full_name, avatar_url, bio, location, website, twitter, linkedin, instagram, is_public, social_links, email_notifications, terms_accepted_at, terms_version) ON public.profiles TO authenticated;

DROP POLICY IF EXISTS "Service role can insert profiles" ON public.profiles;
CREATE POLICY "Service role can insert profiles" ON public.profiles AS PERMISSIVE FOR INSERT TO service_role WITH CHECK (true);

-- update_follow_counts (trigger) updates other users' counters; run as owner.
ALTER FUNCTION public.update_follow_counts() SECURITY DEFINER SET search_path = public, extensions, pg_temp;
REVOKE EXECUTE ON FUNCTION public.update_follow_counts() FROM PUBLIC, anon, authenticated;

DROP POLICY IF EXISTS "Users can update own stats" ON public.user_stats;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.user_stats FROM anon, authenticated;

-- trigger_event_completion writes user_stats; not attached today, keep it working if re-attached.
ALTER FUNCTION public.trigger_event_completion() SECURITY DEFINER SET search_path = public, extensions, pg_temp;
REVOKE EXECUTE ON FUNCTION public.trigger_event_completion() FROM PUBLIC, anon, authenticated;
COMMIT;
