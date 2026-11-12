-- 317_ciceron_demo_invites.sql
-- Prompt 9: hashed invite codes, demo sessions, redeem RPC.
-- Additive. Agents do not apply to production.
-- Pepper for seed hashes: ciceron-demo-pepper-v1 (must match CICERON_INVITE_PEPPER default).
-- Depends on 302+ (demo_personas, firms).

-- ---------------------------------------------------------------------------
-- invite_codes — hashed; never store plaintext codes
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ciceron.invite_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code_hash text NOT NULL UNIQUE
    CHECK (char_length(code_hash) = 64 AND code_hash ~ '^[0-9a-f]{64}$'),
  prospect_label text NOT NULL CHECK (char_length(prospect_label) BETWEEN 1 AND 200),
  firm_id uuid NOT NULL REFERENCES ciceron.firms(id) ON DELETE CASCADE,
  default_persona_id uuid NOT NULL REFERENCES ciceron.demo_personas(id) ON DELETE RESTRICT,
  expires_at timestamptz,
  max_uses int CHECK (max_uses IS NULL OR max_uses > 0),
  use_count int NOT NULL DEFAULT 0 CHECK (use_count >= 0),
  is_active boolean NOT NULL DEFAULT true,
  is_demo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (max_uses IS NULL OR use_count <= max_uses)
);

CREATE INDEX IF NOT EXISTS invite_codes_firm_id_idx ON ciceron.invite_codes (firm_id);
CREATE INDEX IF NOT EXISTS invite_codes_prospect_label_idx ON ciceron.invite_codes (prospect_label);

COMMENT ON TABLE ciceron.invite_codes IS
  'Prompt 9: invite codes stored as sha256(pepper:CODE). Plaintext never persisted.';
COMMENT ON COLUMN ciceron.invite_codes.code_hash IS
  'Lowercase hex sha256 of CICERON_INVITE_PEPPER || ":" || upper(code).';
COMMENT ON COLUMN ciceron.invite_codes.prospect_label IS
  'Sales label for the prospect (e.g. firm name or contact). Not shown to the demo user.';

DROP TRIGGER IF EXISTS invite_codes_set_updated_at ON ciceron.invite_codes;
CREATE TRIGGER invite_codes_set_updated_at
  BEFORE UPDATE ON ciceron.invite_codes
  FOR EACH ROW EXECUTE FUNCTION ciceron.set_updated_at();

ALTER TABLE ciceron.invite_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE ciceron.invite_codes FORCE ROW LEVEL SECURITY;
REVOKE ALL ON ciceron.invite_codes FROM PUBLIC, anon, authenticated;
GRANT SELECT ON ciceron.invite_codes TO authenticated;
GRANT ALL ON ciceron.invite_codes TO service_role;

DROP POLICY IF EXISTS invite_codes_admin_select ON ciceron.invite_codes;
CREATE POLICY invite_codes_admin_select ON ciceron.invite_codes
  FOR SELECT TO authenticated
  USING (
    firm_id IN (
      SELECT m.firm_id FROM ciceron.memberships m
      WHERE m.user_id = ciceron.current_actor_id()
        AND m.role IN ('admin', 'socio')
    )
  );

-- ---------------------------------------------------------------------------
-- demo_sessions — opaque token sessions after redeem
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ciceron.demo_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invite_code_id uuid NOT NULL REFERENCES ciceron.invite_codes(id) ON DELETE CASCADE,
  firm_id uuid NOT NULL REFERENCES ciceron.firms(id) ON DELETE CASCADE,
  persona_id uuid NOT NULL REFERENCES ciceron.demo_personas(id) ON DELETE RESTRICT,
  work_email text CHECK (
    work_email IS NULL
    OR (
      char_length(work_email) BETWEEN 3 AND 254
      AND work_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
    )
  ),
  token_hash text NOT NULL UNIQUE
    CHECK (char_length(token_hash) = 64 AND token_hash ~ '^[0-9a-f]{64}$'),
  expires_at timestamptz NOT NULL,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  story_dismissed boolean NOT NULL DEFAULT false,
  last_freshness_at date,
  is_demo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS demo_sessions_firm_id_idx ON ciceron.demo_sessions (firm_id);
CREATE INDEX IF NOT EXISTS demo_sessions_invite_code_id_idx ON ciceron.demo_sessions (invite_code_id);
CREATE INDEX IF NOT EXISTS demo_sessions_persona_id_idx ON ciceron.demo_sessions (persona_id);

