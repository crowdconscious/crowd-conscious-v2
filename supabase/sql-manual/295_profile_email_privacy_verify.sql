-- 295 verify (read-only)
-- a) anon/authenticated cannot read private profile columns (expect all false)
select c, has_column_privilege('anon','public.profiles',c,'select') anon, has_column_privilege('authenticated','public.profiles',c,'select') authd
from unnest(array['email','stripe_connect_id','stripe_onboarding_complete','stripe_charges_enabled','stripe_payouts_enabled','suspended_by','suspension_reason']) c;
-- b) public columns still readable (expect true)
select has_column_privilege('anon','public.profiles','full_name','select') and has_column_privilege('anon','public.profiles','avatar_url','select') and has_column_privilege('authenticated','public.profiles','user_type','select') public_cols_ok;
-- c) leaderboard_view returns no emails (expect 0)
select count(*) from public.leaderboard_view where email is not null;

