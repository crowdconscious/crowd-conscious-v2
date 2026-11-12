-- 318_ciceron_demo_access.rollback.sql
-- Drops only Prompt 9 access objects. Does not delete from audit_events.
-- Does not drop demo_personas / memberships from earlier prompts.

DROP FUNCTION IF EXISTS ciceron.try_access_demo(uuid, uuid, text, uuid);
DROP FUNCTION IF EXISTS ciceron.try_access_demo(uuid, uuid, text);
DROP FUNCTION IF EXISTS ciceron.evaluate_access(uuid, uuid, text, text, uuid, uuid, uuid, boolean, uuid);
DROP FUNCTION IF EXISTS ciceron.evaluate_access(uuid, uuid, text, text, uuid, uuid, uuid, boolean);
DROP FUNCTION IF EXISTS ciceron.role_rank(text);

DELETE FROM ciceron.access_grants
WHERE id IN (
  'e3000000-0000-4000-8000-000000000040'::uuid,
  'e3000000-0000-4000-8000-000000000041'::uuid
);

DELETE FROM ciceron.client_conflicts
WHERE id = 'e3000000-0000-4000-8000-000000000030'::uuid;

DELETE FROM ciceron.documents
WHERE id IN (
  'e3000000-0000-4000-8000-000000000021'::uuid,
  'e3000000-0000-4000-8000-000000000022'::uuid,
  'e3000000-0000-4000-8000-000000000023'::uuid
);

-- Any leftover non-public invite for the ABAC persona (from earlier drafts)
DELETE FROM ciceron.invite_codes
WHERE id = 'e3000000-0000-4000-8000-000000000007'::uuid
   OR default_persona_id = 'e3000000-0000-4000-8000-000000000010'::uuid;

-- Repoint or expire sessions before deleting the persona (FK ON DELETE RESTRICT)
UPDATE ciceron.demo_sessions
SET persona_id = 'b1000000-0000-4000-8000-000000000002'::uuid,
    expires_at = LEAST(expires_at, now()),
    updated_at = now()
WHERE persona_id = 'e3000000-0000-4000-8000-000000000010'::uuid;

DELETE FROM ciceron.matter_members
WHERE user_id = 'e3000000-0000-4000-8000-000000000010'::uuid;

DELETE FROM ciceron.memberships
WHERE user_id = 'e3000000-0000-4000-8000-000000000010'::uuid;

DELETE FROM ciceron.demo_personas
WHERE id = 'e3000000-0000-4000-8000-000000000010'::uuid;

DROP TABLE IF EXISTS ciceron.access_grants;
DROP TABLE IF EXISTS ciceron.client_conflicts;

ALTER TABLE ciceron.documents DROP COLUMN IF EXISTS sensitivity_level;
ALTER TABLE ciceron.documents DROP COLUMN IF EXISTS matter_id;
ALTER TABLE ciceron.documents DROP COLUMN IF EXISTS is_demo;
