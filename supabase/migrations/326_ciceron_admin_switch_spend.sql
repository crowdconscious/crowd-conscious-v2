-- 326: Admin-mint sessions may switch back to admin; DOF spend aggregate RPC.
-- Does not weaken prospect invites (default_persona ≠ admin cannot switch to admin).

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
  invite_default_role text;
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

  IF persona.role = 'admin' THEN
    SELECT dp.role INTO invite_default_role
    FROM ciceron.invite_codes ic
    JOIN ciceron.demo_personas dp ON dp.id = ic.default_persona_id
    WHERE ic.id = sess.invite_code_id;

    IF invite_default_role IS DISTINCT FROM 'admin' THEN
      RETURN jsonb_build_object('ok', false, 'policy_id', 'persona_switch_admin',
        'policy_reason', 'Solo una invitación de administrador puede volver al rol Administrador.');
    END IF;
  ELSIF persona.role NOT IN ('socio', 'asociado', 'pasante') THEN
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

COMMENT ON FUNCTION ciceron.switch_demo_persona(text, uuid) IS
  'Demo bar: socio|asociado|pasante; admin only when invite default_persona is admin.';

-- Aggregate DOF-related spend since a timestamp (avoids 5000-row select caps).
CREATE OR REPLACE FUNCTION ciceron.dof_spend_since(p_since timestamptz)
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ciceron
AS $$
  SELECT COALESCE(SUM(cost_estimate_usd), 0)::numeric
  FROM ciceron.ai_runs
  WHERE created_at >= p_since
    AND (
      purpose LIKE 'dof_%'
      OR purpose = 'watch_profile_embed'
    );
$$;

REVOKE ALL ON FUNCTION ciceron.dof_spend_since(timestamptz)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION ciceron.dof_spend_since(timestamptz) TO service_role;
