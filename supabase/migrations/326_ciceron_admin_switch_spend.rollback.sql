-- Rollback 326: restore switch_demo_persona (no admin return) and drop spend RPC.

DROP FUNCTION IF EXISTS ciceron.dof_spend_since(timestamptz);

CREATE OR REPLACE FUNCTION ciceron.switch_demo_persona(
  p_token_hash text,
  p_persona_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ciceron
AS $$
DECLARE
  sess ciceron.demo_sessions%ROWTYPE;
  persona ciceron.demo_personas%ROWTYPE;
BEGIN
  SELECT * INTO sess FROM ciceron.demo_sessions WHERE token_hash = p_token_hash FOR UPDATE;
  IF sess.id IS NULL OR sess.expires_at < now() THEN
    RETURN jsonb_build_object('ok', false, 'policy_id', 'session_expired',
      'policy_reason', 'La sesión de demostración ha expirado.');
  END IF;

  SELECT * INTO persona FROM ciceron.demo_personas WHERE id = p_persona_id;
  IF persona.id IS NULL OR persona.firm_id <> sess.firm_id THEN
    RETURN jsonb_build_object('ok', false, 'policy_id', 'persona_firm',
      'policy_reason', 'La persona no pertenece a este despacho de demostración.');
  END IF;

  IF persona.role NOT IN ('socio', 'asociado', 'pasante') THEN
    RETURN jsonb_build_object('ok', false, 'policy_id', 'persona_switch_role',
      'policy_reason', 'Solo puede cambiar entre Socia, Asociado y Pasante en la demostración.');
  END IF;

  UPDATE ciceron.demo_sessions
  SET persona_id = persona.id, last_seen_at = now(), updated_at = now()
  WHERE id = sess.id;

  PERFORM ciceron.write_audit_event(
    sess.firm_id, persona.id, 'persona_switch', 'demo_sessions', sess.id,
    jsonb_build_object('role', persona.role, 'is_demo', true),
    'allowed', NULL, NULL,
    jsonb_build_object('entity_type', 'demo_sessions', 'entity_id', sess.id)
  );

  RETURN jsonb_build_object(
    'ok', true,
    'persona_id', persona.id,
    'role', persona.role,
    'display_name', persona.display_name
  );
END;
$$;

REVOKE ALL ON FUNCTION ciceron.switch_demo_persona(text, uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION ciceron.switch_demo_persona(text, uuid) TO service_role;
