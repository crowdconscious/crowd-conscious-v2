-- 313_ciceron_review_seed.rollback.sql
-- Removes ONLY Prompt 7 seed rows (g1… ids). Does not drop 312 schema.

DELETE FROM ciceron.audit_events
WHERE payload->>'source' = '313_review_seed';

DELETE FROM ciceron.review_tasks
WHERE id IN (
  'g1000000-0000-4000-8000-000000000041'::uuid,
  'g1000000-0000-4000-8000-000000000042'::uuid,
  'g1000000-0000-4000-8000-000000000043'::uuid,
  'g1000000-0000-4000-8000-000000000044'::uuid
);

DELETE FROM ciceron.draft_versions
WHERE id IN (
  'g1000000-0000-4000-8000-000000000031'::uuid,
  'g1000000-0000-4000-8000-000000000032'::uuid,
  'g1000000-0000-4000-8000-000000000033'::uuid,
  'g1000000-0000-4000-8000-000000000034'::uuid
);

DELETE FROM ciceron.drafts
WHERE id IN (
  'g1000000-0000-4000-8000-000000000021'::uuid,
  'g1000000-0000-4000-8000-000000000022'::uuid,
  'g1000000-0000-4000-8000-000000000023'::uuid
);

DELETE FROM ciceron.ai_outputs
WHERE id IN (
  'g1000000-0000-4000-8000-000000000011'::uuid,
  'g1000000-0000-4000-8000-000000000012'::uuid,
  'g1000000-0000-4000-8000-000000000013'::uuid
);

DELETE FROM ciceron.ai_runs
WHERE id IN (
  'g1000000-0000-4000-8000-000000000001'::uuid,
  'g1000000-0000-4000-8000-000000000002'::uuid,
  'g1000000-0000-4000-8000-000000000003'::uuid
);

DELETE FROM ciceron.prompt_versions
WHERE id = 'g1000000-0000-4000-8000-000000000051'::uuid;

-- Leave firm_settings row (created by 312 verify / 313); clearing four_eyes is safer than drop
UPDATE ciceron.firm_settings
SET four_eyes_output_types = '{}'::text[],
    email_allowlist = '{}'::text[],
    updated_at = now()
WHERE firm_id = 'a1000000-0000-4000-8000-000000000001'::uuid;
