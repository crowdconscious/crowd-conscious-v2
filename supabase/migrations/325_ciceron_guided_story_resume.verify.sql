-- Verify 325: resume clears completion. BEGIN…ROLLBACK only.
BEGIN;

DO $$
DECLARE
  token_hash text := encode(sha256(convert_to('e4-guided-resume-verify', 'UTF8')), 'hex');
  firm uuid := 'a1000000-0000-4000-8000-000000000001';
  persona uuid := 'b1000000-0000-4000-8000-000000000001';
  sess_id uuid;
  res jsonb;
BEGIN
  INSERT INTO ciceron.demo_sessions (id, firm_id, persona_id, token_hash, expires_at)
  VALUES (
    'e4000000-0000-4000-8000-000000000325',
    firm,
    persona,
    token_hash,
    now() + interval '1 hour'
  )
  RETURNING id INTO sess_id;

  INSERT INTO ciceron.guided_story_progress (
    session_id, firm_id, current_step, completed_steps, completed_at, dismissed
  ) VALUES (
    sess_id, firm, 7, ARRAY[1,2,3,4,5,6]::int[], now(), true
  );

  res := ciceron.update_guided_story(token_hash, 1, false);

  IF COALESCE((res->>'ok')::boolean, false) IS NOT TRUE THEN
    RAISE EXCEPTION '325 verify: resume RPC failed: %', res;
  END IF;
  IF COALESCE((res->>'restarted')::boolean, false) IS NOT TRUE THEN
    RAISE EXCEPTION '325 verify: expected restarted=true, got %', res;
  END IF;
  IF COALESCE((res->>'completed')::boolean, true) IS TRUE THEN
    RAISE EXCEPTION '325 verify: completed should be false after resume, got %', res;
  END IF;
  IF COALESCE((res->>'current_step')::int, 0) <> 1 THEN
    RAISE EXCEPTION '325 verify: current_step should be 1, got %', res;
  END IF;

  IF EXISTS (
    SELECT 1 FROM ciceron.guided_story_progress
    WHERE session_id = sess_id AND completed_at IS NOT NULL
  ) THEN
    RAISE EXCEPTION '325 verify: completed_at still set after resume';
  END IF;
END $$;

ROLLBACK;
