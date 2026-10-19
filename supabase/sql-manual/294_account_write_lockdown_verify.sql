-- 294 verify (read-only). Expected: f,f,t,t,f,f,f,{service_role},0,t,t
select has_column_privilege('authenticated','public.profiles','user_type','update') user_type_upd,
       has_column_privilege('authenticated','public.profiles','admin_level','update') admin_level_upd,
       has_column_privilege('authenticated','public.profiles','full_name','update') full_name_upd,
       has_column_privilege('authenticated','public.profiles','terms_accepted_at','update') terms_upd,
       has_table_privilege('anon','public.profiles','insert') anon_insert,
       has_table_privilege('authenticated','public.user_stats','update') stats_upd,
       has_table_privilege('authenticated','public.user_stats','insert') stats_ins,
       (select roles::text from pg_policies where tablename='profiles' and policyname='Service role can insert profiles') ins_roles,
       (select count(*) from pg_policies where tablename='user_stats' and cmd in ('ALL','UPDATE','INSERT','DELETE')) stats_write_policies,
       (select prosecdef from pg_proc where proname='update_follow_counts') follow_definer,
       (select prosecdef from pg_proc where proname='trigger_event_completion') tec_definer;
