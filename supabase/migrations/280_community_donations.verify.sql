-- Verify 280_community_donations (read-only)
SELECT relname, relrowsecurity FROM pg_class WHERE relname = 'community_donations';           -- expect relrowsecurity = true
SELECT count(*) AS policies FROM pg_policies WHERE tablename = 'community_donations';          -- expect 0 (service_role only)
SELECT grantee, privilege_type FROM information_schema.role_table_grants
 WHERE table_name = 'community_donations' ORDER BY grantee;                                  -- expect only service_role (+ owner)
SELECT column_name, data_type FROM information_schema.columns
 WHERE table_name = 'community_donations' ORDER BY ordinal_position;
SELECT p.proname, p.prosecdef, has_function_privilege('anon', p.oid, 'EXECUTE') AS anon_exec,
       has_function_privilege('service_role', p.oid, 'EXECUTE') AS service_exec
  FROM pg_proc p WHERE p.proname = 'credit_community_donation';                              -- expect prosecdef t, anon_exec f, service_exec t
SELECT conname FROM pg_constraint WHERE conrelid = 'public.conscious_fund_transactions'::regclass AND contype = 'c'; -- source_type must allow 'donation'
