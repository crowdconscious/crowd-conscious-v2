-- 336_ciceron_client_need_notes.sql
-- Additive: firm-facing feedback box («¿Qué les gustaría ver o automatizar?»).
-- Do NOT apply to production from an agent — CTO applies and verifies.
-- Demo path uses service_role RPCs; authenticated RLS covers real JWT users.

-- ---------------------------------------------------------------------------
-- client_need_notes
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ciceron.client_need_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL REFERENCES ciceron.firms(id) ON DELETE CASCADE,
  author_actor uuid NOT NULL,
  context text NOT NULL DEFAULT 'general'
    CHECK (context IN ('hoy', 'boletines', 'preferencias', 'general')),
  body text NOT NULL
    CHECK (char_length(trim(body)) BETWEEN 1 AND 2000),
  status text NOT NULL DEFAULT 'nuevo'
    CHECK (status IN ('nuevo', 'leido')),
  is_demo boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  read_at timestamptz,
  read_by_actor uuid
);

CREATE INDEX IF NOT EXISTS client_need_notes_firm_created_idx
  ON ciceron.client_need_notes (firm_id, created_at DESC);

CREATE INDEX IF NOT EXISTS client_need_notes_status_idx
  ON ciceron.client_need_notes (status, created_at DESC)
  WHERE status = 'nuevo';

COMMENT ON TABLE ciceron.client_need_notes IS
  'Firm member product-need notes for the Cicerón team. Bodies never go into analytics events.';
COMMENT ON COLUMN ciceron.client_need_notes.author_actor IS
  'Actor id (auth.users or demo_personas) matching memberships.user_id.';
COMMENT ON COLUMN ciceron.client_need_notes.context IS
  'Surface where the note was written: hoy | boletines | preferencias | general.';

ALTER TABLE ciceron.client_need_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE ciceron.client_need_notes FORCE ROW LEVEL SECURITY;
REVOKE ALL ON ciceron.client_need_notes FROM PUBLIC, anon;
GRANT SELECT, INSERT ON ciceron.client_need_notes TO authenticated;
GRANT ALL ON ciceron.client_need_notes TO service_role;

-- Firm members may read their own firm's notes.
DROP POLICY IF EXISTS client_need_notes_select_firm ON ciceron.client_need_notes;
CREATE POLICY client_need_notes_select_firm ON ciceron.client_need_notes
  FOR SELECT TO authenticated
  USING (firm_id IN (SELECT ciceron.firms_of_current_user()));

-- Cicerón admins (membership role admin on any firm) may read all notes.
DROP POLICY IF EXISTS client_need_notes_select_admin ON ciceron.client_need_notes;
CREATE POLICY client_need_notes_select_admin ON ciceron.client_need_notes
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM ciceron.memberships ms
      WHERE ms.user_id = ciceron.current_actor_id()
        AND ms.role = 'admin'
    )
  );

-- Firm members may insert notes for their firm as themselves.
DROP POLICY IF EXISTS client_need_notes_insert ON ciceron.client_need_notes;
CREATE POLICY client_need_notes_insert ON ciceron.client_need_notes
  FOR INSERT TO authenticated
  WITH CHECK (
    firm_id IN (SELECT ciceron.firms_of_current_user())
    AND author_actor = ciceron.current_actor_id()
  );

