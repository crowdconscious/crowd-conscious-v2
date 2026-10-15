DROP FUNCTION IF EXISTS public.org_survey_rate_hit(text, int, int);
DROP TABLE IF EXISTS public.org_survey_nonces, public.org_survey_rate;
DELETE FROM supabase_migrations.schema_migrations WHERE name = '287_org_survey_guard';
