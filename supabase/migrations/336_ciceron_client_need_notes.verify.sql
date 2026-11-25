-- Verify 336_ciceron_client_need_notes.sql (non-persistent)
BEGIN;

DO $$
DECLARE
  firm uuid := 'a1000000-0000-4000-8000-000000000001'::uuid;
  actor uuid := 'b1000000-0000-4000-8000-000000000001'::uuid; -- socio
  admin_actor uuid := 'b1000000-0000-4000-8000-000000000004'::uuid; -- admin
  res jsonb;
  note_id uuid;
  n int;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'ciceron' AND table_name = 'client_need_notes'
  ) THEN
    RAISE EXCEPTION 'FAIL: client_need_notes missing';
  END IF;

  -- Prefer a known admin persona; fall back to any admin membership on the firm.
  IF NOT EXISTS (
    SELECT 1 FROM ciceron.memberships WHERE user_id = admin_actor AND role = 'admin'
  ) THEN
    SELECT user_id INTO admin_actor
    FROM ciceron.memberships
    WHERE role = 'admin'
    LIMIT 1;
  END IF;

  res := ciceron.submit_client_need_note(
    firm, actor, 'hoy', 'Quisiéramos automatizar el boletín de Guanajuato.', true, false
  );
  IF (res->>'ok')::boolean IS NOT TRUE THEN
    RAISE EXCEPTION 'FAIL: submit_client_need_note %', res;
  END IF;
  note_id := (res->>'id')::uuid;

  SELECT count(*) INTO n FROM ciceron.client_need_notes WHERE id = note_id AND status = 'nuevo';
  IF n <> 1 THEN
    RAISE EXCEPTION 'FAIL: note not inserted';
  END IF;

  -- Empty body rejected
  res := ciceron.submit_client_need_note(firm, actor, 'hoy', '   ', true, false);
  IF (res->>'ok')::boolean IS NOT FALSE THEN
    RAISE EXCEPTION 'FAIL: empty body should be rejected';
  END IF;

  IF admin_actor IS NOT NULL THEN
    res := ciceron.mark_client_need_note_read(note_id, admin_actor);
    IF (res->>'ok')::boolean IS NOT TRUE THEN
      RAISE EXCEPTION 'FAIL: mark read %', res;
    END IF;
    SELECT count(*) INTO n FROM ciceron.client_need_notes WHERE id = note_id AND status = 'leido';
    IF n <> 1 THEN
      RAISE EXCEPTION 'FAIL: note not marked leido';
    END IF;
  END IF;

  RAISE NOTICE 'PASS: 336_ciceron_client_need_notes';
END;
$$;

ROLLBACK;
