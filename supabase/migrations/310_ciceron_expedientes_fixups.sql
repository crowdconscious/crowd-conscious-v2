-- 310_ciceron_expedientes_fixups.sql
-- Prompt 6 fixups after 308 applied on prod with 306's saved_views already present.
-- 308's CREATE TABLE IF NOT EXISTS skipped; is_sample + room CHECK never landed.
-- Do NOT edit 308 forward body. Applied by CTO after review.
-- Apply BEFORE re-running 309_ciceron_expedientes_seed.sql.

-- ---------------------------------------------------------------------------
-- saved_views: add is_sample (skippeded by 308 IF NOT EXISTS)
-- ---------------------------------------------------------------------------
ALTER TABLE ciceron.saved_views
  ADD COLUMN IF NOT EXISTS is_sample boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN ciceron.saved_views.is_sample IS
  'Datos de demostración when true; seed rows from 309.';

-- 306 created room with DEFAULT 'monitor-dof' and NO CHECK.
-- 308 intended CHECK (room IN ('expedientes', 'calendario')) but never applied.
-- Add a single CHECK that keeps monitor-dof and allows Expedientes rooms.
ALTER TABLE ciceron.saved_views
  DROP CONSTRAINT IF EXISTS saved_views_room_check;

ALTER TABLE ciceron.saved_views
  ADD CONSTRAINT saved_views_room_check
  CHECK (room IN ('monitor-dof', 'expedientes', 'calendario'));

-- ---------------------------------------------------------------------------
-- Bind tier-2 gates to session actor (pasante cannot write socio persona id)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION ciceron.deadlines_confirm_authority()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ciceron
AS $$
DECLARE
  actor uuid;
BEGIN
  IF NEW.status = 'confirmado' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM NEW.status) THEN
    IF NEW.confirmed_by IS NULL AND NEW.confirmed_by_persona IS NULL THEN
      RAISE EXCEPTION 'confirmed_by or confirmed_by_persona is required when status is confirmado'
        USING ERRCODE = 'check_violation';
    END IF;

    actor := COALESCE(NEW.confirmed_by, NEW.confirmed_by_persona);

    IF actor IS DISTINCT FROM ciceron.current_actor_id() THEN
      RAISE EXCEPTION 'confirm actor must match the logged-in session actor'
        USING ERRCODE = 'check_violation';
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM ciceron.matters m
      JOIN ciceron.memberships ms
        ON ms.firm_id = m.firm_id
       AND ms.user_id = actor
       AND ms.role IN ('socio', 'asociado', 'admin')
      WHERE m.id = NEW.matter_id
    ) THEN
      RAISE EXCEPTION 'only socio, asociado, or admin may confirm deadlines'
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION ciceron.deadlines_confirm_authority() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION ciceron.deadlines_confirm_authority() TO service_role;

CREATE OR REPLACE FUNCTION ciceron.client_notify_tier2_gate()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ciceron
AS $$
DECLARE
  actor uuid;
BEGIN
  IF NEW.status IN ('aprobado', 'enviado_simulado')
     AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM NEW.status) THEN
    IF NEW.approved_by IS NULL AND NEW.approved_by_persona IS NULL THEN
      RAISE EXCEPTION 'approved_by or approved_by_persona is required when status is %', NEW.status
        USING ERRCODE = 'check_violation';
    END IF;

    actor := COALESCE(NEW.approved_by, NEW.approved_by_persona);

    IF actor IS DISTINCT FROM ciceron.current_actor_id() THEN
      RAISE EXCEPTION 'approve actor must match the logged-in session actor'
        USING ERRCODE = 'check_violation';
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM ciceron.matters m
      JOIN ciceron.memberships ms
        ON ms.firm_id = m.firm_id
       AND ms.user_id = actor
       AND ms.role IN ('socio', 'asociado', 'admin')
      WHERE m.id = NEW.matter_id
    ) THEN
      RAISE EXCEPTION 'only socio, asociado, or admin may approve client notify drafts'
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION ciceron.client_notify_tier2_gate() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION ciceron.client_notify_tier2_gate() TO service_role;

-- ---------------------------------------------------------------------------
-- Service-role RPCs: set_actor + update in one transaction (demo + real auth)
-- Server actions call these instead of raw UPDATEs so current_actor_id() matches.
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

COMMENT ON FUNCTION ciceron.confirm_deadline(uuid, uuid, text) IS
  'Service-role: set_actor(p_actor) then confirm deadline. Persona → confirmed_by_persona; else confirmed_by.';

REVOKE ALL ON FUNCTION ciceron.confirm_deadline(uuid, uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION ciceron.confirm_deadline(uuid, uuid, text) TO service_role;

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

COMMENT ON FUNCTION ciceron.approve_client_notify(uuid, uuid) IS
  'Service-role: set_actor(p_actor) then mark notify draft enviado_simulado. Persona → approved_by_persona; else approved_by.';

REVOKE ALL ON FUNCTION ciceron.approve_client_notify(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION ciceron.approve_client_notify(uuid, uuid) TO service_role;
