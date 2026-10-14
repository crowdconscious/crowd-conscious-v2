-- Rollback 286_org_portal (destroys all portal data).
DROP FUNCTION IF EXISTS public.org_question_histograms(uuid);
DROP TABLE IF EXISTS public.org_reading_events, public.org_answers, public.org_responses,
  public.org_questions, public.org_readings, public.org_members, public.orgs CASCADE;
DELETE FROM supabase_migrations.schema_migrations WHERE name = '286_org_portal';
