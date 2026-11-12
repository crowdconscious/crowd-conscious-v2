-- 318_ciceron_demo_access.sql
-- Prompt 9: RBAC + ABAC showcase — sensitivity, conflict walls, access grants,
-- enforcement RPCs that return Spanish policy denials + write_audit_event.
-- Additive. Requires 312 (write_audit_event) and 317. Agents do not apply.
--
-- Sensitivity / conflict / expiring grants for documents are enforced in
-- ciceron.evaluate_access (RPC), not in documents RLS. RLS remains firm-scoped.

-- ---------------------------------------------------------------------------
-- documents: sensitivity + optional matter scope (ABAC attributes)
-- ---------------------------------------------------------------------------
ALTER TABLE ciceron.documents
  ADD COLUMN IF NOT EXISTS sensitivity_level text
    CHECK (
      sensitivity_level IS NULL
      OR sensitivity_level IN ('publico', 'interno', 'confidencial', 'restringido')
    );

ALTER TABLE ciceron.documents
  ADD COLUMN IF NOT EXISTS matter_id uuid REFERENCES ciceron.matters(id) ON DELETE SET NULL;

ALTER TABLE ciceron.documents
  ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN ciceron.documents.sensitivity_level IS
  'ABAC: publico < interno < confidencial < restringido. NULL = treat as interno for firm docs. Enforced in evaluate_access RPC (not documents RLS).';
COMMENT ON COLUMN ciceron.documents.matter_id IS
  'Optional matter scope for firm-private documents (ABAC matter membership). Enforced in evaluate_access RPC.';

CREATE INDEX IF NOT EXISTS documents_matter_id_idx
  ON ciceron.documents (matter_id) WHERE matter_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS documents_sensitivity_idx
  ON ciceron.documents (sensitivity_level) WHERE sensitivity_level IS NOT NULL;

-- ---------------------------------------------------------------------------
-- client_conflicts — conflict wall between clients in a firm
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ciceron.client_conflicts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL REFERENCES ciceron.firms(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES ciceron.clients(id) ON DELETE CASCADE,
  blocked_client_id uuid NOT NULL REFERENCES ciceron.clients(id) ON DELETE CASCADE,
  reason text NOT NULL CHECK (char_length(reason) BETWEEN 1 AND 400),
  is_active boolean NOT NULL DEFAULT true,
  is_demo boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (client_id <> blocked_client_id),
  UNIQUE (firm_id, client_id, blocked_client_id)
);

COMMENT ON TABLE ciceron.client_conflicts IS
  'ABAC conflict wall: actor assigned to client_id cannot access blocked_client_id materials. Enforced in evaluate_access.';

DROP TRIGGER IF EXISTS client_conflicts_set_updated_at ON ciceron.client_conflicts;
CREATE TRIGGER client_conflicts_set_updated_at
  BEFORE UPDATE ON ciceron.client_conflicts
  FOR EACH ROW EXECUTE FUNCTION ciceron.set_updated_at();

ALTER TABLE ciceron.client_conflicts ENABLE ROW LEVEL SECURITY;
ALTER TABLE ciceron.client_conflicts FORCE ROW LEVEL SECURITY;
REVOKE ALL ON ciceron.client_conflicts FROM PUBLIC, anon, authenticated;
GRANT SELECT ON ciceron.client_conflicts TO authenticated;
GRANT ALL ON ciceron.client_conflicts TO service_role;

DROP POLICY IF EXISTS client_conflicts_select ON ciceron.client_conflicts;
CREATE POLICY client_conflicts_select ON ciceron.client_conflicts
  FOR SELECT TO authenticated
  USING (firm_id IN (SELECT ciceron.firms_of_current_user()));