COMMENT ON TABLE ciceron.demo_sessions IS
  'Prompt 9: demo session minted by redeem_invite. Cookie holds opaque token; DB stores token_hash.';
COMMENT ON COLUMN ciceron.demo_sessions.work_email IS
  'Optional work email collected at invite gate. Never required.';
COMMENT ON COLUMN ciceron.demo_sessions.last_freshness_at IS
  'Local date when refresh_demo_dates last ran for this session (lazy, at most once per day).';

DROP TRIGGER IF EXISTS demo_sessions_set_updated_at ON ciceron.demo_sessions;
CREATE TRIGGER demo_sessions_set_updated_at
  BEFORE UPDATE ON ciceron.demo_sessions
  FOR EACH ROW EXECUTE FUNCTION ciceron.set_updated_at();

ALTER TABLE ciceron.demo_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ciceron.demo_sessions FORCE ROW LEVEL SECURITY;
REVOKE ALL ON ciceron.demo_sessions FROM PUBLIC, anon, authenticated;
GRANT SELECT ON ciceron.demo_sessions TO authenticated;
GRANT ALL ON ciceron.demo_sessions TO service_role;

DROP POLICY IF EXISTS demo_sessions_admin_select ON ciceron.demo_sessions;
CREATE POLICY demo_sessions_admin_select ON ciceron.demo_sessions
  FOR SELECT TO authenticated
  USING (
    firm_id IN (
      SELECT m.firm_id FROM ciceron.memberships m
      WHERE m.user_id = ciceron.current_actor_id()
        AND m.role IN ('admin', 'socio')
    )
  );

