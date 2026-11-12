-- 308_ciceron_expedientes.verify.sql
-- Run after 308 on a branch/prod. Expect NOTICE lines; RAISE on failure.

DO $$
DECLARE
  n int;
BEGIN
  SELECT count(*) INTO n FROM information_schema.tables
  WHERE table_schema = 'ciceron' AND table_name = 'deadline_rules';
  IF n <> 1 THEN RAISE EXCEPTION 'FAIL: deadline_rules missing'; END IF;

  SELECT count(*) INTO n FROM information_schema.tables
  WHERE table_schema = 'ciceron' AND table_name = 'firm_integrations';
  IF n <> 1 THEN RAISE EXCEPTION 'FAIL: firm_integrations missing'; END IF;

  SELECT count(*) INTO n FROM information_schema.tables
  WHERE table_schema = 'ciceron' AND table_name = 'firm_archive_items';
  IF n <> 1 THEN RAISE EXCEPTION 'FAIL: firm_archive_items missing'; END IF;

  SELECT count(*) INTO n FROM information_schema.tables
  WHERE table_schema = 'ciceron' AND table_name = 'simulated_calendar_events';
  IF n <> 1 THEN RAISE EXCEPTION 'FAIL: simulated_calendar_events missing'; END IF;

  SELECT count(*) INTO n FROM information_schema.tables
  WHERE table_schema = 'ciceron' AND table_name = 'client_notify_drafts';
  IF n <> 1 THEN RAISE EXCEPTION 'FAIL: client_notify_drafts missing'; END IF;

  SELECT count(*) INTO n FROM information_schema.columns
  WHERE table_schema = 'ciceron' AND table_name = 'deadlines' AND column_name = 'confirmed_at';
  IF n <> 1 THEN RAISE EXCEPTION 'FAIL: deadlines.confirmed_at missing'; END IF;

  -- Pasante cannot confirm (mirror of trigger semantics via memberships)
  PERFORM ciceron.set_actor('b1000000-0000-4000-8000-000000000003'::uuid);
  BEGIN
    UPDATE ciceron.deadlines d
    SET status = 'confirmado',
        confirmed_by = 'b1000000-0000-4000-8000-000000000003'::uuid,
        confirmed_at = now()
    WHERE d.id = (
      SELECT id FROM ciceron.deadlines
      WHERE case_file_id = 'f1000000-0000-4000-8000-000000000001'::uuid
        AND status = 'propuesto'
      ORDER BY due_at
      LIMIT 1
    );
    RAISE EXCEPTION 'FAIL: pasante was allowed to confirm a deadline';
  EXCEPTION
    WHEN others THEN
      IF SQLERRM LIKE '%only socio%' OR SQLERRM LIKE '%confirm%' THEN
        RAISE NOTICE 'OK: pasante blocked from confirming deadlines';
      ELSE
        RAISE;
      END IF;
  END;

  RAISE NOTICE 'OK: 308 expedientes schema verify passed';
END $$;
