-- Verify 331_ciceron_match_collaboration.sql (side-effect free via ROLLBACK)
BEGIN;

DO $$
DECLARE
  firm uuid := 'a1000000-0000-4000-8000-000000000001'::uuid;
  socio uuid := 'b1000000-0000-4000-8000-000000000001'::uuid;
  pasante uuid := 'b1000000-0000-4000-8000-000000000003'::uuid;
  matter_ok uuid := 'd1000000-0000-4000-8000-000000000001'::uuid; -- nexora CNBV (pasante member)
  matter_blocked uuid := 'd1000000-0000-4000-8000-000000000002'::uuid; -- nexora PLD (pasante blocked)
  -- Prefer v_match_id: a bare match_id PL/pgSQL var is ambiguous with the
  -- column name if this verify ever inserts with ON CONFLICT (match_id, …).
  v_match_id uuid;
  res jsonb;
  n int;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'ciceron' AND table_name = 'match_assignments'
  ) THEN
    RAISE EXCEPTION 'FAIL: match_assignments missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'ciceron' AND table_name = 'match_comments'
  ) THEN
    RAISE EXCEPTION 'FAIL: match_comments missing';
  END IF;

  SELECT count(*) INTO n
  FROM pg_policies
  WHERE schemaname = 'ciceron' AND tablename = 'match_assignments';
  IF n < 3 THEN
    RAISE EXCEPTION 'FAIL: expected >=3 policies on match_assignments, got %', n;
  END IF;

  SELECT count(*) INTO n
  FROM pg_policies
  WHERE schemaname = 'ciceron' AND tablename = 'match_comments';
  IF n < 3 THEN
    RAISE EXCEPTION 'FAIL: expected >=3 policies on match_comments, got %', n;
  END IF;

  -- Pick any demo match for nexora client via watch_profiles
  SELECT mt.id INTO v_match_id
  FROM ciceron.matches mt
  JOIN ciceron.watch_profiles wp ON wp.id = mt.watch_profile_id
  WHERE wp.client_id = 'c1000000-0000-4000-8000-000000000001'::uuid
  LIMIT 1;

  IF v_match_id IS NULL THEN
    RAISE NOTICE 'SKIP: no nexora matches seeded — structure checks only';
    RETURN;
  END IF;

  -- Socio can assign on accessible matter
  res := ciceron.assign_match(firm, v_match_id, socio, socio, matter_ok, NULL);
  IF coalesce((res->>'ok')::boolean, false) IS NOT TRUE THEN
    RAISE EXCEPTION 'FAIL: socio assign should succeed: %', res;
  END IF;

  -- Pasante denied on blocked matter
  res := ciceron.assign_match(firm, v_match_id, pasante, pasante, matter_blocked, NULL);
  IF coalesce((res->>'ok')::boolean, true) IS NOT FALSE THEN
    RAISE EXCEPTION 'FAIL: pasante assign on blocked matter should deny: %', res;
  END IF;
  IF res->>'policy_id' <> 'matter_member' THEN
    RAISE EXCEPTION 'FAIL: expected matter_member denial, got %', res;
  END IF;

  -- Denial must be audited
  SELECT count(*) INTO n
  FROM ciceron.audit_events
  WHERE action = 'match_assign'
    AND outcome = 'denied'
    AND policy_id = 'matter_member'
    AND user_id = pasante;
  IF n < 1 THEN
    RAISE EXCEPTION 'FAIL: denial not written to audit_events';
  END IF;

  -- Pasante can comment on allowed matter
  res := ciceron.add_match_comment(
    firm, v_match_id, pasante, matter_ok, 'Revisión de pasante @Socio', ARRAY[socio]
  );
  IF coalesce((res->>'ok')::boolean, false) IS NOT TRUE THEN
    RAISE EXCEPTION 'FAIL: pasante comment on allowed matter should succeed: %', res;
  END IF;

  -- Pasante denied commenting on blocked matter
  res := ciceron.add_match_comment(
    firm, v_match_id, pasante, matter_blocked, 'No debería verse', '{}'::uuid[]
  );
  IF coalesce((res->>'ok')::boolean, true) IS NOT FALSE
     OR res->>'policy_id' <> 'matter_member' THEN
    RAISE EXCEPTION 'FAIL: pasante comment on blocked matter should deny: %', res;
  END IF;
END $$;

ROLLBACK;
