-- 310_ciceron_expedientes_fixups.rollback.sql (branch / non-prod only)
-- Restores 308 gate bodies and removes is_sample + room CHECK + RPCs added by 310.
-- Does not touch ciceron.saved_views rows or the table itself.

DROP FUNCTION IF EXISTS ciceron.approve_client_notify(uuid, uuid);
DROP FUNCTION IF EXISTS ciceron.confirm_deadline(uuid, uuid, text);

-- Restore 308 deadlines_confirm_authority (persona-aware, no session-actor bind)
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

-- Restore 308 client_notify_tier2_gate (persona-aware, no session-actor bind)
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

ALTER TABLE ciceron.saved_views
  DROP CONSTRAINT IF EXISTS saved_views_room_check;

ALTER TABLE ciceron.saved_views
  DROP COLUMN IF EXISTS is_sample;
