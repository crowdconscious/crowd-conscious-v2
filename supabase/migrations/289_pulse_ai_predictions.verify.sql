-- Verify 289 (read-only).
select to_regclass('public.pulse_ai_predictions') as table_exists;
select relrowsecurity as rls_on from pg_class where oid = 'public.pulse_ai_predictions'::regclass;
select tgname from pg_trigger where tgrelid = 'public.pulse_ai_predictions'::regclass and not tgisinternal order by 1;
select grantee, privilege_type from information_schema.role_table_grants
 where table_schema = 'public' and table_name = 'pulse_ai_predictions' and grantee in ('anon','authenticated');  -- expect 0 rows
select count(*) as policies from pg_policies where tablename = 'pulse_ai_predictions';                           -- expect 0
-- Immutability smoke test (rolls back): expect "immutable once locked".
-- begin; update public.pulse_ai_predictions set model = model; rollback;
