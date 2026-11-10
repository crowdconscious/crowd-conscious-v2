-- 298_ciceron.rollback.sql
-- Manual rollback for Cicéron Prompt 1 (298–301). NOT applied by migrate tooling.
-- Run in SQL editor on the test branch if you need to wipe the module.

-- Storage policies + bucket
DROP POLICY IF EXISTS ciceron_storage_select ON storage.objects;
DROP POLICY IF EXISTS ciceron_storage_insert ON storage.objects;
DROP POLICY IF EXISTS ciceron_storage_update ON storage.objects;
DROP POLICY IF EXISTS ciceron_storage_delete ON storage.objects;
DELETE FROM storage.objects WHERE bucket_id = 'ciceron';
DELETE FROM storage.buckets WHERE id = 'ciceron';

DROP FUNCTION IF EXISTS ciceron.storage_firm_id(text);

-- Drop schema cascade (tables, triggers, functions, policies)
DROP SCHEMA IF EXISTS ciceron CASCADE;

-- Demo auth users created by 301 (safe: only our fixed UUIDs / .invalid emails)
DELETE FROM auth.identities
WHERE user_id IN (
  'b1000000-0000-4000-8000-000000000001'::uuid,
  'b1000000-0000-4000-8000-000000000002'::uuid,
  'b1000000-0000-4000-8000-000000000003'::uuid,
  'b1000000-0000-4000-8000-000000000004'::uuid,
  'b1000000-0000-4000-8000-000000000005'::uuid,
  'b1000000-0000-4000-8000-000000000011'::uuid
);

DELETE FROM auth.users
WHERE id IN (
  'b1000000-0000-4000-8000-000000000001'::uuid,
  'b1000000-0000-4000-8000-000000000002'::uuid,
  'b1000000-0000-4000-8000-000000000003'::uuid,
  'b1000000-0000-4000-8000-000000000004'::uuid,
  'b1000000-0000-4000-8000-000000000005'::uuid,
  'b1000000-0000-4000-8000-000000000011'::uuid
)
OR email LIKE '%@ciceron.demo.invalid';

-- Note: pgvector extension is left installed (may be shared). Drop manually only if unused:
-- DROP EXTENSION IF EXISTS vector;
