-- 292 verify (read-only). Expect: 0 rows in each "should be empty" query.
-- a) SECURITY DEFINER functions anon can still execute (expect exactly the 7 kept public RPCs)
select p.oid::regprocedure from pg_proc p where p.pronamespace='public'::regnamespace and p.prosecdef
  and has_function_privilege('anon', p.oid, 'execute') order by 1;
-- b) should be empty: dangerous functions still executable by anon/authenticated
select p.oid::regprocedure from pg_proc p where p.pronamespace='public'::regnamespace
  and p.proname in ('award_xp','check_achievements','create_notification','spend_from_treasury','resolve_market_free','update_leaderboard_ranks','refresh_trusted_brands','get_user_referral_stats')
  and (has_function_privilege('anon',p.oid,'execute') or has_function_privilege('authenticated',p.oid,'execute'));
-- c) should be empty: SECURITY DEFINER functions without a pinned search_path that anon/authenticated can run
select p.oid::regprocedure from pg_proc p where p.pronamespace='public'::regnamespace and p.prosecdef and p.proconfig is null
  and (has_function_privilege('anon',p.oid,'execute') or has_function_privilege('authenticated',p.oid,'execute'));
-- d) leaderboard_view is invoker
select relname, reloptions from pg_class where oid='public.leaderboard_view'::regclass;  -- {security_invoker=true}
-- e) service_role still executes everything
select count(*) filter (where not has_function_privilege('service_role',p.oid,'execute')) as service_role_missing
from pg_proc p where p.pronamespace='public'::regnamespace and p.prosecdef;  -- 0
