-- 315_ciceron_engagement_seed.rollback.sql
-- Removes Prompt 8 seed rows (e200…). Does not drop 314 schema.

DELETE FROM ciceron.events
WHERE id >= 'e2000000-0000-4000-8000-000000000001'::uuid
  AND id <= 'e2000000-0000-4000-8000-0000000000ff'::uuid;

DELETE FROM ciceron.ai_runs
WHERE id IN (
  'e2000000-0000-4000-8000-000000000201'::uuid,
  'e2000000-0000-4000-8000-000000000202'::uuid,
  'e2000000-0000-4000-8000-000000000203'::uuid,
  'e2000000-0000-4000-8000-000000000204'::uuid
);

DELETE FROM ciceron.engagement_resume
WHERE firm_id = 'a1000000-0000-4000-8000-000000000001'::uuid
  AND user_id = 'b1000000-0000-4000-8000-000000000001'::uuid;

DELETE FROM ciceron.firm_onboarding
WHERE firm_id = 'a1000000-0000-4000-8000-000000000001'::uuid
  AND is_demo = true;

DELETE FROM ciceron.briefing_previews
WHERE firm_id = 'a1000000-0000-4000-8000-000000000001'::uuid
  AND is_demo = true;
