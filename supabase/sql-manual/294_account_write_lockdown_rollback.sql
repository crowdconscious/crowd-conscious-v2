-- 294_account_write_lockdown rollback
BEGIN;
GRANT INSERT, UPDATE, DELETE, TRUNCATE ON public.profiles TO anon, authenticated;
DROP POLICY IF EXISTS "Service role can insert profiles" ON public.profiles;
CREATE POLICY "Service role can insert profiles" ON public.profiles AS PERMISSIVE FOR INSERT TO public WITH CHECK (true);
ALTER FUNCTION public.update_follow_counts() SECURITY INVOKER RESET search_path;
GRANT EXECUTE ON FUNCTION public.update_follow_counts() TO PUBLIC, anon, authenticated;
CREATE POLICY "Users can update own stats" ON public.user_stats AS PERMISSIVE FOR ALL TO public USING (((select auth.uid()) = user_id));
GRANT INSERT, UPDATE, DELETE, TRUNCATE ON public.user_stats TO anon, authenticated;
ALTER FUNCTION public.trigger_event_completion() SECURITY INVOKER RESET search_path;
GRANT EXECUTE ON FUNCTION public.trigger_event_completion() TO PUBLIC, anon, authenticated;
COMMIT;
