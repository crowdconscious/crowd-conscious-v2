-- 310_ciceron_expedientes_fixups.verify.sql
-- Run after 310. Expect NOTICE lines; RAISE on failure.
-- Covers: is_sample, room CHECK, session-actor gates, confirm/approve RPCs.

DO $$
DECLARE
  n int;
  target uuid;
  draft_id uuid;
  matter uuid;
  firm uuid := 'a1000000-0000-4000-8000-000000000001'::uuid;
  socio uuid := 'b1000000-0000-4000-8000-000000000001'::uuid;
  pasante uuid := 'b1000000-0000-4000-8000-000000000003'::uuid;
BEGIN
  -- is_sample present
  SELECT count(*) INTO n FROM information_schema.columns
  WHERE table_schema = 'ciceron' AND table_name = 'saved_views' AND column_name = 'is_sample';
  IF n <> 1 THEN RAISE EXCEPTION 'FAIL: saved_views.is_sample missing'; END IF;

  -- room CHECK allows monitor-dof / expedientes / calendario
  SELECT count(*) INTO n FROM pg_constraint
  WHERE conname = 'saved_views_room_check'
    AND conrelid = 'ciceron.saved_views'::regclass;
  IF n <> 1 THEN RAISE EXCEPTION 'FAIL: saved_views_room_check missing'; END IF;

  BEGIN
    INSERT INTO ciceron.saved_views (firm_id, user_id, room, name, filters, is_sample)
    VALUES (firm, socio, 'not-a-room', 'bad-room-check', '{}'::jsonb, true);
    RAISE EXCEPTION 'FAIL: room CHECK allowed invalid room';
  EXCEPTION
    WHEN check_violation THEN
      RAISE NOTICE 'OK: room CHECK rejects unknown rooms';
    WHEN others THEN
      IF SQLERRM LIKE 'FAIL:%' THEN RAISE; END IF;
      RAISE EXCEPTION 'FAIL: unexpected error testing room CHECK: %', SQLERRM;
  END;

  -- RPCs exist and are not executable by anon
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'ciceron' AND p.proname = 'confirm_deadline'
  ) THEN
    RAISE EXCEPTION 'FAIL: confirm_deadline missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'ciceron' AND p.proname = 'approve_client_notify'
  ) THEN
    RAISE EXCEPTION 'FAIL: approve_client_notify missing';
  END IF;

  IF HAS_FUNCTION_PRIVILEGE('anon', 'ciceron.confirm_deadline(uuid, uuid, text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'FAIL: anon can execute confirm_deadline';
  END IF;

  IF HAS_FUNCTION_PRIVILEGE('anon', 'ciceron.approve_client_notify(uuid, uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'FAIL: anon can execute approve_client_notify';
  END IF;

  -- Direct update with mismatched actor is blocked
  PERFORM ciceron.set_actor(pasante);
  SELECT id INTO target FROM ciceron.deadlines
  WHERE matter_id IN (SELECT id FROM ciceron.matters WHERE firm_id = firm)
    AND status = 'propuesto'
  ORDER BY due_at
  LIMIT 1;

  IF target IS NULL THEN
    RAISE NOTICE 'SKIP: no propuesto deadline for mismatched direct update';
  ELSE
    BEGIN
      UPDATE ciceron.deadlines d
      SET status = 'confirmado',
          confirmed_by = NULL,
          confirmed_by_persona = socio,
          confirmed_at = now()
      WHERE d.id = target;
      RAISE EXCEPTION 'FAIL: mismatched direct update was allowed';
    EXCEPTION
      WHEN check_violation THEN
        RAISE NOTICE 'OK: direct update with mismatched actor blocked';
      WHEN others THEN
        IF SQLERRM LIKE 'FAIL:%' THEN RAISE; END IF;
        RAISE EXCEPTION 'FAIL: unexpected error mismatched direct update: %', SQLERRM;
    END;
  END IF;

  -- Via confirm_deadline RPC: socio persona succeeds
  SELECT id INTO target FROM ciceron.deadlines
  WHERE matter_id IN (SELECT id FROM ciceron.matters WHERE firm_id = firm)
    AND status = 'propuesto'
  ORDER BY due_at
  LIMIT 1;

  IF target IS NULL THEN
    RAISE NOTICE 'SKIP: no propuesto deadline for socio confirm_deadline RPC';
  ELSE
    PERFORM ciceron.confirm_deadline(socio, target, 'confirmado');
    IF NOT EXISTS (
      SELECT 1 FROM ciceron.deadlines
      WHERE id = target
        AND status = 'confirmado'
        AND confirmed_by_persona = socio
    ) THEN
      RAISE EXCEPTION 'FAIL: confirm_deadline did not confirm as socio persona';
    END IF;
    UPDATE ciceron.deadlines
    SET status = 'propuesto',
        confirmed_by = NULL,
        confirmed_by_persona = NULL,
        confirmed_at = NULL
    WHERE id = target;
    RAISE NOTICE 'OK: socio persona confirm_deadline succeeds';
  END IF;

  -- Via confirm_deadline RPC: pasante persona blocked
  SELECT id INTO target FROM ciceron.deadlines
  WHERE matter_id IN (SELECT id FROM ciceron.matters WHERE firm_id = firm)
    AND status = 'propuesto'
  ORDER BY due_at
  LIMIT 1;

  IF target IS NULL THEN
    RAISE NOTICE 'SKIP: no propuesto deadline for pasante confirm_deadline RPC';
  ELSE
    BEGIN
      PERFORM ciceron.confirm_deadline(pasante, target, 'confirmado');
      RAISE EXCEPTION 'FAIL: pasante confirm_deadline was allowed';
    EXCEPTION
      WHEN check_violation THEN
        RAISE NOTICE 'OK: pasante confirm_deadline blocked';
      WHEN others THEN
        IF SQLERRM LIKE 'FAIL:%' THEN RAISE; END IF;
        RAISE EXCEPTION 'FAIL: unexpected error pasante confirm_deadline: %', SQLERRM;
    END;
  END IF;

  -- approve_client_notify RPC: socio succeeds; pasante blocked
  SELECT id INTO matter FROM ciceron.matters WHERE firm_id = firm ORDER BY created_at LIMIT 1;
  IF matter IS NULL THEN
    RAISE NOTICE 'SKIP: no matter for approve_client_notify RPC';
  ELSE
    INSERT INTO ciceron.client_notify_drafts (
      firm_id, matter_id, to_email, subject, body, status, is_sample, created_by_persona
    ) VALUES (
      firm, matter, 'verify@example.invalid', 'verify', 'body', 'en_revision', true, socio
    ) RETURNING id INTO draft_id;

    BEGIN
      PERFORM ciceron.approve_client_notify(pasante, draft_id);
      RAISE EXCEPTION 'FAIL: pasante approve_client_notify was allowed';
    EXCEPTION
      WHEN check_violation THEN
        RAISE NOTICE 'OK: pasante approve_client_notify blocked';
      WHEN others THEN
        IF SQLERRM LIKE 'FAIL:%' THEN RAISE; END IF;
        RAISE EXCEPTION 'FAIL: unexpected error pasante approve_client_notify: %', SQLERRM;
    END;

    PERFORM ciceron.approve_client_notify(socio, draft_id);
    IF NOT EXISTS (
      SELECT 1 FROM ciceron.client_notify_drafts
      WHERE id = draft_id
        AND status = 'enviado_simulado'
        AND approved_by_persona = socio
    ) THEN
      RAISE EXCEPTION 'FAIL: approve_client_notify did not approve as socio';
    END IF;
    RAISE NOTICE 'OK: socio approve_client_notify succeeds';

    DELETE FROM ciceron.client_notify_drafts WHERE id = draft_id;
  END IF;

  RAISE NOTICE 'OK: 310 expedientes fixups verify passed';
END $$;
