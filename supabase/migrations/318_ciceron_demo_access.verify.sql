-- 318_ciceron_demo_access.verify.sql
-- Non-persistent: BEGIN … ROLLBACK.

BEGIN;

DO $$
DECLARE
  n int;
  res jsonb;
  firm uuid := 'a1000000-0000-4000-8000-000000000001'::uuid;
  socio uuid := 'b1000000-0000-4000-8000-000000000001'::uuid;
  pasante uuid := 'b1000000-0000-4000-8000-000000000003'::uuid;
  abac uuid := 'e3000000-0000-4000-8000-000000000010'::uuid;
  stranger uuid := 'f1000000-0000-4000-8000-000000000099'::uuid;
  doc_expired uuid := 'e3000000-0000-4000-8000-000000000023'::uuid;
  client_farma uuid := 'c1000000-0000-4000-8000-000000000002'::uuid;
  matter_viento uuid := 'd1000000-0000-4000-8000-000000000004'::uuid;
  audit_before int;
  audit_after int;
BEGIN
  SELECT count(*) INTO n FROM information_schema.tables
  WHERE table_schema = 'ciceron' AND table_name = 'client_conflicts';
  IF n <> 1 THEN RAISE EXCEPTION 'FAIL: client_conflicts missing'; END IF;

  SELECT count(*) INTO n FROM information_schema.tables
  WHERE table_schema = 'ciceron' AND table_name = 'access_grants';
  IF n <> 1 THEN RAISE EXCEPTION 'FAIL: access_grants missing'; END IF;

  SELECT count(*) INTO n FROM information_schema.columns
  WHERE table_schema = 'ciceron' AND table_name = 'documents'
    AND column_name = 'sensitivity_level';
  IF n <> 1 THEN RAISE EXCEPTION 'FAIL: documents.sensitivity_level missing'; END IF;

  -- ABAC persona uses non-redeemable placeholder invite_code
  IF NOT EXISTS (
    SELECT 1 FROM ciceron.demo_personas
    WHERE id = abac AND invite_code = 'nr-e3000000000000000000000000000010'
  ) THEN
    RAISE EXCEPTION 'FAIL: ABAC persona invite_code placeholder missing';
  END IF;

  -- No seeded invite for ABAC persona
  IF EXISTS (
    SELECT 1 FROM ciceron.invite_codes WHERE default_persona_id = abac
  ) THEN
    RAISE EXCEPTION 'FAIL: ABAC persona must not have a seeded invite';
  END IF;

  -- RBAC: socio allowed
  res := ciceron.evaluate_access(
    socio, firm, 'approve_review', 'review_tasks', NULL, NULL, NULL, true, NULL
  );
  IF COALESCE(res->>'ok', 'false') <> 'true' THEN
    RAISE EXCEPTION 'FAIL: socio should approve (RBAC): %', res;
  END IF;

  -- RBAC: pasante denied with policy
  SELECT count(*) INTO audit_before FROM ciceron.audit_events
  WHERE outcome = 'denied' AND policy_id = 'rbac_role';

  res := ciceron.evaluate_access(
    pasante, firm, 'approve_review', 'review_tasks', NULL, NULL, NULL, true, NULL
  );
  IF COALESCE(res->>'ok', 'true') <> 'false' THEN
    RAISE EXCEPTION 'FAIL: pasante should be denied approve_review';
  END IF;
  IF res->>'policy_id' <> 'rbac_role' THEN
    RAISE EXCEPTION 'FAIL: expected rbac_role, got %', res->>'policy_id';
  END IF;
  IF res->>'policy_reason' IS NULL OR res->>'policy_reason' NOT LIKE '%RBAC%' THEN
    RAISE EXCEPTION 'FAIL: denial reason missing Spanish RBAC text';
  END IF;

  SELECT count(*) INTO audit_after FROM ciceron.audit_events
  WHERE outcome = 'denied' AND policy_id = 'rbac_role';
  IF audit_after <= audit_before THEN
    RAISE EXCEPTION 'FAIL: RBAC denial not audited';
  END IF;

  -- Non-member denial audited before set_actor would raise
  SELECT count(*) INTO audit_before FROM ciceron.audit_events
  WHERE outcome = 'denied' AND policy_id = 'rbac_membership';

  res := ciceron.evaluate_access(
    stranger, firm, 'approve_review', 'review_tasks', NULL, NULL, NULL, true, NULL
  );
  IF COALESCE(res->>'ok', 'true') <> 'false' THEN
    RAISE EXCEPTION 'FAIL: non-member should be denied';
  END IF;
  IF res->>'policy_id' <> 'rbac_membership' THEN
    RAISE EXCEPTION 'FAIL: expected rbac_membership, got %', res;
  END IF;

  SELECT count(*) INTO audit_after FROM ciceron.audit_events
  WHERE outcome = 'denied' AND policy_id = 'rbac_membership';
  IF audit_after <= audit_before THEN
    RAISE EXCEPTION 'FAIL: rbac_membership denial not audited';
  END IF;

  -- ABAC: conflict wall
  res := ciceron.evaluate_access(
    abac, firm, 'read', 'document', doc_expired, client_farma, NULL, true, NULL
  );
  IF COALESCE(res->>'ok', 'true') <> 'false' THEN
    RAISE EXCEPTION 'FAIL: ABAC conflict wall should deny';
  END IF;
  IF res->>'policy_id' <> 'abac_conflict_wall' THEN
    RAISE EXCEPTION 'FAIL: expected abac_conflict_wall, got %', res;
  END IF;

  -- ABAC: matter assignment reachable for ABAC persona (not short-circuited by role)
  res := ciceron.evaluate_access(
    abac, firm, 'read', 'document', NULL, NULL, matter_viento, true, NULL
  );
  IF COALESCE(res->>'ok', 'true') <> 'false' THEN
    RAISE EXCEPTION 'FAIL: ABAC matter assignment should deny for unassigned matter';
  END IF;
  IF res->>'policy_id' <> 'abac_matter_assignment' THEN
    RAISE EXCEPTION 'FAIL: expected abac_matter_assignment, got %', res;
  END IF;

  -- ABAC: expired grant (no conflict client)
  res := ciceron.evaluate_access(
    abac, firm, 'read', 'document', doc_expired, NULL, NULL, true, NULL
  );
  IF COALESCE(res->>'ok', 'true') <> 'false' THEN
    RAISE EXCEPTION 'FAIL: expired grant should deny';
  END IF;
  IF res->>'policy_id' <> 'abac_grant_expired' THEN
    RAISE EXCEPTION 'FAIL: expected abac_grant_expired, got %', res;
  END IF;

  -- try_access_demo rbac: simulated denial records real caller
  SELECT count(*) INTO audit_before FROM ciceron.audit_events
  WHERE outcome = 'denied'
    AND policy_id = 'rbac_role'
    AND user_id = socio
    AND payload ? 'simulated_by';

  res := ciceron.try_access_demo(socio, firm, 'rbac');
  IF COALESCE(res->>'ok', 'false') <> 'true' THEN
    RAISE EXCEPTION 'FAIL: try_access_demo rbac: %', res;
  END IF;
  IF COALESCE(res->'denied'->>'ok', 'true') <> 'false' THEN
    RAISE EXCEPTION 'FAIL: try_access_demo rbac denied side';
  END IF;

  SELECT count(*) INTO audit_after FROM ciceron.audit_events
  WHERE outcome = 'denied'
    AND policy_id = 'rbac_role'
    AND user_id = socio
    AND payload ? 'simulated_by';
  IF audit_after <= audit_before THEN
    RAISE EXCEPTION 'FAIL: simulated denial missing simulated_by on real caller';
  END IF;

  IF has_function_privilege(
    'authenticated',
    'ciceron.evaluate_access(uuid, uuid, text, text, uuid, uuid, uuid, boolean, uuid)',
    'EXECUTE'
  ) THEN
    RAISE EXCEPTION 'FAIL: authenticated can EXECUTE evaluate_access';
  END IF;

  RAISE NOTICE 'OK: 318 demo access verified';
END $$;

ROLLBACK;
