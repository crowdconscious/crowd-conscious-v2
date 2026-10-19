-- Expect: 2 new columns on conscious_locations.
SELECT column_name, data_type FROM information_schema.columns
WHERE table_schema='public' AND table_name='conscious_locations' AND column_name IN ('src_slug','org_id') ORDER BY 1;
-- Expect 3 rows: rls + forced true, 0 policies, 0 anon/authenticated grants, service_role grants > 0.
SELECT c.relname, c.relrowsecurity AS rls, c.relforcerowsecurity AS forced,
  (SELECT count(*) FROM pg_policies p WHERE p.schemaname='public' AND p.tablename=c.relname) AS policies,
  (SELECT count(*) FROM information_schema.role_table_grants g WHERE g.table_schema='public' AND g.table_name=c.relname AND g.grantee IN ('anon','authenticated')) AS public_grants,
  (SELECT count(*) FROM information_schema.role_table_grants g WHERE g.table_schema='public' AND g.table_name=c.relname AND g.grantee='service_role') AS svc_grants
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace AND n.nspname='public'
WHERE c.relname IN ('values_pledges','seal_awards','seal_award_events') ORDER BY 1;
-- Expect: view exists, security_invoker, not readable by anon/authenticated.
SELECT c.relname, c.reloptions,
  has_table_privilege('anon', 'public.lugar_consciente_progress', 'SELECT') AS anon_sel,
  has_table_privilege('authenticated', 'public.lugar_consciente_progress', 'SELECT') AS auth_sel
FROM pg_class c WHERE c.relname='lugar_consciente_progress';
-- Expect 0 rows until src_slug is filled (backfill script is dry-run only).
SELECT count(*) AS locations_with_src FROM public.conscious_locations WHERE src_slug IS NOT NULL;
SELECT * FROM public.lugar_consciente_progress LIMIT 5;