-- ---------------------------------------------------------------------------
-- guided_story_progress — dismissible, resumable, max 6 steps
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ciceron.guided_story_progress (
  session_id uuid PRIMARY KEY REFERENCES ciceron.demo_sessions(id) ON DELETE CASCADE,
  firm_id uuid NOT NULL REFERENCES ciceron.firms(id) ON DELETE CASCADE,
  current_step int NOT NULL DEFAULT 1 CHECK (current_step BETWEEN 1 AND 7),
  completed_steps int[] NOT NULL DEFAULT '{}'::int[],
  dismissed boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE ciceron.guided_story_progress IS
  'Prompt 9 guided story (max 6 steps). current_step=7 means finished screen. Dismissible and resumable.';
COMMENT ON COLUMN ciceron.guided_story_progress.current_step IS
  '1..6 active steps; 7 = final honesty / CTA screen.';

DROP TRIGGER IF EXISTS guided_story_progress_set_updated_at ON ciceron.guided_story_progress;
CREATE TRIGGER guided_story_progress_set_updated_at
  BEFORE UPDATE ON ciceron.guided_story_progress
  FOR EACH ROW EXECUTE FUNCTION ciceron.set_updated_at();

ALTER TABLE ciceron.guided_story_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE ciceron.guided_story_progress FORCE ROW LEVEL SECURITY;
REVOKE ALL ON ciceron.guided_story_progress FROM PUBLIC, anon, authenticated;
GRANT SELECT ON ciceron.guided_story_progress TO authenticated;
GRANT ALL ON ciceron.guided_story_progress TO service_role;

DROP POLICY IF EXISTS guided_story_admin_select ON ciceron.guided_story_progress;
CREATE POLICY guided_story_admin_select ON ciceron.guided_story_progress
  FOR SELECT TO authenticated
  USING (
    firm_id IN (
      SELECT m.firm_id FROM ciceron.memberships m
      WHERE m.user_id = ciceron.current_actor_id()
        AND m.role IN ('admin', 'socio')
    )
  );

-- ---------------------------------------------------------------------------
-- Seed hashed invites (DESPACHO-DEMO + DESPACHO-PASANTE + other demo codes)
-- Hashes: sha256("ciceron-demo-pepper-v1:" || CODE)
-- ---------------------------------------------------------------------------
INSERT INTO ciceron.invite_codes (
  id, code_hash, prospect_label, firm_id, default_persona_id,
  expires_at, max_uses, use_count, is_active, is_demo
) VALUES
  (
    'e3000000-0000-4000-8000-000000000001'::uuid,
    '3e88bb2a453f689e314810c301bbf790a09d5ee1afb4e0e0147dd0727c2b7f78',
    'Prospecto socio — Despacho Demo',
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'b1000000-0000-4000-8000-000000000001'::uuid,
    now() + interval '365 days',
    500,
    0,
    true,
    true
  ),
  (
    'e3000000-0000-4000-8000-000000000002'::uuid,
    'b68b3f391c07312e458cb97345b4dd4e180f77cc823f069f5c17a4acbe70938e',
    'Prospecto pasante — Despacho Demo',
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'b1000000-0000-4000-8000-000000000003'::uuid,
    now() + interval '365 days',
    500,
    0,
    true,
    true
  ),
  (
    'e3000000-0000-4000-8000-000000000003'::uuid,
    '95868f9812dc6e5aeb8c23ababc96ee53cca57197b1fcf2b83651c57efeb8a6c',
    'Prospecto asociado — Despacho Demo',
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'b1000000-0000-4000-8000-000000000002'::uuid,
    now() + interval '365 days',
    200,
    0,
    true,
    true
  ),
  (
    'e3000000-0000-4000-8000-000000000004'::uuid,
    '3d7d46baf85898b9ffe7359d1c3b91db471ebe17f38650ae1cdddc2d607ee7a4',
    'Admin interno — Despacho Demo',
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'b1000000-0000-4000-8000-000000000004'::uuid,
    now() + interval '365 days',
    50,
    0,
    true,
    true
  ),
  (
    'e3000000-0000-4000-8000-000000000005'::uuid,
    '66927b62bc2899dd6a6a4bb36acd949038513c3299c54e138b02cb6832af886b',
    'Prospecto asociada 2 — Despacho Demo',
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'b1000000-0000-4000-8000-000000000005'::uuid,
    now() + interval '365 days',
    200,
    0,
    true,
    true
  ),
  (
    'e3000000-0000-4000-8000-000000000006'::uuid,
    '84bc7bff93e0930312188e7a38861323ec663f91c30ad57049cfd9c2a052f5a3',
    'Aislamiento — Bufete Contraste',
    'a1000000-0000-4000-8000-000000000002'::uuid,
    'b1000000-0000-4000-8000-000000000011'::uuid,
    now() + interval '365 days',
    50,
    0,
    true,
    true
  )
ON CONFLICT (id) DO UPDATE
  SET code_hash = EXCLUDED.code_hash,
      prospect_label = EXCLUDED.prospect_label,
      default_persona_id = EXCLUDED.default_persona_id,
      expires_at = EXCLUDED.expires_at,
      max_uses = EXCLUDED.max_uses,
      is_active = true,
      is_demo = true,
      updated_at = now();

-- ---------------------------------------------------------------------------
-- redeem_invite — service_role only; returns session + opaque token once
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION ciceron.redeem_invite(
  p_code_hash text,
  p_token_hash text,
  p_work_email text DEFAULT NULL,
  p_session_ttl_hours int DEFAULT 24
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ciceron
AS $$
DECLARE
  inv ciceron.invite_codes%ROWTYPE;
  sess_id uuid;
  persona ciceron.demo_personas%ROWTYPE;
  ttl int := LEAST(GREATEST(COALESCE(p_session_ttl_hours, 24), 1), 168);
BEGIN
  IF p_code_hash IS NULL OR p_code_hash !~ '^[0-9a-f]{64}$' THEN
    RETURN jsonb_build_object(
      'ok', false,
      'policy_id', 'invite_hash',
      'policy_reason', 'El código de invitación no es válido.'
    );
  END IF;

  IF p_token_hash IS NULL OR p_token_hash !~ '^[0-9a-f]{64}$' THEN
    RETURN jsonb_build_object(
      'ok', false,
      'policy_id', 'invite_token',
      'policy_reason', 'No se pudo crear la sesión de demostración.'
    );
  END IF;

  SELECT * INTO inv
  FROM ciceron.invite_codes
  WHERE code_hash = p_code_hash
  FOR UPDATE;

  IF inv.id IS NULL OR inv.is_active IS NOT TRUE THEN
    RETURN jsonb_build_object(
      'ok', false,
      'policy_id', 'invite_invalid',
      'policy_reason', 'El código no es válido o ha expirado.'
    );
  END IF;

  IF inv.expires_at IS NOT NULL AND inv.expires_at < now() THEN
    RETURN jsonb_build_object(
      'ok', false,
      'policy_id', 'invite_expired',
      'policy_reason', 'El código de invitación ha expirado.'
    );
  END IF;

  IF inv.max_uses IS NOT NULL AND inv.use_count >= inv.max_uses THEN
    RETURN jsonb_build_object(
      'ok', false,
      'policy_id', 'invite_exhausted',
      'policy_reason', 'Este código ya alcanzó el máximo de usos.'
    );
  END IF;

  SELECT * INTO persona FROM ciceron.demo_personas WHERE id = inv.default_persona_id;
  IF persona.id IS NULL OR persona.firm_id <> inv.firm_id THEN
    RETURN jsonb_build_object(
      'ok', false,
      'policy_id', 'invite_persona',
      'policy_reason', 'La persona de demostración no está disponible.'
    );
  END IF;

  IF p_work_email IS NOT NULL AND length(trim(p_work_email)) = 0 THEN
    p_work_email := NULL;
  END IF;

  IF p_work_email IS NOT NULL AND p_work_email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
    RETURN jsonb_build_object(
      'ok', false,
      'policy_id', 'invite_email',
      'policy_reason', 'El correo de trabajo no tiene un formato válido.'
    );
  END IF;

  UPDATE ciceron.invite_codes
  SET use_count = use_count + 1, updated_at = now()
  WHERE id = inv.id;

  INSERT INTO ciceron.demo_sessions (
    invite_code_id, firm_id, persona_id, work_email, token_hash, expires_at, is_demo
  ) VALUES (
    inv.id, inv.firm_id, persona.id, p_work_email, p_token_hash,
    now() + make_interval(hours => ttl), true
  )
  RETURNING id INTO sess_id;

  INSERT INTO ciceron.guided_story_progress (session_id, firm_id, current_step)
  VALUES (sess_id, inv.firm_id, 1)
  ON CONFLICT (session_id) DO NOTHING;

  RETURN jsonb_build_object(
    'ok', true,
    'session_id', sess_id,
    'firm_id', inv.firm_id,
    'persona_id', persona.id,
    'role', persona.role,
    'invite_code_id', inv.id
  );
END;
$$;

COMMENT ON FUNCTION ciceron.redeem_invite(text, text, text, int) IS
  'Prompt 9: redeem hashed invite → demo_session. App hashes code+token; plaintext never reaches DB.';

REVOKE ALL ON FUNCTION ciceron.redeem_invite(text, text, text, int)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION ciceron.redeem_invite(text, text, text, int) TO service_role;

-- ---------------------------------------------------------------------------
-- resolve_demo_session — lookup by token_hash; touch last_seen
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION ciceron.resolve_demo_session(p_token_hash text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ciceron
AS $$
DECLARE
  sess ciceron.demo_sessions%ROWTYPE;
  persona ciceron.demo_personas%ROWTYPE;
  firm ciceron.firms%ROWTYPE;
BEGIN
  IF p_token_hash IS NULL OR p_token_hash !~ '^[0-9a-f]{64}$' THEN
    RETURN jsonb_build_object('ok', false, 'policy_id', 'session_token',
      'policy_reason', 'Sesión no válida.');
  END IF;

  SELECT * INTO sess FROM ciceron.demo_sessions WHERE token_hash = p_token_hash;
  IF sess.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'policy_id', 'session_missing',
      'policy_reason', 'No hay una sesión de demostración activa.');
  END IF;

  IF sess.expires_at < now() THEN
    RETURN jsonb_build_object('ok', false, 'policy_id', 'session_expired',
      'policy_reason', 'La sesión de demostración ha expirado.');
  END IF;

  UPDATE ciceron.demo_sessions SET last_seen_at = now(), updated_at = now()
  WHERE id = sess.id;

  SELECT * INTO persona FROM ciceron.demo_personas WHERE id = sess.persona_id;
  SELECT * INTO firm FROM ciceron.firms WHERE id = sess.firm_id;

  RETURN jsonb_build_object(
    'ok', true,
    'session_id', sess.id,
    'firm_id', sess.firm_id,
    'firm_name', firm.name,
    'firm_slug', firm.slug,
    'persona_id', persona.id,
    'role', persona.role,
    'display_name', persona.display_name,
    'invite_code_id', sess.invite_code_id,
    'story_dismissed', sess.story_dismissed,
    'last_freshness_at', sess.last_freshness_at,
    'work_email_present', (sess.work_email IS NOT NULL)
  );
END;
$$;

REVOKE ALL ON FUNCTION ciceron.resolve_demo_session(text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION ciceron.resolve_demo_session(text) TO service_role;

-- ---------------------------------------------------------------------------
-- switch_demo_persona — Socia / Asociado / Pasante within same firm session
-- ---------------------------------------------------------------------------
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

COMMENT ON FUNCTION ciceron.switch_demo_persona(text, uuid) IS
  'Prompt 9 demo bar: switch active persona (socio|asociado|pasante) for the session.';
