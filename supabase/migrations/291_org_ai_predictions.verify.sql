-- Verify 291_org_ai_predictions. Every row should say ok = true.
select 'table exists' as check, to_regclass('public.org_ai_predictions') is not null as ok
union all
select 'rls enabled+forced', (select relrowsecurity and relforcerowsecurity from pg_class where oid = 'public.org_ai_predictions'::regclass)
union all
select 'no policies', not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'org_ai_predictions')
union all
select 'anon has no select', not has_table_privilege('anon', 'public.org_ai_predictions', 'select')
union all
select 'authenticated has no select', not has_table_privilege('authenticated', 'public.org_ai_predictions', 'select')
union all
select 'service_role can insert', has_table_privilege('service_role', 'public.org_ai_predictions', 'insert')
union all
select 'stamp trigger', exists (select 1 from pg_trigger where tgname = 'org_ai_predictions_stamp_lock' and tgrelid = 'public.org_ai_predictions'::regclass)
union all
select 'immutable trigger', exists (select 1 from pg_trigger where tgname = 'org_ai_predictions_immutable' and tgrelid = 'public.org_ai_predictions'::regclass)
union all
select 'unique (question_id, subject_hash)', exists (select 1 from pg_constraint where conname = 'org_ai_predictions_question_subject_key')
union all
select 'trigger fns not executable by anon', not has_function_privilege('anon', 'public.org_ai_predictions_stamp_lock()', 'execute');