-- ---------------------------------------------------------------------------
-- RPC: submit a client need note (demo-persona and JWT safe)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION ciceron.submit_client_need_note(
  p_firm_id uuid,
  p_actor uuid,
  p_context text,
  p_body text,
  p_is_demo boolean DEFAULT false,
  p_notify_admins boolean DEFAULT true
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ciceron
AS $$
DECLARE
  actor_role text;
  firm_is_demo boolean;
  note_id uuid;
  ctx text;
  cleaned text;
  admin_rec record;
BEGIN
  ctx := lower(trim(COALESCE(p_context, 'general')));
  IF ctx NOT IN ('hoy', 'boletines', 'preferencias', 'general') THEN
    RETURN jsonb_build_object(
      'ok', false,
      'policy_id', 'invalid_context',
      'policy_reason', 'El contexto de la nota no es válido.'
    );
  END IF;

  cleaned := trim(COALESCE(p_body, ''));
  IF char_length(cleaned) < 1 OR char_length(cleaned) > 2000 THEN
    RETURN jsonb_build_object(
      'ok', false,
      'policy_id', 'invalid_body',
      'policy_reason', 'Escriba entre 1 y 2000 caracteres.'
    );
  END IF;

  SELECT ms.role INTO actor_role
  FROM ciceron.memberships ms
  WHERE ms.firm_id = p_firm_id AND ms.user_id = p_actor;

  IF actor_role IS NULL THEN
    PERFORM ciceron.write_audit_event(
      p_firm_id, p_actor, 'client_need_note_submit', 'client_need_notes', NULL,
      jsonb_build_object('context', ctx),
      'denied', 'rbac_membership',
      'Debe ser miembro del despacho para enviar una nota.',
      jsonb_build_object('entity_type', 'client_need_notes')
    );
    RETURN jsonb_build_object(
      'ok', false,
      'policy_id', 'rbac_membership',
      'policy_reason', 'Debe ser miembro del despacho para enviar una nota.'
    );
  END IF;

  SELECT f.is_demo INTO firm_is_demo
  FROM ciceron.firms f
  WHERE f.id = p_firm_id;

  INSERT INTO ciceron.client_need_notes (
    firm_id, author_actor, context, body, status, is_demo
  ) VALUES (
    p_firm_id,
    p_actor,
    ctx,
    cleaned,
    'nuevo',
    COALESCE(p_is_demo, firm_is_demo, false)
  )
  RETURNING id INTO note_id;

  IF COALESCE(p_notify_admins, true) THEN
    FOR admin_rec IN
      SELECT ms.user_id AS admin_id
      FROM ciceron.memberships ms
      WHERE ms.role = 'admin'
      ORDER BY ms.user_id
      LIMIT 20
    LOOP
      INSERT INTO ciceron.in_app_notifications (
        firm_id, recipient_id, recipient_persona, kind, title, body,
        entity_type, entity_id
      ) VALUES (
        p_firm_id,
        NULL,
        admin_rec.admin_id,
        'client_need_note',
        'Nueva nota del despacho',
        'Un miembro del despacho envió una sugerencia desde ' || ctx || '.',
        'client_need_notes',
        note_id
      );
    END LOOP;
  END IF;

  PERFORM ciceron.write_audit_event(
    p_firm_id, p_actor, 'client_need_note_submit', 'client_need_notes', note_id,
    jsonb_build_object('context', ctx, 'body_len', char_length(cleaned)),
    'allowed', 'rbac_membership', NULL,
    jsonb_build_object('entity_type', 'client_need_notes', 'entity_id', note_id)
  );

  RETURN jsonb_build_object('ok', true, 'id', note_id);
END;
$$;

COMMENT ON FUNCTION ciceron.submit_client_need_note IS
  'Insert a firm need note; optional in-app notify for admin personas. No email/WhatsApp.';

REVOKE ALL ON FUNCTION ciceron.submit_client_need_note(uuid, uuid, text, text, boolean, boolean)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION ciceron.submit_client_need_note(uuid, uuid, text, text, boolean, boolean)
  TO service_role;

-- ---------------------------------------------------------------------------
-- RPC: mark note as read (admin only)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION ciceron.mark_client_need_note_read(
  p_note_id uuid,
  p_actor uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ciceron
AS $$
DECLARE
  is_admin boolean;
  note_firm uuid;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM ciceron.memberships ms
    WHERE ms.user_id = p_actor AND ms.role = 'admin'
  ) INTO is_admin;

  IF NOT is_admin THEN
    RETURN jsonb_build_object(
      'ok', false,
      'policy_id', 'rbac_role',
      'policy_reason', 'Solo administración puede marcar notas como leídas.'
    );
  END IF;

  SELECT firm_id INTO note_firm
  FROM ciceron.client_need_notes
  WHERE id = p_note_id;

  IF note_firm IS NULL THEN
    RETURN jsonb_build_object(
      'ok', false,
      'policy_id', 'not_found',
      'policy_reason', 'Nota no encontrada.'
    );
  END IF;

  UPDATE ciceron.client_need_notes
  SET status = 'leido',
      read_at = now(),
      read_by_actor = p_actor
  WHERE id = p_note_id;

  PERFORM ciceron.write_audit_event(
    note_firm, p_actor, 'client_need_note_read', 'client_need_notes', p_note_id,
    '{}'::jsonb, 'allowed', 'rbac_role', NULL,
    jsonb_build_object('entity_type', 'client_need_notes', 'entity_id', p_note_id)
  );

  RETURN jsonb_build_object('ok', true);
END;
$$;

REVOKE ALL ON FUNCTION ciceron.mark_client_need_note_read(uuid, uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION ciceron.mark_client_need_note_read(uuid, uuid)
  TO service_role;
