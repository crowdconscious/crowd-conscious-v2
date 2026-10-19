-- 293 verify (read-only)
-- policies still calling auth.* un-wrapped (expect 0)
select count(*) from pg_policies where schemaname='public'
  and regexp_replace(coalesce(qual,'')||' '||coalesce(with_check,''), '\( SELECT auth\.\w+\(\) AS \w+\)', '', 'gi') ~* 'auth\.(uid|role|jwt|email)\(\)';
-- dropped indexes gone (expect 0)
select count(*) from pg_class where relnamespace='public'::regnamespace and relname in (
 'idx_activity_responses_enrollment_id','idx_activity_responses_lesson_id','idx_activity_responses_module_id','idx_activity_responses_user_id',
 'idx_agent_runs_name','idx_agent_runs_created_at','idx_blog_posts_author_id','idx_certifications_verification',
 'idx_notifications_created_at','idx_notifications_user_id','idx_pred_markets_category');
-- policy count unchanged vs before
select count(*) from pg_policies where schemaname='public';
