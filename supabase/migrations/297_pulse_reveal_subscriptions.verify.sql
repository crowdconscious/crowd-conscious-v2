-- Expect: rls=true, 3 policies (select/insert/delete), no UPDATE grant for authenticated.
SELECT relrowsecurity AS rls FROM pg_class WHERE oid = 'public.pulse_reveal_subscriptions'::regclass;
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'pulse_reveal_subscriptions' ORDER BY 1;
SELECT grantee, privilege_type FROM information_schema.role_table_grants
 WHERE table_name = 'pulse_reveal_subscriptions' AND grantee IN ('anon','authenticated') ORDER BY 1,2;
SELECT has_table_privilege('authenticated','public.pulse_reveal_subscriptions','UPDATE') AS auth_can_update; -- expect false
