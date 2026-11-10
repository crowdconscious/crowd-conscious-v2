-- 298_ciceron.verify.sql
-- Manual verification after applying 298→301 on a Supabase branch.
-- Expect: seed firm visible; cross-tenant reads empty; tier-2 delivery without
-- approval fails; audit_events append-only; RLS forced.
-- Run in SQL editor as a privileged role that can SET ROLE authenticated.

-- 0) Extension + schema
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector') THEN
    RAISE EXCEPTION 'FAIL: vector extension not installed';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'ciceron') THEN
    RAISE EXCEPTION 'FAIL: schema ciceron missing';
  END IF;
  RAISE NOTICE 'OK: vector + schema ciceron';
END $$;

-- 1) Seed firm visible (runs as invoker; privileged role sees all rows)
DO $$
DECLARE
  n int;
BEGIN
  SELECT count(*) INTO n FROM ciceron.firms WHERE slug = 'despacho-demo' AND is_demo;
  IF n <> 1 THEN RAISE EXCEPTION 'FAIL: Despacho Demo, S.C. not seeded (count=%)', n; END IF;
  SELECT count(*) INTO n FROM ciceron.clients
    WHERE firm_id = 'a1000000-0000-4000-8000-000000000001'::uuid AND is_demo;
  IF n < 6 THEN RAISE EXCEPTION 'FAIL: expected >=6 demo clients, got %', n; END IF;
  SELECT count(*) INTO n FROM ciceron.case_files WHERE is_sample;
  IF n < 8 THEN RAISE EXCEPTION 'FAIL: expected >=8 sample case files, got %', n; END IF;
  RAISE NOTICE 'OK: seed firm visible (Despacho Demo + clients + sample cases)';
END $$;

-- 2) Cross-tenant: firm B socio must not see firm A clients
DO $$
DECLARE
  n int;
BEGIN
  PERFORM set_config('request.jwt.claim.sub', 'b1000000-0000-4000-8000-000000000011', true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);
  EXECUTE 'SET LOCAL ROLE authenticated';

  SELECT count(*) INTO n
  FROM ciceron.clients
  WHERE firm_id = 'a1000000-0000-4000-8000-000000000001'::uuid;
  IF n <> 0 THEN
    RAISE EXCEPTION 'FAIL: cross-tenant read of firm A clients succeeded (count=%)', n;
  END IF;

  SELECT count(*) INTO n FROM ciceron.clients;
  IF n < 1 THEN
    RAISE EXCEPTION 'FAIL: firm B user should see own client(s)';
  END IF;

  RAISE NOTICE 'OK: cross-tenant client read denied (firm B cannot see firm A)';
  EXECUTE 'RESET ROLE';
END $$;

-- 3) search_chunks must not accept another firm_id
DO $$
BEGIN
  PERFORM set_config('request.jwt.claim.sub', 'b1000000-0000-4000-8000-000000000011', true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);
  EXECUTE 'SET LOCAL ROLE authenticated';

  BEGIN
    PERFORM * FROM ciceron.search_chunks(
      'fintech',
      NULL,
      'a1000000-0000-4000-8000-000000000001'::uuid,
      NULL,
      10
    );
    RAISE EXCEPTION 'FAIL: search_chunks allowed firm B to query firm A id';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM LIKE 'FAIL:%' THEN
        RAISE;
      END IF;
      RAISE NOTICE 'OK: search_chunks blocked cross-tenant firm_id (% )', SQLERRM;
  END;

  EXECUTE 'RESET ROLE';
END $$;

-- 4) Pasante outside matter cannot read that matter's case files
DO $$
DECLARE
  n int;
