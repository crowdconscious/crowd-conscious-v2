-- 302_ciceron.verify.sql
-- Run after 302 (and ideally 303) on a branch or production.
-- Simulates demo personas WITHOUT auth.users — uses ciceron.set_actor / JWT claims.

-- 0) Extension + schema + personas
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector') THEN
    RAISE EXCEPTION 'FAIL: vector extension not installed';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'ciceron') THEN
    RAISE EXCEPTION 'FAIL: schema ciceron missing';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM ciceron.demo_personas WHERE invite_code = 'DESPACHO-DEMO') THEN
    RAISE EXCEPTION 'FAIL: demo_personas not seeded';
  END IF;
  IF EXISTS (SELECT 1 FROM auth.users u WHERE u.email LIKE '%@ciceron.demo.invalid') THEN
    RAISE EXCEPTION 'FAIL: ciceron.demo.invalid auth.users rows present — isolation violated';
  END IF;
  RAISE NOTICE 'OK: vector + schema + demo_personas (no auth.users demo emails)';
END $$;

-- 1) Seed firm visible
DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM ciceron.firms WHERE slug = 'despacho-demo' AND is_demo;
  IF n <> 1 THEN RAISE EXCEPTION 'FAIL: Despacho Demo missing (count=%)', n; END IF;
  SELECT count(*) INTO n FROM ciceron.clients
    WHERE firm_id = 'a1000000-0000-4000-8000-000000000001'::uuid AND is_demo;
  IF n < 6 THEN RAISE EXCEPTION 'FAIL: expected >=6 demo clients, got %', n; END IF;
  SELECT count(*) INTO n FROM ciceron.case_files WHERE is_sample;
  IF n < 8 THEN RAISE EXCEPTION 'FAIL: expected >=8 sample case files, got %', n; END IF;
  RAISE NOTICE 'OK: seed firm visible';
END $$;

-- 2) Cross-tenant: firm B persona cannot see firm A clients
DO $$
DECLARE n int;
BEGIN
  PERFORM ciceron.set_actor('b1000000-0000-4000-8000-000000000011'::uuid);
  EXECUTE 'SET LOCAL ROLE authenticated';

  SELECT count(*) INTO n FROM ciceron.clients
  WHERE firm_id = 'a1000000-0000-4000-8000-000000000001'::uuid;
  IF n <> 0 THEN
    RAISE EXCEPTION 'FAIL: cross-tenant read of firm A clients (count=%)', n;
  END IF;

  SELECT count(*) INTO n FROM ciceron.clients;
  IF n < 1 THEN RAISE EXCEPTION 'FAIL: firm B should see own client(s)'; END IF;

  RAISE NOTICE 'OK: cross-tenant client read denied';
  EXECUTE 'RESET ROLE';
  PERFORM set_config('ciceron.actor_id', '', true);
END $$;

-- 3) search_chunks blocks other firm_id
DO $$
BEGIN
  PERFORM ciceron.set_actor('b1000000-0000-4000-8000-000000000011'::uuid);
  EXECUTE 'SET LOCAL ROLE authenticated';
  BEGIN
    PERFORM * FROM ciceron.search_chunks(
      'fintech', NULL,
      'a1000000-0000-4000-8000-000000000001'::uuid, NULL, 10
    );
    RAISE EXCEPTION 'FAIL: search_chunks allowed firm B to query firm A';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM LIKE 'FAIL:%' THEN RAISE; END IF;
    RAISE NOTICE 'OK: search_chunks blocked cross-tenant (% )', SQLERRM;
  END;
  EXECUTE 'RESET ROLE';
  PERFORM set_config('ciceron.actor_id', '', true);
END $$;

-- 4) Pasante wall
DO $$
DECLARE n int;
BEGIN
  PERFORM ciceron.set_actor('b1000000-0000-4000-8000-000000000003'::uuid);
  EXECUTE 'SET LOCAL ROLE authenticated';

  SELECT count(*) INTO n FROM ciceron.case_files
  WHERE matter_id = 'd1000000-0000-4000-8000-000000000004'::uuid;
  IF n <> 0 THEN RAISE EXCEPTION 'FAIL: pasante read outside matter (count=%)', n; END IF;

  SELECT count(*) INTO n FROM ciceron.case_files
  WHERE matter_id = 'd1000000-0000-4000-8000-000000000001'::uuid;
  IF n < 1 THEN RAISE EXCEPTION 'FAIL: pasante should see assigned matter cases'; END IF;

  RAISE NOTICE 'OK: pasante matter wall holds';
  EXECUTE 'RESET ROLE';
  PERFORM set_config('ciceron.actor_id', '', true);
