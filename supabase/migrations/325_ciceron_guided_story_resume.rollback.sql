-- Rollback 325: restore update_guided_story from 319 behaviour (no restart clear).

CREATE OR REPLACE FUNCTION ciceron.update_guided_story(
  p_token_hash text,
  p_step int,
  p_dismiss boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ciceron
AS $$
DECLARE
  sess ciceron.demo_sessions%ROWTYPE;
  prog ciceron.guided_story_progress%ROWTYPE;
  steps int[];
BEGIN
  IF p_token_hash IS NULL OR p_token_hash !~ '^[0-9a-f]{64}$' THEN
    RETURN jsonb_build_object('ok', false, 'policy_id', 'session_token',
      'policy_reason', 'Sesión no válida.');
  END IF;

  SELECT * INTO sess FROM ciceron.demo_sessions WHERE token_hash = p_token_hash FOR UPDATE;
  IF sess.id IS NULL OR sess.expires_at < now() THEN
    RETURN jsonb_build_object('ok', false, 'policy_id', 'session_expired',
      'policy_reason', 'La sesión de demostración ha expirado.');
  END IF;

  IF COALESCE(p_dismiss, false) THEN
    UPDATE ciceron.demo_sessions SET story_dismissed = true, updated_at = now()
    WHERE id = sess.id;
    UPDATE ciceron.guided_story_progress
    SET dismissed = true, updated_at = now()
    WHERE session_id = sess.id;
    RETURN jsonb_build_object('ok', true, 'dismissed', true);
  END IF;

  IF p_step IS NULL OR p_step < 1 OR p_step > 7 THEN
    RETURN jsonb_build_object('ok', false, 'policy_id', 'story_step',
      'policy_reason', 'El paso del recorrido debe estar entre 1 y 7.');
  END IF;

  INSERT INTO ciceron.guided_story_progress (session_id, firm_id, current_step)
  VALUES (sess.id, sess.firm_id, p_step)
  ON CONFLICT (session_id) DO NOTHING;

  SELECT * INTO prog FROM ciceron.guided_story_progress WHERE session_id = sess.id FOR UPDATE;
  steps := prog.completed_steps;

  IF p_step BETWEEN 1 AND 6 AND NOT (p_step = ANY (steps)) THEN
    steps := array_append(steps, p_step);
  END IF;

  UPDATE ciceron.guided_story_progress
  SET current_step = p_step,
      completed_steps = steps,
      completed_at = CASE
        WHEN p_step >= 7 OR cardinality(steps) >= 6 THEN COALESCE(completed_at, now())
        ELSE completed_at
      END,
      dismissed = false,
      updated_at = now()
  WHERE session_id = sess.id;

  INSERT INTO ciceron.engagement_resume (firm_id, user_id, room, href, label, updated_at)
  VALUES (
    sess.firm_id,
    sess.persona_id,
    'hoy',
    '/ciceron/hoy',
    'guided_step_' || LEAST(p_step, 6)::text,
    now()
  )
  ON CONFLICT (firm_id, user_id) DO UPDATE
    SET room = EXCLUDED.room,
        href = EXCLUDED.href,
        label = EXCLUDED.label,
        updated_at = now();

  RETURN jsonb_build_object(
    'ok', true,
    'current_step', p_step,
    'completed_steps', to_jsonb(steps),
    'completed', (p_step >= 7 OR cardinality(steps) >= 6)
  );
END;
$$;

REVOKE ALL ON FUNCTION ciceron.update_guided_story(text, int, boolean)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION ciceron.update_guided_story(text, int, boolean) TO service_role;
