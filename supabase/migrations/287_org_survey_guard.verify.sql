-- Expect 2 rows: rls and forced both true, 0 policies, 0 anon/authenticated grants, service_role has grants.
SELECT c.relname, c.relrowsecurity AS rls, c.relforcerowsecurity AS forced,
  (SELECT count(*) FROM pg_policies p WHERE p.schemaname='public' AND p.tablename=c.relname) AS policies,
  (SELECT count(*) FROM information_schema.role_table_grants g WHERE g.table_schema='public' AND g.table_name=c.relname AND g.grantee IN ('anon','authenticated')) AS public_grants,
  (SELECT count(*) FROM information_schema.role_table_grants g WHERE g.table_schema='public' AND g.table_name=c.relname AND g.grantee='service_role') AS svc_grants
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace AND n.nspname='public'
WHERE c.relname IN ('org_survey_nonces','org_survey_rate') ORDER BY 1;
-- Expect: security invoker (false), search_path set, anon/auth false, service_role true.
SELECT p.prosecdef, p.proconfig,
  has_function_privilege('anon','public.org_survey_rate_hit(text,int,int)','EXECUTE') AS anon_exec,
  has_function_privilege('authenticated','public.org_survey_rate_hit(text,int,int)','EXECUTE') AS auth_exec,
  has_function_privilege('service_role','public.org_survey_rate_hit(text,int,int)','EXECUTE') AS svc_exec
FROM pg_proc p WHERE p.proname='org_survey_rate_hit';
SELECT version, name FROM supabase_migrations.schema_migrations WHERE name='287_org_survey_guard';
