-- 314_ciceron_engagement.verify.sql
-- Non-persistent: BEGIN … ROLLBACK. Raises on wrong state.

BEGIN;

DO $$
DECLARE
  n int;
  firm uuid := 'a1000000-0000-4000-8000-000000000001'::uuid;
  socio uuid := 'b1000000-0000-4000-8000-000000000001'::uuid;
  eid uuid;
  forbidden_caught boolean := false;
BEGIN
  SELECT count(*) INTO n FROM information_schema.tables
  WHERE table_schema = 'ciceron' AND table_name = 'firm_onboarding';
  IF n <> 1 THEN RAISE EXCEPTION 'FAIL: firm_onboarding missing'; END IF;

  SELECT count(*) INTO n FROM information_schema.tables
  WHERE table_schema = 'ciceron' AND table_name = 'briefing_previews';
  IF n <> 1 THEN RAISE EXCEPTION 'FAIL: briefing_previews missing'; END IF;

  SELECT count(*) INTO n FROM information_schema.tables
  WHERE table_schema = 'ciceron' AND table_name = 'engagement_resume';
  IF n <> 1 THEN RAISE EXCEPTION 'FAIL: engagement_resume missing'; END IF;

  SELECT count(*) INTO n FROM information_schema.columns
  WHERE table_schema = 'ciceron' AND table_name = 'firm_ai_budgets'
    AND column_name = 'threshold_alert_100_at';
  IF n <> 1 THEN RAISE EXCEPTION 'FAIL: firm_ai_budgets.threshold_alert_100_at missing'; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace ns ON ns.oid = p.pronamespace
    WHERE ns.nspname = 'ciceron' AND p.proname = 'record_product_event'
  ) THEN
    RAISE EXCEPTION 'FAIL: record_product_event missing';
  END IF;

  -- Views exist with security_invoker
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace ns ON ns.oid = c.relnamespace
    WHERE ns.nspname = 'ciceron' AND c.relname = 'metric_activation' AND c.relkind = 'v'
  ) THEN
    RAISE EXCEPTION 'FAIL: metric_activation missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace ns ON ns.oid = c.relnamespace
    WHERE ns.nspname = 'ciceron' AND c.relname = 'metric_cost_weekly' AND c.relkind = 'v'
  ) THEN
    RAISE EXCEPTION 'FAIL: metric_cost_weekly missing';
  END IF;

  -- authenticated must NOT select metric views
  IF has_table_privilege('authenticated', 'ciceron.metric_activation', 'SELECT') THEN
    RAISE EXCEPTION 'FAIL: authenticated can SELECT metric_activation';
  END IF;
  IF has_table_privilege('authenticated', 'ciceron.metric_cost_weekly', 'SELECT') THEN
    RAISE EXCEPTION 'FAIL: authenticated can SELECT metric_cost_weekly';
  END IF;

  -- authenticated must NOT execute record_product_event
  IF has_function_privilege(
    'authenticated',
    'ciceron.record_product_event(text, uuid, uuid, jsonb, timestamptz, uuid)',
    'EXECUTE'
  ) THEN
    RAISE EXCEPTION 'FAIL: authenticated can EXECUTE record_product_event';
  END IF;

  -- RLS forced on new tables
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace ns ON ns.oid = c.relnamespace
    WHERE ns.nspname = 'ciceron' AND c.relname = 'firm_onboarding'
      AND c.relrowsecurity AND c.relforcerowsecurity
  ) THEN
    RAISE EXCEPTION 'FAIL: firm_onboarding RLS not forced';
  END IF;

  -- Happy-path insert via RPC (as superuser / migration role)
  eid := ciceron.record_product_event(
    'session_started',
    firm,
    socio,
    '{"surface":"hoy"}'::jsonb,
    now(),
    'e2000000-0000-4000-8000-00000000ffff'::uuid
  );
  IF eid IS NULL THEN RAISE EXCEPTION 'FAIL: record_product_event returned null'; END IF;

  BEGIN
    PERFORM ciceron.record_product_event(
      'alert_opened',
      firm,
      socio,
      '{"client_name":"secret"}'::jsonb,
      now(),
      NULL
    );
  EXCEPTION WHEN OTHERS THEN
    forbidden_caught := true;
  END;
  IF NOT forbidden_caught THEN
    RAISE EXCEPTION 'FAIL: record_product_event allowed non-allow-listed property';
  END IF;

  forbidden_caught := false;
  BEGIN
    PERFORM ciceron.record_product_event(
      'alert_feedback',
      firm,
      socio,
      '{"verdict":"not relevant with spaces"}'::jsonb,
      now(),
      NULL
    );
  EXCEPTION WHEN OTHERS THEN
    forbidden_caught := true;
  END;
  IF NOT forbidden_caught THEN
    RAISE EXCEPTION 'FAIL: record_product_event allowed unsafe string value';
  END IF;

  -- Onboarding row insert
  INSERT INTO ciceron.firm_onboarding (firm_id, is_demo)
  VALUES (firm, true)
  ON CONFLICT (firm_id) DO NOTHING;

  RAISE NOTICE 'OK: 314 engagement schema verified';
END $$;

ROLLBACK;
