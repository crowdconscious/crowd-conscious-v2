-- 311_ciceron_confirm_idempotent.rollback.sql (branch / non-prod only)
-- Drops discard_deadline and restores confirm/approve bodies from 310.

DROP FUNCTION IF EXISTS ciceron.discard_deadline(uuid, uuid);

-- Restore 310 confirm_deadline (no idempotency guard)
CREATE OR REPLACE FUNCTION ciceron.confirm_deadline(
  p_actor uuid,
  p_deadline_id uuid,
  p_decision text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ciceron
AS $$
DECLARE
  is_persona boolean;
  updated int;
BEGIN
  IF p_actor IS NULL OR p_deadline_id IS NULL THEN
    RAISE EXCEPTION 'actor and deadline id are required'
      USING ERRCODE = 'check_violation';
  END IF;

  IF p_decision IS DISTINCT FROM 'confirmado' THEN
    RAISE EXCEPTION 'unsupported decision: %', p_decision
      USING ERRCODE = 'check_violation';
  END IF;

  PERFORM ciceron.set_actor(p_actor);

  is_persona := EXISTS (
    SELECT 1 FROM ciceron.demo_personas dp WHERE dp.id = p_actor
  );

  IF is_persona THEN
    UPDATE ciceron.deadlines
    SET status = 'confirmado',
        confirmed_by = NULL,
        confirmed_by_persona = p_actor,
        confirmed_at = now()
    WHERE id = p_deadline_id;
  ELSE
    UPDATE ciceron.deadlines
    SET status = 'confirmado',
        confirmed_by = p_actor,
        confirmed_by_persona = NULL,
        confirmed_at = now()
    WHERE id = p_deadline_id;
  END IF;

  GET DIAGNOSTICS updated = ROW_COUNT;
  IF updated <> 1 THEN
    RAISE EXCEPTION 'deadline not found'
      USING ERRCODE = 'check_violation';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION ciceron.confirm_deadline(uuid, uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION ciceron.confirm_deadline(uuid, uuid, text) TO service_role;

-- Restore 310 approve_client_notify (no idempotency guard)
CREATE OR REPLACE FUNCTION ciceron.approve_client_notify(
  p_actor uuid,
  p_draft_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ciceron
AS $$
DECLARE
  is_persona boolean;
  updated int;
BEGIN
  IF p_actor IS NULL OR p_draft_id IS NULL THEN
    RAISE EXCEPTION 'actor and draft id are required'
      USING ERRCODE = 'check_violation';
  END IF;

  PERFORM ciceron.set_actor(p_actor);

  is_persona := EXISTS (
    SELECT 1 FROM ciceron.demo_personas dp WHERE dp.id = p_actor
  );

  IF is_persona THEN
    UPDATE ciceron.client_notify_drafts
    SET status = 'enviado_simulado',
        approved_by = NULL,
        approved_by_persona = p_actor,
        approved_at = now(),
        simulated_sent_at = now()
    WHERE id = p_draft_id;
  ELSE
    UPDATE ciceron.client_notify_drafts
    SET status = 'enviado_simulado',
        approved_by = p_actor,
        approved_by_persona = NULL,
        approved_at = now(),
        simulated_sent_at = now()
    WHERE id = p_draft_id;
  END IF;

  GET DIAGNOSTICS updated = ROW_COUNT;
  IF updated <> 1 THEN
    RAISE EXCEPTION 'notify draft not found'
      USING ERRCODE = 'check_violation';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION ciceron.approve_client_notify(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION ciceron.approve_client_notify(uuid, uuid) TO service_role;
