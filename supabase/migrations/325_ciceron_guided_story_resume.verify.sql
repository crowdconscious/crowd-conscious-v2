-- Verify 325: resume clears completion when finished; mid-dismiss keeps steps.
-- BEGIN…ROLLBACK only. demo_sessions.invite_code_id is NOT NULL.
BEGIN;

DO $$
DECLARE
  token_hash text := encode(sha256(convert_to('e4-guided-resume-verify', 'UTF8')), 'hex');
  firm uuid := 'a1000000-0000-4000-8000-000000000001';
  persona uuid := 'b1000000-0000-4000-8000-000000000001';
  invite_id uuid;
  sess_id uuid;
  res jsonb;
  kept_steps int[];
BEGIN
  SELECT id INTO invite_id
  FROM ciceron.invite_codes
  WHERE firm_id = firm AND is_demo = true
  ORDER BY created_at ASC NULLS LAST
  LIMIT 1;

  IF invite_id IS NULL THEN
    RAISE EXCEPTION '325 verify: no demo invite_codes row to satisfy invite_code_id NOT NULL';
  END IF;

  INSERT INTO ciceron.demo_sessions (
    id, invite_code_id, firm_id, persona_id, token_hash, expires_at
  ) VALUES (
    'e4000000-0000-4000-8000-000000000325',
    invite_id,
    firm,
    persona,
    token_hash,
    now() + interval '1 hour'
  )
  RETURNING id INTO sess_id;

  -- Finished tour: resume must clear completed_at and restart steps.
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

  -- Mid-tour dismiss: resume must keep prior completed_steps (no wipe).
  UPDATE ciceron.guided_story_progress
  SET current_step = 3,
      completed_steps = ARRAY[1,2,3]::int[],
      completed_at = NULL,
      dismissed = true,
      updated_at = now()
  WHERE session_id = sess_id;

  res := ciceron.update_guided_story(token_hash, 3, false);
  IF COALESCE((res->>'ok')::boolean, false) IS NOT TRUE THEN
    RAISE EXCEPTION '325 verify: mid-dismiss resume failed: %', res;
  END IF;
  IF COALESCE((res->>'restarted')::boolean, false) IS TRUE THEN
    RAISE EXCEPTION '325 verify: mid-dismiss resume must not set restarted';
  END IF;

  SELECT completed_steps INTO kept_steps
  FROM ciceron.guided_story_progress
  WHERE session_id = sess_id;

  IF kept_steps IS DISTINCT FROM ARRAY[1,2,3]::int[] THEN
    RAISE EXCEPTION '325 verify: mid-dismiss wiped completed_steps: %', kept_steps;
  END IF;
END $$;

ROLLBACK;
