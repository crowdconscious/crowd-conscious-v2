-- 311_ciceron_confirm_idempotent.verify.sql
-- Run after 311. Expect NOTICE lines; RAISE on failure.

DO $$
DECLARE
  target uuid;
  draft_id uuid;
  matter uuid;
  firm uuid := 'a1000000-0000-4000-8000-000000000001'::uuid;
  socio uuid := 'b1000000-0000-4000-8000-000000000001'::uuid;
  pasante uuid := 'b1000000-0000-4000-8000-000000000003'::uuid;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'ciceron' AND p.proname = 'discard_deadline'
  ) THEN
    RAISE EXCEPTION 'FAIL: discard_deadline missing';
  END IF;

  IF HAS_FUNCTION_PRIVILEGE('anon', 'ciceron.discard_deadline(uuid, uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'FAIL: anon can execute discard_deadline';
  END IF;

  -- Confirm once, then second confirm must fail (idempotent)
  SELECT id INTO target FROM ciceron.deadlines
  WHERE matter_id IN (SELECT id FROM ciceron.matters WHERE firm_id = firm)
    AND status = 'propuesto'
  ORDER BY due_at
  LIMIT 1;

  IF target IS NULL THEN
    RAISE NOTICE 'SKIP: no propuesto deadline for confirm idempotency';
  ELSE
    PERFORM ciceron.confirm_deadline(socio, target, 'confirmado');
    BEGIN
      PERFORM ciceron.confirm_deadline(socio, target, 'confirmado');
      RAISE EXCEPTION 'FAIL: second confirm_deadline was allowed';
    EXCEPTION
      WHEN check_violation THEN
        RAISE NOTICE 'OK: confirm_deadline refuses already confirmed';
      WHEN others THEN
        IF SQLERRM LIKE 'FAIL:%' THEN RAISE; END IF;
        RAISE EXCEPTION 'FAIL: unexpected error second confirm: %', SQLERRM;
    END;

    -- discard of confirmed must fail
    BEGIN
      PERFORM ciceron.discard_deadline(socio, target);
      RAISE EXCEPTION 'FAIL: discard of confirmed deadline was allowed';
    EXCEPTION
      WHEN check_violation THEN
        RAISE NOTICE 'OK: discard_deadline refuses already confirmed';
      WHEN others THEN
        IF SQLERRM LIKE 'FAIL:%' THEN RAISE; END IF;
        RAISE EXCEPTION 'FAIL: unexpected error discard confirmed: %', SQLERRM;
    END;

    -- restore propuesto for further tests
    UPDATE ciceron.deadlines
    SET status = 'propuesto',
        confirmed_by = NULL,
        confirmed_by_persona = NULL,
        confirmed_at = NULL,
        discarded_by = NULL,
        discarded_by_persona = NULL,
        discarded_at = NULL
    WHERE id = target;
  END IF;

  -- discard propuesto succeeds for socio; pasante blocked; second discard blocked
  SELECT id INTO target FROM ciceron.deadlines
  WHERE matter_id IN (SELECT id FROM ciceron.matters WHERE firm_id = firm)
    AND status = 'propuesto'
  ORDER BY due_at
  LIMIT 1;

  IF target IS NULL THEN
    RAISE NOTICE 'SKIP: no propuesto deadline for discard_deadline';
  ELSE
    BEGIN
      PERFORM ciceron.discard_deadline(pasante, target);
      RAISE EXCEPTION 'FAIL: pasante discard_deadline was allowed';
    EXCEPTION
      WHEN check_violation THEN
        RAISE NOTICE 'OK: pasante discard_deadline blocked';
      WHEN others THEN
        IF SQLERRM LIKE 'FAIL:%' THEN RAISE; END IF;
        RAISE EXCEPTION 'FAIL: unexpected error pasante discard: %', SQLERRM;
    END;

    PERFORM ciceron.discard_deadline(socio, target);
    IF NOT EXISTS (
      SELECT 1 FROM ciceron.deadlines
      WHERE id = target AND status = 'descartado' AND discarded_by_persona = socio
    ) THEN
      RAISE EXCEPTION 'FAIL: discard_deadline did not discard as socio persona';
    END IF;
    RAISE NOTICE 'OK: socio discard_deadline succeeds';

    BEGIN
      PERFORM ciceron.discard_deadline(socio, target);
      RAISE EXCEPTION 'FAIL: second discard_deadline was allowed';
    EXCEPTION
      WHEN check_violation THEN
        RAISE NOTICE 'OK: discard_deadline refuses already discarded';
      WHEN others THEN
        IF SQLERRM LIKE 'FAIL:%' THEN RAISE; END IF;
        RAISE EXCEPTION 'FAIL: unexpected error second discard: %', SQLERRM;
    END;

    UPDATE ciceron.deadlines
    SET status = 'propuesto',
        discarded_by = NULL,
        discarded_by_persona = NULL,
        discarded_at = NULL
    WHERE id = target;
  END IF;

  -- approve once, second approve fails
  SELECT id INTO matter FROM ciceron.matters WHERE firm_id = firm ORDER BY created_at LIMIT 1;
  IF matter IS NULL THEN
    RAISE NOTICE 'SKIP: no matter for approve idempotency';
  ELSE
    INSERT INTO ciceron.client_notify_drafts (
      firm_id, matter_id, to_email, subject, body, status, is_sample, created_by_persona
    ) VALUES (
      firm, matter, 'verify311@example.invalid', 'verify311', 'body', 'en_revision', true, socio
    ) RETURNING id INTO draft_id;

    PERFORM ciceron.approve_client_notify(socio, draft_id);
    BEGIN
      PERFORM ciceron.approve_client_notify(socio, draft_id);
      RAISE EXCEPTION 'FAIL: second approve_client_notify was allowed';
    EXCEPTION
      WHEN check_violation THEN
        RAISE NOTICE 'OK: approve_client_notify refuses already sent';
      WHEN others THEN
        IF SQLERRM LIKE 'FAIL:%' THEN RAISE; END IF;
        RAISE EXCEPTION 'FAIL: unexpected error second approve: %', SQLERRM;
    END;

    DELETE FROM ciceron.client_notify_drafts WHERE id = draft_id;
  END IF;

  RAISE NOTICE 'OK: 311 confirm idempotent verify passed';
END $$;
