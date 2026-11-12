BEGIN;

DO $$
DECLARE
  firm uuid := 'a1000000-0000-4000-8000-000000000001'::uuid;
  today date := (now() AT TIME ZONE 'America/Mexico_City')::date;
  res jsonb;
  overdue int;
  d2 date;
  d6 date;
  d14 date;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'ciceron' AND p.proname = 'add_business_days'
  ) THEN
    RAISE EXCEPTION 'FAIL: add_business_days missing';
  END IF;

  d2 := ciceron.add_business_days(today, 2);
  d6 := ciceron.add_business_days(today, 6);
  d14 := ciceron.add_business_days(today, 14);
  IF d2 <= today OR d6 <= d2 OR d14 <= d6 THEN
    RAISE EXCEPTION 'FAIL: business-day offsets not strictly increasing future dates';
  END IF;

  res := ciceron.refresh_demo_dates(firm, true);
  IF (res->>'ok')::boolean IS NOT TRUE THEN
    RAISE EXCEPTION 'FAIL: refresh_demo_dates: %', res;
  END IF;

  SELECT count(*) INTO overdue
  FROM ciceron.deadlines d
  JOIN ciceron.case_files cf ON cf.id = d.case_file_id
  WHERE cf.firm_id = firm
    AND cf.is_sample = true
    AND d.is_sample = true
    AND (d.due_at AT TIME ZONE 'America/Mexico_City')::date < today;
  IF overdue > 0 THEN
    RAISE EXCEPTION 'FAIL: % sample deadlines still overdue after freshness', overdue;
  END IF;

  IF EXISTS (
    SELECT 1 FROM ciceron.case_files
    WHERE is_sample AND court_name ILIKE '%Decimo%' AND court_name NOT ILIKE '%Décimo%'
  ) THEN
    RAISE EXCEPTION 'FAIL: Décimo spelling still wrong';
  END IF;

  -- At most one sample case may lack events («Sin actuaciones»)
  IF (
    SELECT count(*) FROM ciceron.case_files cf
    WHERE cf.firm_id = firm AND cf.is_sample = true
      AND NOT EXISTS (
        SELECT 1 FROM ciceron.case_events e WHERE e.case_file_id = cf.id
      )
  ) > 1 THEN
    RAISE EXCEPTION 'FAIL: more than one sample case has zero events';
  END IF;

  -- Expected deadline offsets documented for TS mirror (2/6/14)
  IF res->'deadline_offsets_business_days' IS NULL
     OR res->'deadline_offsets_business_days' <> '[2, 6, 14]'::jsonb THEN
    RAISE EXCEPTION 'FAIL: refresh should report offsets [2,6,14]: %', res;
  END IF;
END $$;

ROLLBACK;
