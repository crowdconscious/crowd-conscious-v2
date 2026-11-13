-- Verify 328_ciceron_boletines_demo.sql
DO $$
DECLARE
  n int;
  firm uuid := 'a1000000-0000-4000-8000-000000000001'::uuid;
  res jsonb;
BEGIN
  SELECT count(*) INTO n FROM ciceron.demo_personas
  WHERE id = 'b1000000-0000-4000-8000-000000000006'::uuid;
  IF n <> 1 THEN
    RAISE EXCEPTION 'FAIL: coordinador persona missing';
  END IF;

  SELECT count(*) INTO n FROM ciceron.bulletin_runs
  WHERE firm_id = firm AND is_demo = true;
  IF n < 7 THEN
    RAISE EXCEPTION 'FAIL: expected >=7 demo bulletin runs, got %', n;
  END IF;

  SELECT count(*) INTO n FROM ciceron.bulletin_runs
  WHERE firm_id = firm AND is_demo = true AND status = 'failed';
  IF n < 1 THEN
    RAISE EXCEPTION 'FAIL: expected a FAILED demo run';
  END IF;

  SELECT count(*) INTO n FROM ciceron.bulletin_manual_checks
  WHERE firm_id = firm AND is_demo = true;
  IF n < 2 THEN
    RAISE EXCEPTION 'FAIL: expected manual checks for GTO/NL';
  END IF;

  SELECT count(*) INTO n FROM ciceron.bulletin_hits
  WHERE firm_id = firm AND is_demo = true;
  IF n < 5 THEN
    RAISE EXCEPTION 'FAIL: expected demo hits, got %', n;
  END IF;

  res := ciceron.refresh_demo_dates(firm, true);
  IF (res->>'ok')::boolean IS NOT TRUE THEN
    RAISE EXCEPTION 'FAIL: refresh_demo_dates: %', res;
  END IF;

  RAISE NOTICE 'PASS: 328_ciceron_boletines_demo';
END $$;
