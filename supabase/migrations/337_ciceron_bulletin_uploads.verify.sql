-- Verify 337_ciceron_bulletin_uploads.sql (non-persistent)
BEGIN;

DO $$
DECLARE
  firm uuid := 'a1000000-0000-4000-8000-000000000001'::uuid;
  actor uuid := 'b1000000-0000-4000-8000-000000000001'::uuid;
  src uuid := 'b7000000-0000-4000-8000-000000000003'::uuid; -- CDMX
  res jsonb;
  upload_id uuid;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'ciceron' AND table_name = 'bulletin_uploads'
  ) THEN
    RAISE EXCEPTION 'FAIL: bulletin_uploads missing';
  END IF;

  res := ciceron.create_bulletin_upload(
    firm, actor, 'CDMX', 'Ciudad de México', CURRENT_DATE,
    src, 'text/plain', NULL,
    'JUZGADO TRIGÉSIMO SEGUNDO DE LO CIVIL' || E'\n' || 'Exp. 87/2023' || E'\n' || 'Actor: Demo',
    'received', 0, 0, 'verify', NULL, true, 30, NULL
  );
  IF (res->>'ok')::boolean IS NOT TRUE THEN
    RAISE EXCEPTION 'FAIL: create_bulletin_upload %', res;
  END IF;
  upload_id := (res->>'id')::uuid;

  res := ciceron.finalize_bulletin_upload(
    firm, upload_id, actor, 'matched', 1, 1, 'ok', NULL
  );
  IF (res->>'ok')::boolean IS NOT TRUE THEN
    RAISE EXCEPTION 'FAIL: finalize_bulletin_upload %', res;
  END IF;

  -- Pasante denied
  res := ciceron.create_bulletin_upload(
    firm, 'b1000000-0000-4000-8000-000000000003'::uuid,
    'CDMX', 'Ciudad de México', CURRENT_DATE,
    src, NULL, NULL, 'texto', 'received', 0, 0, NULL, NULL, true, 30, NULL
  );
  IF (res->>'ok')::boolean IS NOT FALSE OR (res->>'policy_id') <> 'rbac_role' THEN
    RAISE EXCEPTION 'FAIL: pasante should be denied %', res;
  END IF;

  RAISE NOTICE 'PASS: 337_ciceron_bulletin_uploads';
END;
$$;

ROLLBACK;
