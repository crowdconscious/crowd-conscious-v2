-- 319_ciceron_demo_ops.verify.sql
-- Non-persistent: BEGIN … ROLLBACK.

BEGIN;

DO $$
DECLARE
  n int;
  res jsonb;
  firm uuid := 'a1000000-0000-4000-8000-000000000001'::uuid;
  socio uuid := 'b1000000-0000-4000-8000-000000000001'::uuid;
  pasante uuid := 'b1000000-0000-4000-8000-000000000003'::uuid;
  admin uuid := 'b1000000-0000-4000-8000-000000000004'::uuid;
  token_hash text := repeat('c', 64);
  demo_hash text := '3e88bb2a453f689e314810c301bbf790a09d5ee1afb4e0e0147dd0727c2b7f78';
  redeem jsonb;
  sessions_before int;
  sessions_after int;
  email_kept int;
  completed jsonb;
BEGIN
  SELECT count(*) INTO n FROM information_schema.tables
  WHERE table_schema = 'ciceron' AND table_name = 'demo_freshness_runs';
  IF n <> 1 THEN RAISE EXCEPTION 'FAIL: demo_freshness_runs missing'; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace ns ON ns.oid = c.relnamespace
    WHERE ns.nspname = 'ciceron' AND c.relname = 'sales_invite_progress' AND c.relkind = 'v'
  ) THEN
    RAISE EXCEPTION 'FAIL: sales_invite_progress view missing';
  END IF;

  IF has_table_privilege('authenticated', 'ciceron.sales_invite_progress', 'SELECT') THEN
    RAISE EXCEPTION 'FAIL: authenticated can SELECT sales_invite_progress';
  END IF;

  -- Freshness idempotent
  res := ciceron.refresh_demo_dates(firm, false);
  IF COALESCE(res->>'ok', 'false') <> 'true' THEN
    RAISE EXCEPTION 'FAIL: refresh_demo_dates: %', res;
  END IF;
  res := ciceron.refresh_demo_dates(firm, false);
  IF COALESCE(res->>'skipped', 'false') <> 'true' THEN
    RAISE EXCEPTION 'FAIL: second freshness should skip: %', res;
  END IF;

  -- Pasante cannot reset
  res := ciceron.reset_demo_firm(firm, pasante);
  IF COALESCE(res->>'ok', 'true') <> 'false' THEN
    RAISE EXCEPTION 'FAIL: pasante reset should deny';
  END IF;
  IF res->>'policy_id' <> 'rbac_role' THEN
    RAISE EXCEPTION 'FAIL: reset denial policy_id';
  END IF;

  -- Socio cannot reset (admin-only)
  res := ciceron.reset_demo_firm(firm, socio);
  IF COALESCE(res->>'ok', 'true') <> 'false' THEN
    RAISE EXCEPTION 'FAIL: socio reset should deny (admin-only)';
  END IF;

  -- Story progress via session
  redeem := ciceron.redeem_invite(demo_hash, token_hash, 'socio@example.com', 24);
  IF COALESCE(redeem->>'ok', 'false') <> 'true' THEN
    RAISE EXCEPTION 'FAIL: redeem for story: %', redeem;
  END IF;

  res := ciceron.update_guided_story(token_hash, 1, false);
  IF COALESCE(res->>'ok', 'false') <> 'true' THEN
    RAISE EXCEPTION 'FAIL: story step 1: %', res;
  END IF;

  res := ciceron.update_guided_story(token_hash, 2, false);
  IF COALESCE(res->>'ok', 'false') <> 'true' THEN
    RAISE EXCEPTION 'FAIL: story step 2: %', res;
  END IF;
  IF COALESCE(res->>'current_step', '') <> '2' THEN
    RAISE EXCEPTION 'FAIL: story step 2 current_step expected 2, got %', res->>'current_step';
  END IF;
  completed := COALESCE(res->'completed_steps', '[]'::jsonb);
  IF NOT (completed @> '[1]'::jsonb AND completed @> '[2]'::jsonb) THEN
    RAISE EXCEPTION 'FAIL: story step 2 completed_steps missing 1/2: %', completed;
  END IF;

  res := ciceron.touch_session_freshness(token_hash);
  IF COALESCE(res->>'ok', 'false') <> 'true' THEN
    RAISE EXCEPTION 'FAIL: touch_session_freshness: %', res;
  END IF;

  -- Event allow-list accepts Prompt 9 keys
  PERFORM ciceron.record_product_event(
    'guided_story_step',
    firm,
    socio,
    jsonb_build_object('step', '1', 'is_demo', true, 'story_action', 'advance'),
    now(),
    NULL
  );

  -- Admin reset expires sessions; keeps rows + emails; DOF untouched
  SELECT count(*) INTO sessions_before FROM ciceron.demo_sessions WHERE firm_id = firm;
  SELECT count(*) INTO n FROM ciceron.dof_notes;

  res := ciceron.reset_demo_firm(firm, admin);
  IF COALESCE(res->>'ok', 'false') <> 'true' THEN
    RAISE EXCEPTION 'FAIL: admin reset: %', res;
  END IF;
  IF (SELECT count(*) FROM ciceron.dof_notes) <> n THEN
    RAISE EXCEPTION 'FAIL: reset touched dof_notes';
  END IF;

  SELECT count(*) INTO sessions_after FROM ciceron.demo_sessions WHERE firm_id = firm;
  IF sessions_after <> sessions_before THEN
    RAISE EXCEPTION 'FAIL: reset must not delete demo_sessions (% → %)', sessions_before, sessions_after;
  END IF;
  IF EXISTS (
    SELECT 1 FROM ciceron.demo_sessions
    WHERE firm_id = firm AND expires_at > now()
  ) THEN
    RAISE EXCEPTION 'FAIL: reset left active sessions';
  END IF;

  SELECT count(*) INTO email_kept FROM ciceron.demo_sessions
  WHERE firm_id = firm AND work_email = 'socio@example.com';
  IF email_kept < 1 THEN
    RAISE EXCEPTION 'FAIL: reset dropped work_email history';
  END IF;

  RAISE NOTICE 'OK: 319 demo ops verified';
END $$;

ROLLBACK;
