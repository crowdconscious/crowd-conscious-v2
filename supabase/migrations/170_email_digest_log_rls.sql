-- Security: enable RLS on email_digest_log (Supabase linter 0013_rls_disabled_in_public).
-- All application access uses the service role (cron/API), which bypasses RLS.
-- No policies for anon/authenticated: default deny via PostgREST.

ALTER TABLE public.email_digest_log ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.email_digest_log IS
  'Email send log for digests/reengagement; RLS enabled. Access only via service role in server/cron.';