-- ---------------------------------------------------------------------------
-- access_grants — time-expiring attribute grants
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ciceron.access_grants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL REFERENCES ciceron.firms(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  resource_type text NOT NULL CHECK (resource_type IN ('document', 'matter', 'client', 'action')),
  resource_id uuid,
  permission text NOT NULL CHECK (
    permission IN ('read', 'write', 'confirm_deadline', 'approve_review', 'open_sensitive')
  ),
  expires_at timestamptz,
  granted_by uuid,
  reason text CHECK (reason IS NULL OR char_length(reason) BETWEEN 1 AND 400),
  is_demo boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS access_grants_user_idx
  ON ciceron.access_grants (firm_id, user_id);
CREATE INDEX IF NOT EXISTS access_grants_resource_idx
  ON ciceron.access_grants (resource_type, resource_id);

COMMENT ON TABLE ciceron.access_grants IS
  'ABAC: time-bound grants. expires_at NULL = until revoked. Enforcement in evaluate_access RPC (not documents RLS).';

DROP TRIGGER IF EXISTS access_grants_set_updated_at ON ciceron.access_grants;
CREATE TRIGGER access_grants_set_updated_at
  BEFORE UPDATE ON ciceron.access_grants
  FOR EACH ROW EXECUTE FUNCTION ciceron.set_updated_at();

ALTER TABLE ciceron.access_grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE ciceron.access_grants FORCE ROW LEVEL SECURITY;
REVOKE ALL ON ciceron.access_grants FROM PUBLIC, anon, authenticated;
GRANT SELECT ON ciceron.access_grants TO authenticated;
GRANT ALL ON ciceron.access_grants TO service_role;

DROP POLICY IF EXISTS access_grants_select ON ciceron.access_grants;
CREATE POLICY access_grants_select ON ciceron.access_grants
  FOR SELECT TO authenticated
  USING (
    firm_id IN (SELECT ciceron.firms_of_current_user())
    AND (
      user_id = ciceron.current_actor_id()
      OR EXISTS (
        SELECT 1 FROM ciceron.memberships m
        WHERE m.firm_id = access_grants.firm_id
          AND m.user_id = ciceron.current_actor_id()
          AND m.role IN ('admin', 'socio')
      )
    )
  );

-- ---------------------------------------------------------------------------
-- Helper: role rank for RBAC
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION ciceron.role_rank(p_role text)
RETURNS int
LANGUAGE sql
IMMUTABLE
SET search_path = ciceron
AS $$
  SELECT CASE p_role
    WHEN 'pasante' THEN 1
    WHEN 'asociado' THEN 2
    WHEN 'socio' THEN 3
    WHEN 'admin' THEN 3
    ELSE 0
  END;
$$;

REVOKE ALL ON FUNCTION ciceron.role_rank(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION ciceron.role_rank(text) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- evaluate_access — RBAC + ABAC; writes denial audit; returns jsonb
-- Membership denial is audited BEFORE set_actor (set_actor raises for unknown actors).
-- p_simulated_by: when set, audit rows use that actor id and payload.simulated_by.
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS ciceron.evaluate_access(uuid, uuid, text, text, uuid, uuid, uuid, boolean);
DROP FUNCTION IF EXISTS ciceron.evaluate_access(uuid, uuid, text, text, uuid, uuid, uuid, boolean, uuid);

CREATE OR REPLACE FUNCTION ciceron.evaluate_access(
  p_actor uuid,
  p_firm_id uuid,
  p_action text,
  p_resource_type text DEFAULT NULL,
  p_resource_id uuid DEFAULT NULL,
  p_client_id uuid DEFAULT NULL,
  p_matter_id uuid DEFAULT NULL,
  p_log boolean DEFAULT true,
  p_simulated_by uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ciceron
AS $$
DECLARE
  actor_role text;
  policy_id text;
  policy_reason text;
  doc ciceron.documents%ROWTYPE;
  sens text;
  grant_ok boolean;
  conflict_hit boolean;
  model text; -- 'rbac' | 'abac'
  audit_user uuid;
  audit_payload jsonb;
  abac_persona uuid := 'e3000000-0000-4000-8000-000000000010'::uuid;
  matter_assigned boolean;
BEGIN
  IF p_actor IS NULL OR p_firm_id IS NULL OR p_action IS NULL THEN
    RETURN jsonb_build_object(
      'ok', false,
      'policy_id', 'access_args',
      'policy_reason', 'Faltan parámetros de evaluación de acceso.'
    );
  END IF;

  audit_user := COALESCE(p_simulated_by, p_actor);
  audit_payload := jsonb_build_object('action', p_action);
  IF p_simulated_by IS NOT NULL THEN
    audit_payload := audit_payload || jsonb_build_object(
      'simulated_by', p_simulated_by,
      'simulated_actor', p_actor
    );
  END IF;

  -- Membership check BEFORE set_actor so non-members are audited (set_actor would raise).
  SELECT ms.role INTO actor_role
  FROM ciceron.memberships ms
  WHERE ms.firm_id = p_firm_id AND ms.user_id = p_actor;

  IF actor_role IS NULL THEN
    policy_id := 'rbac_membership';
    policy_reason := 'El actor no es miembro de este despacho.';
    model := 'rbac';
    IF p_log THEN
      PERFORM ciceron.write_audit_event(
        p_firm_id, audit_user, 'access_denied', COALESCE(p_resource_type, 'firm'), p_resource_id,
        audit_payload || jsonb_build_object('model', model),
        'denied', policy_id, policy_reason,
        jsonb_build_object('entity_type', COALESCE(p_resource_type, 'firm'), 'entity_id', p_resource_id)
      );
    END IF;
    RETURN jsonb_build_object(
      'ok', false, 'policy_id', policy_id, 'policy_reason', policy_reason, 'model', model
    );
  END IF;

  PERFORM ciceron.set_actor(p_actor);

  -- ---- RBAC: role gates for approve_review / confirm_deadline ----
  IF p_action IN ('approve_review', 'confirm_deadline', 'deliver_client') THEN
    model := 'rbac';
    IF ciceron.role_rank(actor_role) < ciceron.role_rank('asociado') THEN
      policy_id := 'rbac_role';
      policy_reason := CASE p_action
        WHEN 'approve_review' THEN
          'Solo socio, asociado o administrador puede aprobar una revisión (RBAC: rol).'
        WHEN 'confirm_deadline' THEN
          'Solo socio, asociado o administrador puede confirmar un plazo (RBAC: rol).'
        ELSE
          'Solo socio, asociado o administrador puede registrar una entrega al cliente (RBAC: rol).'
      END;
      IF p_log THEN
        PERFORM ciceron.write_audit_event(
          p_firm_id, audit_user, 'access_denied', COALESCE(p_resource_type, 'action'), p_resource_id,
          audit_payload || jsonb_build_object('actor_role', actor_role, 'model', 'rbac'),
          'denied', policy_id, policy_reason,
          jsonb_build_object('entity_type', COALESCE(p_resource_type, 'action'), 'entity_id', p_resource_id)
        );
      END IF;
      RETURN jsonb_build_object(
        'ok', false, 'policy_id', policy_id, 'policy_reason', policy_reason,
        'model', 'rbac', 'actor_role', actor_role
      );
    END IF;
  END IF;

  -- ---- ABAC: conflict wall ----
  IF p_client_id IS NOT NULL THEN
    model := 'abac';
    SELECT EXISTS (
      SELECT 1
      FROM ciceron.client_conflicts cc
      JOIN ciceron.matters m ON m.client_id = cc.client_id AND m.firm_id = cc.firm_id
      JOIN ciceron.matter_members mm ON mm.matter_id = m.id AND mm.user_id = p_actor
      WHERE cc.firm_id = p_firm_id
        AND cc.is_active
        AND cc.blocked_client_id = p_client_id
    ) INTO conflict_hit;

    IF conflict_hit THEN
      policy_id := 'abac_conflict_wall';
      policy_reason :=
        'Muro de conflicto: usted está asignado a un cliente en conflicto con este cliente (ABAC: atributo de conflicto).';
      IF p_log THEN
        PERFORM ciceron.write_audit_event(
          p_firm_id, audit_user, 'access_denied', 'client', p_client_id,
          audit_payload || jsonb_build_object('model', 'abac'),
          'denied', policy_id, policy_reason,
          jsonb_build_object('entity_type', 'client', 'entity_id', p_client_id)
        );
      END IF;
      RETURN jsonb_build_object(
        'ok', false, 'policy_id', policy_id, 'policy_reason', policy_reason,
        'model', 'abac', 'actor_role', actor_role
      );
    END IF;
  END IF;

  -- ---- ABAC: matter assignment for pasante + ABAC showcase persona ----
  -- Do NOT use is_matter_member for these actors: firm-wide asociado/socio
  -- short-circuits matter assignment and would hide the ABAC branch.
  IF p_matter_id IS NOT NULL AND (actor_role = 'pasante' OR p_actor = abac_persona) THEN
    model := 'abac';
    SELECT EXISTS (
      SELECT 1 FROM ciceron.matter_members mm
      WHERE mm.matter_id = p_matter_id AND mm.user_id = p_actor
    ) INTO matter_assigned;

    IF NOT matter_assigned THEN
      policy_id := 'abac_matter_assignment';
      policy_reason :=
        'No tiene asignación a este asunto (ABAC: atributo de membresía del asunto).';
      IF p_log THEN
        PERFORM ciceron.write_audit_event(
          p_firm_id, audit_user, 'access_denied', 'matter', p_matter_id,
          audit_payload || jsonb_build_object('model', 'abac'),
          'denied', policy_id, policy_reason,
          jsonb_build_object('entity_type', 'matter', 'entity_id', p_matter_id)
        );
      END IF;
      RETURN jsonb_build_object(
        'ok', false, 'policy_id', policy_id, 'policy_reason', policy_reason,
        'model', 'abac', 'actor_role', actor_role
      );
    END IF;
  END IF;

  -- ---- ABAC: document sensitivity + expiring grants ----
  IF p_resource_type = 'document' AND p_resource_id IS NOT NULL THEN
    model := 'abac';
    SELECT * INTO doc FROM ciceron.documents WHERE id = p_resource_id;
    IF doc.id IS NULL OR (doc.firm_id IS NOT NULL AND doc.firm_id <> p_firm_id) THEN
      policy_id := 'abac_document_missing';
      policy_reason := 'El documento no existe en este despacho.';
      IF p_log THEN
        PERFORM ciceron.write_audit_event(
          p_firm_id, audit_user, 'access_denied', 'document', p_resource_id,
          audit_payload || jsonb_build_object('model', 'abac'),
          'denied', policy_id, policy_reason,
          jsonb_build_object('entity_type', 'document', 'entity_id', p_resource_id)
        );
      END IF;
      RETURN jsonb_build_object(
        'ok', false, 'policy_id', policy_id, 'policy_reason', policy_reason, 'model', 'abac'
      );
    END IF;

    sens := COALESCE(doc.sensitivity_level, 'interno');

    IF sens IN ('confidencial', 'restringido') AND actor_role <> 'socio' AND actor_role <> 'admin' THEN
      SELECT EXISTS (
        SELECT 1 FROM ciceron.access_grants g
        WHERE g.firm_id = p_firm_id
          AND g.user_id = p_actor
          AND g.resource_type = 'document'
          AND g.resource_id = p_resource_id
          AND g.permission IN ('read', 'open_sensitive')
          AND (g.expires_at IS NULL OR g.expires_at > now())
      ) INTO grant_ok;

      IF NOT grant_ok THEN
        IF EXISTS (
          SELECT 1 FROM ciceron.access_grants g
          WHERE g.firm_id = p_firm_id
            AND g.user_id = p_actor
            AND g.resource_type = 'document'
            AND g.resource_id = p_resource_id
            AND g.permission IN ('read', 'open_sensitive')
            AND g.expires_at IS NOT NULL
            AND g.expires_at <= now()
        ) THEN
          policy_id := 'abac_grant_expired';
          policy_reason :=
            'El permiso temporal para este documento ya expiró (ABAC: concesión con vigencia).';
        ELSE
          policy_id := 'abac_sensitivity';
          policy_reason :=
            'Nivel de sensibilidad «' || sens || '»: se requiere una concesión de acceso vigente (ABAC: sensibilidad).';
        END IF;

        IF p_log THEN
          PERFORM ciceron.write_audit_event(
            p_firm_id, audit_user, 'access_denied', 'document', p_resource_id,
            audit_payload || jsonb_build_object(
              'model', 'abac', 'sensitivity', sens
            ),
            'denied', policy_id, policy_reason,
            jsonb_build_object('entity_type', 'document', 'entity_id', p_resource_id)
          );
        END IF;
        RETURN jsonb_build_object(
          'ok', false, 'policy_id', policy_id, 'policy_reason', policy_reason,
          'model', 'abac', 'sensitivity', sens, 'actor_role', actor_role
        );
      END IF;
    END IF;
  END IF;

  -- Allowed
  model := COALESCE(model, CASE
    WHEN p_action IN ('approve_review', 'confirm_deadline', 'deliver_client') THEN 'rbac'
    ELSE 'abac'
  END);

  IF p_log THEN
    PERFORM ciceron.write_audit_event(
      p_firm_id, audit_user, 'access_allowed', COALESCE(p_resource_type, 'action'), p_resource_id,
      audit_payload || jsonb_build_object('model', model, 'actor_role', actor_role),
      'allowed', NULL, NULL,
      jsonb_build_object('entity_type', COALESCE(p_resource_type, 'action'), 'entity_id', p_resource_id)
    );
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'model', model,
    'actor_role', actor_role,
    'policy_id', NULL,
    'policy_reason', NULL
  );
END;
$$;

COMMENT ON FUNCTION ciceron.evaluate_access(uuid, uuid, text, text, uuid, uuid, uuid, boolean, uuid) IS
  'Prompt 9: RBAC+ABAC evaluation. Denials commit audit via write_audit_event then return jsonb. Document sensitivity/conflict are RPC-enforced.';

REVOKE ALL ON FUNCTION ciceron.evaluate_access(uuid, uuid, text, text, uuid, uuid, uuid, boolean, uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION ciceron.evaluate_access(uuid, uuid, text, text, uuid, uuid, uuid, boolean, uuid)
  TO service_role;

-- ---------------------------------------------------------------------------
-- try_access_demo — explainer panel: run allowed + denied pairs
-- p_caller = real session persona; used as p_simulated_by on every simulated
-- evaluate_access call (when the evaluated actor differs from the caller).
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS ciceron.try_access_demo(uuid, uuid, text);
DROP FUNCTION IF EXISTS ciceron.try_access_demo(uuid, uuid, text, uuid);

CREATE OR REPLACE FUNCTION ciceron.try_access_demo(
  p_actor uuid,
  p_firm_id uuid,
  p_scenario text,
  p_caller uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ciceron
AS $$
DECLARE
  allowed_res jsonb;
  denied_res jsonb;
  doc_ok uuid := 'e3000000-0000-4000-8000-000000000021'::uuid;
  doc_sens uuid := 'e3000000-0000-4000-8000-000000000022'::uuid;
  doc_expired uuid := 'e3000000-0000-4000-8000-000000000023'::uuid;
  matter_nexora uuid := 'd1000000-0000-4000-8000-000000000001'::uuid;
  matter_viento uuid := 'd1000000-0000-4000-8000-000000000004'::uuid;
  client_farma uuid := 'c1000000-0000-4000-8000-000000000002'::uuid;
  pasante uuid := 'b1000000-0000-4000-8000-000000000003'::uuid;
  sim_by uuid;
BEGIN
  -- Real session persona for audit attribution on simulated evaluations.
  sim_by := COALESCE(p_caller, p_actor);

  IF p_scenario = 'rbac' THEN
    allowed_res := ciceron.evaluate_access(
      p_actor, p_firm_id, 'approve_review', 'review_tasks', NULL, NULL, matter_nexora, true,
      CASE WHEN sim_by IS DISTINCT FROM p_actor THEN sim_by ELSE NULL END
    );
    -- Denial simulated as pasante; always attribute the real caller.
    denied_res := ciceron.evaluate_access(
      pasante, p_firm_id, 'approve_review', 'review_tasks', NULL, NULL, matter_nexora, true, sim_by
    );
    RETURN jsonb_build_object(
      'ok', true,
      'scenario', 'rbac',
      'allowed', allowed_res,
      'denied', denied_res,
      'explainer',
        'RBAC decide por rol: la socia puede aprobar; el pasante no, aunque comparta el asunto.'
    );
  ELSIF p_scenario = 'abac' THEN
    allowed_res := ciceron.evaluate_access(
      p_actor, p_firm_id, 'read', 'document', doc_ok, NULL, matter_nexora, true,
      CASE WHEN sim_by IS DISTINCT FROM p_actor THEN sim_by ELSE NULL END
    );
    denied_res := ciceron.evaluate_access(
      p_actor, p_firm_id, 'read', 'document', doc_expired,
      client_farma, matter_viento, true,
      CASE WHEN sim_by IS DISTINCT FROM p_actor THEN sim_by ELSE NULL END
    );
    IF COALESCE(denied_res->>'ok', 'true') = 'true' THEN
      denied_res := ciceron.evaluate_access(
        p_actor, p_firm_id, 'read', 'document', doc_sens,
        NULL, matter_nexora, true,
        CASE WHEN sim_by IS DISTINCT FROM p_actor THEN sim_by ELSE NULL END
      );
    END IF;
    RETURN jsonb_build_object(
      'ok', true,
      'scenario', 'abac',
      'allowed', allowed_res,
      'denied', denied_res,
      'explainer',
        'ABAC decide por atributos: asignación al asunto, muro de conflicto, sensibilidad y vigencia del permiso.'
    );
  ELSE
    RETURN jsonb_build_object(
      'ok', false,
      'policy_id', 'demo_scenario',
      'policy_reason', 'Escenario de demostración desconocido.'
    );
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION ciceron.try_access_demo(uuid, uuid, text, uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION ciceron.try_access_demo(uuid, uuid, text, uuid) TO service_role;

-- ---------------------------------------------------------------------------
-- Seed: ABAC persona + docs + conflict + grants (e3 prefix)
-- Persona invite_code is a non-redeemable unique placeholder (no public invite seed).
-- ---------------------------------------------------------------------------
INSERT INTO ciceron.demo_personas (id, firm_id, role, display_name, invite_code, is_demo)
VALUES (
  'e3000000-0000-4000-8000-000000000010'::uuid,
  'a1000000-0000-4000-8000-000000000001'::uuid,
  'asociado',
  'Asociada Atributos Vega',
  'nr-e3000000000000000000000000000010',
  true
)
ON CONFLICT (id) DO UPDATE
  SET display_name = EXCLUDED.display_name,
      role = EXCLUDED.role,
      invite_code = EXCLUDED.invite_code,
      is_demo = true;

INSERT INTO ciceron.memberships (firm_id, user_id, role)
VALUES (
  'a1000000-0000-4000-8000-000000000001'::uuid,
  'e3000000-0000-4000-8000-000000000010'::uuid,
  'asociado'
)
ON CONFLICT (firm_id, user_id) DO UPDATE SET role = EXCLUDED.role;

-- Matter assignment: only Nexora CNBV (not Farma / Viento)
INSERT INTO ciceron.matter_members (matter_id, user_id, role)
VALUES (
  'd1000000-0000-4000-8000-000000000001'::uuid,
  'e3000000-0000-4000-8000-000000000010'::uuid,
  'apoyo'
)
ON CONFLICT (matter_id, user_id) DO NOTHING;

-- Conflict: assigned to Nexora → wall against Farma
INSERT INTO ciceron.client_conflicts (
  id, firm_id, client_id, blocked_client_id, reason, is_active, is_demo
) VALUES (
  'e3000000-0000-4000-8000-000000000030'::uuid,
  'a1000000-0000-4000-8000-000000000001'::uuid,
  'c1000000-0000-4000-8000-000000000001'::uuid,
  'c1000000-0000-4000-8000-000000000002'::uuid,
  'Datos de demostración. Muro de conflicto Nexora ↔ Farma Sierra.',
  true,
  true
)
ON CONFLICT (firm_id, client_id, blocked_client_id) DO UPDATE
  SET reason = EXCLUDED.reason, is_active = true, is_demo = true;

-- Sample firm documents
INSERT INTO ciceron.documents (
  id, canonical_id, doc_type, title, firm_id, matter_id, sensitivity_level, is_demo
) VALUES
  (
    'e3000000-0000-4000-8000-000000000021'::uuid,
    'demo-doc-interno-nexora',
    'memo_interno',
    'Memorando interno Nexora (demostración)',
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000001'::uuid,
    'interno',
    true
  ),
  (
    'e3000000-0000-4000-8000-000000000022'::uuid,
    'demo-doc-restringido-nexora',
    'opinion_legal',
    'Opinión restringida Nexora (demostración)',
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000001'::uuid,
    'restringido',
    true
  ),
  (
    'e3000000-0000-4000-8000-000000000023'::uuid,
    'demo-doc-confidencial-expired',
    'contrato',
    'Contrato confidencial con permiso vencido (demostración)',
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000001'::uuid,
    'confidencial',
    true
  )
ON CONFLICT (id) DO UPDATE
  SET title = EXCLUDED.title,
      sensitivity_level = EXCLUDED.sensitivity_level,
      matter_id = EXCLUDED.matter_id,
      is_demo = true;

-- Live grant for restricted doc (ABAC persona)
INSERT INTO ciceron.access_grants (
  id, firm_id, user_id, resource_type, resource_id, permission,
  expires_at, granted_by, reason, is_demo
) VALUES (
  'e3000000-0000-4000-8000-000000000040'::uuid,
  'a1000000-0000-4000-8000-000000000001'::uuid,
  'e3000000-0000-4000-8000-000000000010'::uuid,
  'document',
  'e3000000-0000-4000-8000-000000000022'::uuid,
  'open_sensitive',
  now() + interval '7 days',
  'b1000000-0000-4000-8000-000000000001'::uuid,
  'Datos de demostración. Concesión vigente para opinión restringida.',
  true
)
ON CONFLICT (id) DO UPDATE
  SET expires_at = EXCLUDED.expires_at,
      permission = EXCLUDED.permission,
      is_demo = true;

-- Expired grant for confidential doc
INSERT INTO ciceron.access_grants (
  id, firm_id, user_id, resource_type, resource_id, permission,
  expires_at, granted_by, reason, is_demo
) VALUES (
  'e3000000-0000-4000-8000-000000000041'::uuid,
  'a1000000-0000-4000-8000-000000000001'::uuid,
  'e3000000-0000-4000-8000-000000000010'::uuid,
  'document',
  'e3000000-0000-4000-8000-000000000023'::uuid,
  'open_sensitive',
  now() - interval '2 days',
  'b1000000-0000-4000-8000-000000000001'::uuid,
  'Datos de demostración. Concesión expirada a propósito.',
  true
)
ON CONFLICT (id) DO UPDATE
  SET expires_at = EXCLUDED.expires_at,
      is_demo = true;

-- No invite_codes row for the ABAC persona: non-public invites are not seeded.
