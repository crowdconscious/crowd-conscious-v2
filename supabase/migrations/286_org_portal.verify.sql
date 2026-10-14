-- Expect 7 rows, all rls = true, no policies, no anon/authenticated grants.
SELECT c.relname, c.relrowsecurity AS rls,
  (SELECT count(*) FROM pg_policies p WHERE p.tablename = c.relname) AS policies,
  (SELECT string_agg(DISTINCT grantee, ',') FROM information_schema.role_table_grants g
     WHERE g.table_name = c.relname AND grantee IN ('anon','authenticated')) AS public_grants
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname = 'public'
WHERE c.relname IN ('orgs','org_members','org_readings','org_questions','org_responses','org_answers','org_reading_events')
ORDER BY 1;
-- Expect execute only for service_role (and postgres).
SELECT grantee FROM information_schema.routine_privileges WHERE routine_name = 'org_question_histograms';
-- Defaults: seat_limit 10, max_extension_days 0, allow_early_close true.
SELECT column_name, column_default FROM information_schema.columns
WHERE table_name = 'orgs' AND column_name IN ('seat_limit','max_extension_days','allow_early_close','billing_status');