END $$;

-- 5) Tier 2 delivery without approval fails
DO $$
DECLARE run_id uuid; out_id uuid;
  matter_id uuid := 'd1000000-0000-4000-8000-000000000001';
BEGIN
  INSERT INTO ciceron.ai_runs (purpose, model, firm_id, matter_id, user_id)
  VALUES (
    'verify_tier2', 'test',
    'a1000000-0000-4000-8000-000000000001'::uuid,
    matter_id,
    'b1000000-0000-4000-8000-000000000001'::uuid
  ) RETURNING id INTO run_id;

  INSERT INTO ciceron.ai_outputs (ai_run_id, tier, status, body)
  VALUES (run_id, 2, 'borrador', 'Datos de demostración — borrador cliente')
  RETURNING id INTO out_id;

  BEGIN
    INSERT INTO ciceron.deliveries (matter_id, ai_output_id, channel, delivered_by)
    VALUES (matter_id, out_id, 'email', NULL);
    RAISE EXCEPTION 'FAIL: tier 2 delivery inserted without review decision';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM LIKE 'FAIL:%' THEN RAISE;
    ELSIF SQLERRM LIKE '%tier 2 delivery%' THEN
      RAISE NOTICE 'OK: tier 2 delivery blocked without approval';
    ELSE RAISE;
    END IF;
  END;

  DELETE FROM ciceron.ai_outputs WHERE id = out_id;
  DELETE FROM ciceron.ai_runs WHERE id = run_id;
END $$;

-- 6) audit_events append-only
DO $$
DECLARE aid uuid;
BEGIN
  INSERT INTO ciceron.audit_events (firm_id, user_id, action, entity_type, entity_id, payload)
  VALUES (
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'b1000000-0000-4000-8000-000000000004'::uuid,
    'verify', 'test', NULL, '{"label":"Datos de demostración"}'::jsonb
  ) RETURNING id INTO aid;

  BEGIN
    UPDATE ciceron.audit_events SET action = 'tampered' WHERE id = aid;
    RAISE EXCEPTION 'FAIL: audit_events UPDATE allowed';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM LIKE 'FAIL:%' THEN RAISE; END IF;
    IF SQLERRM LIKE '%append-only%' THEN RAISE NOTICE 'OK: audit_events UPDATE blocked';
    ELSE RAISE; END IF;
  END;

  BEGIN
    DELETE FROM ciceron.audit_events WHERE id = aid;
    RAISE EXCEPTION 'FAIL: audit_events DELETE allowed';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM LIKE 'FAIL:%' THEN RAISE; END IF;
    IF SQLERRM LIKE '%append-only%' THEN RAISE NOTICE 'OK: audit_events DELETE blocked';
    ELSE RAISE; END IF;
  END;
END $$;

-- 7) RLS forced (includes demo_personas → 37 tables)
DO $$
DECLARE bad int;
BEGIN
  SELECT count(*) INTO bad
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'ciceron' AND c.relkind = 'r'
    AND (NOT c.relrowsecurity OR NOT c.relforcerowsecurity);
  IF bad <> 0 THEN
    RAISE EXCEPTION 'FAIL: % ciceron tables missing ENABLE/FORCE RLS', bad;
  END IF;
  RAISE NOTICE 'OK: all ciceron tables have RLS enabled + forced';
END $$;

-- 8) search_path pins (303)
DO $$
DECLARE missing text;
BEGIN
  SELECT string_agg(p.proname, ', ') INTO missing
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'ciceron'
    AND p.proname IN ('set_updated_at', 'audit_events_immutable', 'storage_firm_id')
    AND (p.proconfig IS NULL OR NOT EXISTS (
      SELECT 1 FROM unnest(p.proconfig) cfg WHERE cfg LIKE 'search_path=%'
    ));
  IF missing IS NOT NULL THEN
    RAISE EXCEPTION 'FAIL: search_path not set on: % (apply 303)', missing;
  END IF;
  RAISE NOTICE 'OK: search_path pinned on set_updated_at, audit_events_immutable, storage_firm_id';
END $$;

DO $$ BEGIN RAISE NOTICE '=== Cicéron 302 verify complete ==='; END $$;
