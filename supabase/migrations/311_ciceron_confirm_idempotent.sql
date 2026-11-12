-- 311_ciceron_confirm_idempotent.sql
-- Prompt 6 follow-up: idempotent confirm/approve RPCs + discard_deadline.
-- Requires 308 + 310 (applied). Applied by CTO after review.
-- Do not edit 308/309/310 forward bodies.

-- ---------------------------------------------------------------------------
-- confirm_deadline: refuse overwrite of confirmado / descartado
-- ---------------------------------------------------------------------------
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
  cur_status text;
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

  SELECT d.status INTO cur_status
  FROM ciceron.deadlines d
  WHERE d.id = p_deadline_id
  FOR UPDATE;

  IF cur_status IS NULL THEN
    RAISE EXCEPTION 'deadline not found'
      USING ERRCODE = 'check_violation';
  END IF;

  IF cur_status IN ('confirmado', 'descartado') THEN
    RAISE EXCEPTION 'deadline already decided (%)', cur_status
      USING ERRCODE = 'check_violation';
  END IF;

  is_persona := EXISTS (
    SELECT 1 FROM ciceron.demo_personas dp WHERE dp.id = p_actor
  );

  IF is_persona THEN
    UPDATE ciceron.deadlines
    SET status = 'confirmado',
        confirmed_by = NULL,
        confirmed_by_persona = p_actor,
        confirmed_at = now()
    WHERE id = p_deadline_id
      AND status = 'propuesto';
  ELSE
    UPDATE ciceron.deadlines
    SET status = 'confirmado',
        confirmed_by = p_actor,
        confirmed_by_persona = NULL,
        confirmed_at = now()
    WHERE id = p_deadline_id
      AND status = 'propuesto';
  END IF;

  GET DIAGNOSTICS updated = ROW_COUNT;
  IF updated <> 1 THEN
    RAISE EXCEPTION 'deadline not confirmable'
      USING ERRCODE = 'check_violation';
  END IF;
END;
$$;

COMMENT ON FUNCTION ciceron.confirm_deadline(uuid, uuid, text) IS
  'Service-role: set_actor then confirm propuesto only. Refuses confirmado/descartado (23514).';

REVOKE ALL ON FUNCTION ciceron.confirm_deadline(uuid, uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION ciceron.confirm_deadline(uuid, uuid, text) TO service_role;

-- ---------------------------------------------------------------------------
-- approve_client_notify: refuse overwrite of aprobado / enviado_simulado
-- ---------------------------------------------------------------------------
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
  cur_status text;
  updated int;
BEGIN
  IF p_actor IS NULL OR p_draft_id IS NULL THEN
    RAISE EXCEPTION 'actor and draft id are required'
      USING ERRCODE = 'check_violation';
  END IF;

  PERFORM ciceron.set_actor(p_actor);

  SELECT d.status INTO cur_status
  FROM ciceron.client_notify_drafts d
  WHERE d.id = p_draft_id
  FOR UPDATE;

  IF cur_status IS NULL THEN
    RAISE EXCEPTION 'notify draft not found'
      USING ERRCODE = 'check_violation';
  END IF;

  IF cur_status IN ('aprobado', 'enviado_simulado') THEN
    RAISE EXCEPTION 'notify draft already decided (%)', cur_status
      USING ERRCODE = 'check_violation';
  END IF;

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
    WHERE id = p_draft_id
      AND status NOT IN ('aprobado', 'enviado_simulado');
  ELSE
    UPDATE ciceron.client_notify_drafts
    SET status = 'enviado_simulado',
        approved_by = p_actor,
        approved_by_persona = NULL,
        approved_at = now(),
        simulated_sent_at = now()
    WHERE id = p_draft_id
      AND status NOT IN ('aprobado', 'enviado_simulado');
  END IF;

  GET DIAGNOSTICS updated = ROW_COUNT;
  IF updated <> 1 THEN
    RAISE EXCEPTION 'notify draft not approvable'
      USING ERRCODE = 'check_violation';
  END IF;
END;
$$;

COMMENT ON FUNCTION ciceron.approve_client_notify(uuid, uuid) IS
  'Service-role: set_actor then approve draft. Refuses aprobado/enviado_simulado (23514).';

REVOKE ALL ON FUNCTION ciceron.approve_client_notify(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION ciceron.approve_client_notify(uuid, uuid) TO service_role;

-- ---------------------------------------------------------------------------
-- discard_deadline: set_actor + tier-2 role gate; propuesto only
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION ciceron.discard_deadline(
  p_actor uuid,
  p_deadline_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ciceron
AS $$
DECLARE
  is_persona boolean;
  cur_status text;
  matter uuid;
  updated int;
BEGIN
  IF p_actor IS NULL OR p_deadline_id IS NULL THEN
    RAISE EXCEPTION 'actor and deadline id are required'
      USING ERRCODE = 'check_violation';
  END IF;

  PERFORM ciceron.set_actor(p_actor);

  SELECT d.status, d.matter_id INTO cur_status, matter
  FROM ciceron.deadlines d
  WHERE d.id = p_deadline_id
  FOR UPDATE;

  IF cur_status IS NULL THEN
    RAISE EXCEPTION 'deadline not found'
      USING ERRCODE = 'check_violation';
  END IF;

  IF cur_status IN ('confirmado', 'descartado') THEN
    RAISE EXCEPTION 'deadline already decided (%)', cur_status
      USING ERRCODE = 'check_violation';
  END IF;

  IF p_actor IS DISTINCT FROM ciceron.current_actor_id() THEN
    RAISE EXCEPTION 'discard actor must match the logged-in session actor'
      USING ERRCODE = 'check_violation';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM ciceron.matters m
    JOIN ciceron.memberships ms
      ON ms.firm_id = m.firm_id
     AND ms.user_id = p_actor
     AND ms.role IN ('socio', 'asociado', 'admin')
    WHERE m.id = matter
  ) THEN
    RAISE EXCEPTION 'only socio, asociado, or admin may discard deadlines'
      USING ERRCODE = 'check_violation';
  END IF;

  is_persona := EXISTS (
    SELECT 1 FROM ciceron.demo_personas dp WHERE dp.id = p_actor
  );

  IF is_persona THEN
    UPDATE ciceron.deadlines
    SET status = 'descartado',
        discarded_by = NULL,
        discarded_by_persona = p_actor,
        discarded_at = now()
    WHERE id = p_deadline_id
      AND status = 'propuesto';
  ELSE
    UPDATE ciceron.deadlines
    SET status = 'descartado',
        discarded_by = p_actor,
        discarded_by_persona = NULL,
        discarded_at = now()
    WHERE id = p_deadline_id
      AND status = 'propuesto';
  END IF;

  GET DIAGNOSTICS updated = ROW_COUNT;
  IF updated <> 1 THEN
    RAISE EXCEPTION 'deadline not discardable'
      USING ERRCODE = 'check_violation';
  END IF;
END;
$$;

COMMENT ON FUNCTION ciceron.discard_deadline(uuid, uuid) IS
  'Service-role: set_actor + socio/asociado/admin gate; discard propuesto only. Persona → discarded_by_persona.';

REVOKE ALL ON FUNCTION ciceron.discard_deadline(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION ciceron.discard_deadline(uuid, uuid) TO service_role;
