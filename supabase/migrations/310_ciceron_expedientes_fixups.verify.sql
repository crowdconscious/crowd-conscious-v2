-- 310_ciceron_expedientes_fixups.verify.sql
-- Run after 310. Expect NOTICE lines; RAISE on failure.
-- Covers: is_sample column, room CHECK, session-actor bind on both gates.

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

  -- Pasante session cannot write socio persona id on deadline confirm
  PERFORM ciceron.set_actor(pasante);
  SELECT id INTO target FROM ciceron.deadlines
  WHERE matter_id IN (
      SELECT id FROM ciceron.matters WHERE firm_id = firm
    )
    AND status = 'propuesto'
  ORDER BY due_at
  LIMIT 1;

  IF target IS NULL THEN
    RAISE NOTICE 'SKIP: no propuesto deadline for pasante actor-bind test';
  ELSE
    BEGIN
      UPDATE ciceron.deadlines d
      SET status = 'confirmado',
          confirmed_by = NULL,
          confirmed_by_persona = socio,
          confirmed_at = now()
      WHERE d.id = target;
      RAISE EXCEPTION 'FAIL: pasante was allowed to confirm as socio persona';
    EXCEPTION
      WHEN check_violation THEN
        RAISE NOTICE 'OK: pasante blocked writing socio persona on deadlines';
      WHEN others THEN
        IF SQLERRM LIKE 'FAIL:%' THEN RAISE; END IF;
        RAISE EXCEPTION 'FAIL: unexpected error pasante→socio deadline: %', SQLERRM;
    END;
  END IF;

  -- Socio persona session may confirm as themselves
  PERFORM ciceron.set_actor(socio);
  SELECT id INTO target FROM ciceron.deadlines
  WHERE matter_id IN (
      SELECT id FROM ciceron.matters WHERE firm_id = firm
    )
    AND status = 'propuesto'
  ORDER BY due_at
  LIMIT 1;

  IF target IS NULL THEN
    RAISE NOTICE 'SKIP: no propuesto deadline for socio confirm test';
  ELSE
    UPDATE ciceron.deadlines d
    SET status = 'confirmado',
        confirmed_by = NULL,
        confirmed_by_persona = socio,
        confirmed_at = now()
    WHERE d.id = target;
    -- revert so seed/demo state stays propuesto
    UPDATE ciceron.deadlines d
    SET status = 'propuesto',
        confirmed_by = NULL,
        confirmed_by_persona = NULL,
        confirmed_at = NULL
    WHERE d.id = target;
    RAISE NOTICE 'OK: socio persona may confirm as self';
  END IF;

  -- Real-user path: confirmed_by (= session actor) still works
  PERFORM ciceron.set_actor(socio);
  SELECT id INTO target FROM ciceron.deadlines
  WHERE matter_id IN (
      SELECT id FROM ciceron.matters WHERE firm_id = firm
    )
    AND status = 'propuesto'
  ORDER BY due_at
  LIMIT 1;

  IF target IS NULL THEN
    RAISE NOTICE 'SKIP: no propuesto deadline for confirmed_by path';
  ELSE
    UPDATE ciceron.deadlines d
    SET status = 'confirmado',
        confirmed_by = socio,
        confirmed_by_persona = NULL,
        confirmed_at = now()
    WHERE d.id = target;
    UPDATE ciceron.deadlines d
    SET status = 'propuesto',
        confirmed_by = NULL,
        confirmed_by_persona = NULL,
        confirmed_at = NULL
    WHERE d.id = target;
    RAISE NOTICE 'OK: confirmed_by real-user path unchanged';
  END IF;

  -- Notify gate: pasante writing socio approved_by_persona blocked
  SELECT id INTO matter FROM ciceron.matters WHERE firm_id = firm ORDER BY created_at LIMIT 1;
  IF matter IS NULL THEN
    RAISE NOTICE 'SKIP: no matter for notify gate test';
  ELSE
    PERFORM ciceron.set_actor(pasante);
    INSERT INTO ciceron.client_notify_drafts (
      firm_id, matter_id, to_email, subject, body, status, is_sample, created_by_persona
    ) VALUES (
      firm, matter, 'verify@example.invalid', 'verify', 'body', 'borrador', true, pasante
    ) RETURNING id INTO draft_id;

    BEGIN
      UPDATE ciceron.client_notify_drafts
      SET status = 'aprobado',
          approved_by = NULL,
          approved_by_persona = socio,
          approved_at = now()
      WHERE id = draft_id;
      RAISE EXCEPTION 'FAIL: pasante was allowed to approve as socio persona';
    EXCEPTION
      WHEN check_violation THEN
        RAISE NOTICE 'OK: pasante blocked writing socio persona on notify';
      WHEN others THEN
        IF SQLERRM LIKE 'FAIL:%' THEN RAISE; END IF;
        RAISE EXCEPTION 'FAIL: unexpected error pasante→socio notify: %', SQLERRM;
    END;

    -- Socio may approve as self
    PERFORM ciceron.set_actor(socio);
    UPDATE ciceron.client_notify_drafts
    SET status = 'aprobado',
        approved_by = NULL,
        approved_by_persona = socio,
        approved_at = now()
    WHERE id = draft_id;
    RAISE NOTICE 'OK: socio persona may approve notify as self';

    DELETE FROM ciceron.client_notify_drafts WHERE id = draft_id;
  END IF;

  RAISE NOTICE 'OK: 310 expedientes fixups verify passed';
END $$;
