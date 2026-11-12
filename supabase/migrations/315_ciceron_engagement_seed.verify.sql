-- 315_ciceron_engagement_seed.verify.sql
-- Non-persistent checks on seed presence. Wrapped in BEGIN…ROLLBACK.

BEGIN;

DO $$
DECLARE
  n int;
  firm uuid := 'a1000000-0000-4000-8000-000000000001'::uuid;
BEGIN
  SELECT count(*) INTO n FROM ciceron.events
  WHERE firm_id = firm
    AND id >= 'e2000000-0000-4000-8000-000000000001'::uuid
    AND id <= 'e2000000-0000-4000-8000-0000000000ff'::uuid;
  IF n < 20 THEN
    RAISE EXCEPTION 'FAIL: expected >=20 demo engagement events, got %', n;
  END IF;

  SELECT count(*) INTO n FROM ciceron.ai_runs
  WHERE id IN (
    'e2000000-0000-4000-8000-000000000201'::uuid,
    'e2000000-0000-4000-8000-000000000202'::uuid,
    'e2000000-0000-4000-8000-000000000203'::uuid,
    'e2000000-0000-4000-8000-000000000204'::uuid
  );
  IF n <> 4 THEN
    RAISE EXCEPTION 'FAIL: expected 4 demo cost ai_runs, got %', n;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM ciceron.firm_onboarding WHERE firm_id = firm
  ) THEN
    RAISE EXCEPTION 'FAIL: firm_onboarding seed missing';
  END IF;

  -- Cost view reconciles with ai_runs for demo firm (at least one week row)
  SELECT count(*) INTO n FROM ciceron.metric_cost_weekly WHERE firm_id = firm;
  IF n < 1 THEN
    RAISE EXCEPTION 'FAIL: metric_cost_weekly empty for demo firm';
  END IF;

  -- Activation / expansion readable
  SELECT count(*) INTO n FROM ciceron.metric_activation WHERE firm_id = firm;
  IF n <> 1 THEN
    RAISE EXCEPTION 'FAIL: metric_activation missing demo firm';
  END IF;

  SELECT count(*) INTO n FROM ciceron.metric_expansion WHERE firm_id = firm;
  IF n <> 1 THEN
    RAISE EXCEPTION 'FAIL: metric_expansion missing demo firm';
  END IF;

  RAISE NOTICE 'OK: 315 engagement seed verified';
END $$;

ROLLBACK;