BEGIN
  PERFORM set_config('request.jwt.claim.sub', 'b1000000-0000-4000-8000-000000000003', true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);
  EXECUTE 'SET LOCAL ROLE authenticated';

  -- viento_cre matter — pasante is not a member
  SELECT count(*) INTO n
  FROM ciceron.case_files
  WHERE matter_id = 'd1000000-0000-4000-8000-000000000004'::uuid;
  IF n <> 0 THEN
    RAISE EXCEPTION 'FAIL: pasante read case_files outside matter (count=%)', n;
  END IF;

  -- nexora_cnbv — pasante is a member
  SELECT count(*) INTO n
  FROM ciceron.case_files
  WHERE matter_id = 'd1000000-0000-4000-8000-000000000001'::uuid;
  IF n < 1 THEN
    RAISE EXCEPTION 'FAIL: pasante should see case_files on assigned matter';
  END IF;

  RAISE NOTICE 'OK: pasante matter wall holds';
  EXECUTE 'RESET ROLE';
END $$;

-- 5) Tier 2 delivery without approved decision fails (trigger; role irrelevant)
DO $$
DECLARE
  run_id uuid;
  out_id uuid;
  matter_id uuid := 'd1000000-0000-4000-8000-000000000001';
BEGIN
  INSERT INTO ciceron.ai_runs (purpose, model, firm_id, matter_id, user_id)
  VALUES (
    'verify_tier2', 'test',
    'a1000000-0000-4000-8000-000000000001'::uuid,
    matter_id,
    'b1000000-0000-4000-8000-000000000001'::uuid
  )
  RETURNING id INTO run_id;

  INSERT INTO ciceron.ai_outputs (ai_run_id, tier, status, body)
  VALUES (run_id, 2, 'borrador', 'Datos de demostración — borrador cliente')
  RETURNING id INTO out_id;

  BEGIN
    INSERT INTO ciceron.deliveries (matter_id, ai_output_id, channel, delivered_by)
    VALUES (matter_id, out_id, 'email', 'b1000000-0000-4000-8000-000000000001'::uuid);
    RAISE EXCEPTION 'FAIL: tier 2 delivery inserted without review decision';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM LIKE 'FAIL:%' THEN
        RAISE;
      ELSIF SQLERRM LIKE '%tier 2 delivery%' THEN
        RAISE NOTICE 'OK: tier 2 delivery blocked without approval';
      ELSE
        RAISE;
      END IF;
  END;

  DELETE FROM ciceron.ai_outputs WHERE id = out_id;
  DELETE FROM ciceron.ai_runs WHERE id = run_id;
END $$;

-- 6) audit_events cannot be updated or deleted
DO $$
DECLARE
  aid uuid;
BEGIN
  INSERT INTO ciceron.audit_events (firm_id, user_id, action, entity_type, entity_id, payload)
  VALUES (
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'b1000000-0000-4000-8000-000000000004'::uuid,
    'verify', 'test', NULL, '{"label":"Datos de demostración"}'::jsonb
  )
  RETURNING id INTO aid;

  BEGIN
    UPDATE ciceron.audit_events SET action = 'tampered' WHERE id = aid;
    RAISE EXCEPTION 'FAIL: audit_events UPDATE allowed';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM LIKE 'FAIL:%' THEN RAISE; END IF;
      IF SQLERRM LIKE '%append-only%' THEN
        RAISE NOTICE 'OK: audit_events UPDATE blocked';
      ELSE
        RAISE;
      END IF;
  END;

  BEGIN
    DELETE FROM ciceron.audit_events WHERE id = aid;
    RAISE EXCEPTION 'FAIL: audit_events DELETE allowed';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM LIKE 'FAIL:%' THEN RAISE; END IF;
      IF SQLERRM LIKE '%append-only%' THEN
        RAISE NOTICE 'OK: audit_events DELETE blocked';
      ELSE
        RAISE;
      END IF;
  END;
END $$;

-- 7) RLS forced on every base table
DO $$
DECLARE
  bad int;
BEGIN
  SELECT count(*) INTO bad
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'ciceron'
    AND c.relkind = 'r'
    AND (NOT c.relrowsecurity OR NOT c.relforcerowsecurity);
  IF bad <> 0 THEN
    RAISE EXCEPTION 'FAIL: % ciceron tables missing ENABLE/FORCE RLS', bad;
  END IF;
  RAISE NOTICE 'OK: all ciceron tables have RLS enabled + forced';
END $$;

DO $$ BEGIN RAISE NOTICE '=== Cicéron verify complete ==='; END $$;
