-- 331: Match assignments + comments (additive only).
-- Does NOT alter existing tables, functions, or policies.
-- New tables: match_assignments, match_comments.
-- Access is matter-scoped via is_matter_member; denials audited in RPCs.
-- Apply by CTO after review. Agents must not apply to any database.

-- ---------------------------------------------------------------------------
-- match_assignments
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ciceron.match_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL REFERENCES ciceron.firms(id) ON DELETE CASCADE,
  match_id uuid NOT NULL REFERENCES ciceron.matches(id) ON DELETE CASCADE,
  matter_id uuid NOT NULL REFERENCES ciceron.matters(id) ON DELETE CASCADE,
  assignee_actor uuid NOT NULL,
  assigned_by_actor uuid NOT NULL,
  due_at date,
  status text NOT NULL DEFAULT 'pendiente'
    CHECK (status IN ('pendiente', 'en_curso', 'hecho')),
  is_demo boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (match_id, assignee_actor)
);

CREATE INDEX IF NOT EXISTS match_assignments_firm_id_idx
  ON ciceron.match_assignments (firm_id);
CREATE INDEX IF NOT EXISTS match_assignments_assignee_idx
  ON ciceron.match_assignments (assignee_actor, status);
CREATE INDEX IF NOT EXISTS match_assignments_matter_id_idx
  ON ciceron.match_assignments (matter_id);
CREATE INDEX IF NOT EXISTS match_assignments_match_id_idx
  ON ciceron.match_assignments (match_id);

COMMENT ON TABLE ciceron.match_assignments IS
  'DOF match work assignments. Matter-scoped; pasantes only see matters they belong to.';
COMMENT ON COLUMN ciceron.match_assignments.assignee_actor IS
  'Actor id (auth.users or demo_personas) matching memberships.user_id.';
COMMENT ON COLUMN ciceron.match_assignments.status IS
  'pendiente | en_curso | hecho';

ALTER TABLE ciceron.match_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE ciceron.match_assignments FORCE ROW LEVEL SECURITY;
REVOKE ALL ON ciceron.match_assignments FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE ON ciceron.match_assignments TO authenticated;
GRANT ALL ON ciceron.match_assignments TO service_role;

DROP POLICY IF EXISTS match_assignments_select ON ciceron.match_assignments;
CREATE POLICY match_assignments_select ON ciceron.match_assignments
  FOR SELECT TO authenticated
  USING (
    firm_id IN (SELECT ciceron.firms_of_current_user())
    AND ciceron.is_matter_member(matter_id)
  );

DROP POLICY IF EXISTS match_assignments_insert ON ciceron.match_assignments;
CREATE POLICY match_assignments_insert ON ciceron.match_assignments
  FOR INSERT TO authenticated
  WITH CHECK (
    firm_id IN (SELECT ciceron.firms_of_current_user())
    AND ciceron.is_matter_member(matter_id)
  );

DROP POLICY IF EXISTS match_assignments_update ON ciceron.match_assignments;
CREATE POLICY match_assignments_update ON ciceron.match_assignments
  FOR UPDATE TO authenticated
  USING (
    firm_id IN (SELECT ciceron.firms_of_current_user())
    AND ciceron.is_matter_member(matter_id)
  )
  WITH CHECK (
    firm_id IN (SELECT ciceron.firms_of_current_user())
    AND ciceron.is_matter_member(matter_id)
  );

DROP TRIGGER IF EXISTS match_assignments_set_updated_at ON ciceron.match_assignments;
CREATE TRIGGER match_assignments_set_updated_at
  BEFORE UPDATE ON ciceron.match_assignments
  FOR EACH ROW EXECUTE FUNCTION ciceron.set_updated_at();

-- ---------------------------------------------------------------------------
-- match_comments
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ciceron.match_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL REFERENCES ciceron.firms(id) ON DELETE CASCADE,
  match_id uuid NOT NULL REFERENCES ciceron.matches(id) ON DELETE CASCADE,
  matter_id uuid NOT NULL REFERENCES ciceron.matters(id) ON DELETE CASCADE,
  author_actor uuid NOT NULL,
  body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 8000),
  mentions uuid[] NOT NULL DEFAULT '{}'::uuid[],
  created_at timestamptz NOT NULL DEFAULT now(),
  edited_at timestamptz,
  deleted_at timestamptz,
  is_demo boolean NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS match_comments_match_id_idx
  ON ciceron.match_comments (match_id, created_at);
CREATE INDEX IF NOT EXISTS match_comments_firm_id_idx
  ON ciceron.match_comments (firm_id);
CREATE INDEX IF NOT EXISTS match_comments_matter_id_idx
  ON ciceron.match_comments (matter_id);
CREATE INDEX IF NOT EXISTS match_comments_author_idx
  ON ciceron.match_comments (author_actor);

COMMENT ON TABLE ciceron.match_comments IS
  'Threaded comments on DOF matches. Soft-delete via deleted_at. Matter-scoped.';
COMMENT ON COLUMN ciceron.match_comments.mentions IS
  'Firm member actor ids @mentioned in body (resolved at write time).';

ALTER TABLE ciceron.match_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE ciceron.match_comments FORCE ROW LEVEL SECURITY;
REVOKE ALL ON ciceron.match_comments FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE ON ciceron.match_comments TO authenticated;
GRANT ALL ON ciceron.match_comments TO service_role;

DROP POLICY IF EXISTS match_comments_select ON ciceron.match_comments;
CREATE POLICY match_comments_select ON ciceron.match_comments
  FOR SELECT TO authenticated
  USING (
    firm_id IN (SELECT ciceron.firms_of_current_user())
    AND ciceron.is_matter_member(matter_id)
    AND deleted_at IS NULL
  );

DROP POLICY IF EXISTS match_comments_insert ON ciceron.match_comments;
CREATE POLICY match_comments_insert ON ciceron.match_comments
  FOR INSERT TO authenticated
  WITH CHECK (
    firm_id IN (SELECT ciceron.firms_of_current_user())
    AND ciceron.is_matter_member(matter_id)
    AND author_actor = ciceron.current_actor_id()
  );

DROP POLICY IF EXISTS match_comments_update ON ciceron.match_comments;
CREATE POLICY match_comments_update ON ciceron.match_comments
  FOR UPDATE TO authenticated
  USING (
    firm_id IN (SELECT ciceron.firms_of_current_user())
    AND ciceron.is_matter_member(matter_id)
    AND author_actor = ciceron.current_actor_id()
  )
  WITH CHECK (
    firm_id IN (SELECT ciceron.firms_of_current_user())
    AND ciceron.is_matter_member(matter_id)
    AND author_actor = ciceron.current_actor_id()
  );

-- ---------------------------------------------------------------------------
-- Helper: resolve firm + client from a match (new function only)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION ciceron.match_firm_client(p_match_id uuid)
RETURNS TABLE (firm_id uuid, client_id uuid, watch_profile_id uuid)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ciceron
AS $$
  SELECT c.firm_id, c.id AS client_id, wp.id AS watch_profile_id
  FROM ciceron.matches mt
  JOIN ciceron.watch_profiles wp ON wp.id = mt.watch_profile_id
  JOIN ciceron.clients c ON c.id = wp.client_id
  WHERE mt.id = p_match_id;
$$;

REVOKE ALL ON FUNCTION ciceron.match_firm_client(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION ciceron.match_firm_client(uuid) TO service_role;

-- ---------------------------------------------------------------------------
-- RPC: assign_match — audits denials; service_role only (demo uses admin client)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION ciceron.assign_match(
  p_firm_id uuid,
  p_match_id uuid,
  p_actor uuid,
  p_assignee uuid,
  p_matter_id uuid,
  p_due_at date DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ciceron
AS $$
DECLARE
  actor_role text;
  match_firm uuid;
  matter_firm uuid;
  matter_client uuid;
  match_client uuid;
  new_id uuid;
BEGIN
  SELECT ms.role INTO actor_role
  FROM ciceron.memberships ms
  WHERE ms.firm_id = p_firm_id AND ms.user_id = p_actor;

  IF actor_role IS NULL THEN
    PERFORM ciceron.write_audit_event(
      p_firm_id, p_actor, 'match_assign', 'match_assignments', p_match_id,
      jsonb_build_object('assignee', p_assignee, 'matter_id', p_matter_id),
      'denied', 'rbac_membership',
      'El actor no es miembro del despacho.',
      jsonb_build_object('entity_type', 'matches', 'entity_id', p_match_id)
    );
    RETURN jsonb_build_object(
      'ok', false, 'policy_id', 'rbac_membership',
      'policy_reason', 'El actor no es miembro del despacho.'
    );
  END IF;

  SELECT fc.firm_id, fc.client_id INTO match_firm, match_client
  FROM ciceron.match_firm_client(p_match_id) fc;

  IF match_firm IS NULL OR match_firm <> p_firm_id THEN
    PERFORM ciceron.write_audit_event(
      p_firm_id, p_actor, 'match_assign', 'match_assignments', p_match_id,
      jsonb_build_object('assignee', p_assignee),
      'denied', 'tenant_match',
      'La coincidencia no pertenece a este despacho.',
      jsonb_build_object('entity_type', 'matches', 'entity_id', p_match_id)
    );
    RETURN jsonb_build_object(
      'ok', false, 'policy_id', 'tenant_match',
      'policy_reason', 'La coincidencia no pertenece a este despacho.'
    );
  END IF;

  SELECT m.firm_id, m.client_id INTO matter_firm, matter_client
  FROM ciceron.matters m WHERE m.id = p_matter_id;

  IF matter_firm IS NULL OR matter_firm <> p_firm_id OR matter_client <> match_client THEN
    PERFORM ciceron.write_audit_event(
      p_firm_id, p_actor, 'match_assign', 'match_assignments', p_match_id,
      jsonb_build_object('matter_id', p_matter_id),
      'denied', 'matter_client',
      'El asunto no corresponde al cliente de esta coincidencia.',
      jsonb_build_object('entity_type', 'matters', 'entity_id', p_matter_id)
    );
    RETURN jsonb_build_object(
      'ok', false, 'policy_id', 'matter_client',
      'policy_reason', 'El asunto no corresponde al cliente de esta coincidencia.'
    );
  END IF;

  -- Actor must be able to see the matter (pasante wall)
  IF NOT ciceron.is_matter_member(p_matter_id) THEN
    -- is_matter_member uses current_actor_id(); set via set_actor before call in app.
    -- Fallback check against memberships / matter_members for p_actor:
    IF NOT (
      actor_role IN ('socio', 'asociado', 'admin')
      OR EXISTS (
        SELECT 1 FROM ciceron.matter_members mm
        WHERE mm.matter_id = p_matter_id AND mm.user_id = p_actor
      )
    ) THEN
      PERFORM ciceron.write_audit_event(
        p_firm_id, p_actor, 'match_assign', 'match_assignments', p_match_id,
        jsonb_build_object('matter_id', p_matter_id),
        'denied', 'matter_member',
        'Actor is not a member of this matter',
        jsonb_build_object('entity_type', 'matters', 'entity_id', p_matter_id)
      );
      RETURN jsonb_build_object(
        'ok', false, 'policy_id', 'matter_member',
        'policy_reason', 'Actor is not a member of this matter'
      );
    END IF;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM ciceron.memberships ms
    WHERE ms.firm_id = p_firm_id AND ms.user_id = p_assignee
  ) THEN
    PERFORM ciceron.write_audit_event(
      p_firm_id, p_actor, 'match_assign', 'match_assignments', p_match_id,
      jsonb_build_object('assignee', p_assignee),
      'denied', 'rbac_assignee_firm',
      'El asignado debe ser miembro del mismo despacho.',
      jsonb_build_object('entity_type', 'matches', 'entity_id', p_match_id)
    );
    RETURN jsonb_build_object(
      'ok', false, 'policy_id', 'rbac_assignee_firm',
      'policy_reason', 'El asignado debe ser miembro del mismo despacho.'
    );
  END IF;

  -- Assignee must also be able to access the matter (pasante wall for assignee)
  IF NOT (
    EXISTS (
      SELECT 1 FROM ciceron.memberships ms
      WHERE ms.firm_id = p_firm_id AND ms.user_id = p_assignee
        AND ms.role IN ('socio', 'asociado', 'admin')
    )
    OR EXISTS (
      SELECT 1 FROM ciceron.matter_members mm
      WHERE mm.matter_id = p_matter_id AND mm.user_id = p_assignee
    )
  ) THEN
    PERFORM ciceron.write_audit_event(
      p_firm_id, p_actor, 'match_assign', 'match_assignments', p_match_id,
      jsonb_build_object('assignee', p_assignee, 'matter_id', p_matter_id),
      'denied', 'assignee_matter_member',
      'El asignado no tiene acceso a este asunto.',
      jsonb_build_object('entity_type', 'matters', 'entity_id', p_matter_id)
    );
    RETURN jsonb_build_object(
      'ok', false, 'policy_id', 'assignee_matter_member',
      'policy_reason', 'El asignado no tiene acceso a este asunto.'
    );
  END IF;

  INSERT INTO ciceron.match_assignments (
    firm_id, match_id, matter_id, assignee_actor, assigned_by_actor, due_at, status
  ) VALUES (
    p_firm_id, p_match_id, p_matter_id, p_assignee, p_actor, p_due_at, 'pendiente'
  )
  ON CONFLICT (match_id, assignee_actor) DO UPDATE
    SET matter_id = EXCLUDED.matter_id,
        assigned_by_actor = EXCLUDED.assigned_by_actor,
        due_at = EXCLUDED.due_at,
        status = CASE
          WHEN ciceron.match_assignments.status = 'hecho' THEN 'pendiente'
          ELSE ciceron.match_assignments.status
        END,
        updated_at = now()
  RETURNING id INTO new_id;

  PERFORM ciceron.write_audit_event(
    p_firm_id, p_actor, 'match_assign', 'match_assignments', new_id,
    jsonb_build_object(
      'match_id', p_match_id,
      'assignee', p_assignee,
      'matter_id', p_matter_id,
      'due_at', p_due_at
    ),
    'allowed', 'rbac_role', NULL,
    jsonb_build_object('entity_type', 'match_assignments', 'entity_id', new_id)
  );

  RETURN jsonb_build_object('ok', true, 'id', new_id);
END;
$$;

REVOKE ALL ON FUNCTION ciceron.assign_match(uuid, uuid, uuid, uuid, uuid, date)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION ciceron.assign_match(uuid, uuid, uuid, uuid, uuid, date)
  TO service_role;

-- ---------------------------------------------------------------------------
-- RPC: update_match_assignment_status
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION ciceron.update_match_assignment_status(
  p_firm_id uuid,
  p_assignment_id uuid,
  p_actor uuid,
  p_status text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ciceron
AS $$
DECLARE
  actor_role text;
  row_assignee uuid;
  row_matter uuid;
BEGIN
  IF p_status NOT IN ('pendiente', 'en_curso', 'hecho') THEN
    RETURN jsonb_build_object(
      'ok', false, 'policy_id', 'invalid_status',
      'policy_reason', 'Estado no válido.'
    );
  END IF;

  SELECT ms.role INTO actor_role
  FROM ciceron.memberships ms
  WHERE ms.firm_id = p_firm_id AND ms.user_id = p_actor;

  SELECT a.assignee_actor, a.matter_id INTO row_assignee, row_matter
  FROM ciceron.match_assignments a
  WHERE a.id = p_assignment_id AND a.firm_id = p_firm_id;

  IF row_assignee IS NULL THEN
    RETURN jsonb_build_object(
      'ok', false, 'policy_id', 'not_found',
      'policy_reason', 'Asignación no encontrada.'
    );
  END IF;

  IF NOT (
    actor_role IN ('socio', 'asociado', 'admin')
    OR EXISTS (
      SELECT 1 FROM ciceron.matter_members mm
      WHERE mm.matter_id = row_matter AND mm.user_id = p_actor
    )
  ) THEN
    PERFORM ciceron.write_audit_event(
      p_firm_id, p_actor, 'match_assign_status', 'match_assignments', p_assignment_id,
      jsonb_build_object('status', p_status),
      'denied', 'matter_member',
      'Actor is not a member of this matter',
      jsonb_build_object('entity_type', 'match_assignments', 'entity_id', p_assignment_id)
    );
    RETURN jsonb_build_object(
      'ok', false, 'policy_id', 'matter_member',
      'policy_reason', 'Actor is not a member of this matter'
    );
  END IF;

  IF row_assignee <> p_actor
     AND (actor_role IS NULL OR actor_role NOT IN ('socio', 'asociado', 'admin')) THEN
    PERFORM ciceron.write_audit_event(
      p_firm_id, p_actor, 'match_assign_status', 'match_assignments', p_assignment_id,
      jsonb_build_object('status', p_status, 'assignee', row_assignee),
      'denied', 'rbac_assignee',
      'Solo el asignado o un socio/asociado/admin puede cambiar el estado.',
      jsonb_build_object('entity_type', 'match_assignments', 'entity_id', p_assignment_id)
    );
    RETURN jsonb_build_object(
      'ok', false, 'policy_id', 'rbac_assignee',
      'policy_reason', 'Solo el asignado o un socio/asociado/admin puede cambiar el estado.'
    );
  END IF;

  UPDATE ciceron.match_assignments
  SET status = p_status, updated_at = now()
  WHERE id = p_assignment_id AND firm_id = p_firm_id;

  PERFORM ciceron.write_audit_event(
    p_firm_id, p_actor, 'match_assign_status', 'match_assignments', p_assignment_id,
    jsonb_build_object('status', p_status),
    'allowed', 'rbac_role', NULL,
    jsonb_build_object('entity_type', 'match_assignments', 'entity_id', p_assignment_id)
  );

  RETURN jsonb_build_object('ok', true);
END;
$$;

REVOKE ALL ON FUNCTION ciceron.update_match_assignment_status(uuid, uuid, uuid, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION ciceron.update_match_assignment_status(uuid, uuid, uuid, text)
  TO service_role;

-- ---------------------------------------------------------------------------
-- RPC: add_match_comment
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION ciceron.add_match_comment(
  p_firm_id uuid,
  p_match_id uuid,
  p_actor uuid,
  p_matter_id uuid,
  p_body text,
  p_mentions uuid[] DEFAULT '{}'::uuid[]
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ciceron
AS $$
DECLARE
  actor_role text;
  match_firm uuid;
  match_client uuid;
  matter_firm uuid;
  matter_client uuid;
  new_id uuid;
  clean_body text;
BEGIN
  clean_body := trim(both FROM coalesce(p_body, ''));
  IF char_length(clean_body) < 1 OR char_length(clean_body) > 8000 THEN
    RETURN jsonb_build_object(
      'ok', false, 'policy_id', 'invalid_body',
      'policy_reason', 'El comentario debe tener entre 1 y 8000 caracteres.'
    );
  END IF;

  SELECT ms.role INTO actor_role
  FROM ciceron.memberships ms
  WHERE ms.firm_id = p_firm_id AND ms.user_id = p_actor;

  IF actor_role IS NULL THEN
    PERFORM ciceron.write_audit_event(
      p_firm_id, p_actor, 'match_comment_add', 'match_comments', p_match_id,
      '{}'::jsonb, 'denied', 'rbac_membership',
      'El actor no es miembro del despacho.',
      jsonb_build_object('entity_type', 'matches', 'entity_id', p_match_id)
    );
    RETURN jsonb_build_object(
      'ok', false, 'policy_id', 'rbac_membership',
      'policy_reason', 'El actor no es miembro del despacho.'
    );
  END IF;

  SELECT fc.firm_id, fc.client_id INTO match_firm, match_client
  FROM ciceron.match_firm_client(p_match_id) fc;

  IF match_firm IS NULL OR match_firm <> p_firm_id THEN
    PERFORM ciceron.write_audit_event(
      p_firm_id, p_actor, 'match_comment_add', 'match_comments', p_match_id,
      '{}'::jsonb, 'denied', 'tenant_match',
      'La coincidencia no pertenece a este despacho.',
      jsonb_build_object('entity_type', 'matches', 'entity_id', p_match_id)
    );
    RETURN jsonb_build_object(
      'ok', false, 'policy_id', 'tenant_match',
      'policy_reason', 'La coincidencia no pertenece a este despacho.'
    );
  END IF;

  SELECT m.firm_id, m.client_id INTO matter_firm, matter_client
  FROM ciceron.matters m WHERE m.id = p_matter_id;

  IF matter_firm IS NULL OR matter_firm <> p_firm_id OR matter_client <> match_client THEN
    PERFORM ciceron.write_audit_event(
      p_firm_id, p_actor, 'match_comment_add', 'match_comments', p_match_id,
      jsonb_build_object('matter_id', p_matter_id),
      'denied', 'matter_client',
      'El asunto no corresponde al cliente de esta coincidencia.',
      jsonb_build_object('entity_type', 'matters', 'entity_id', p_matter_id)
    );
    RETURN jsonb_build_object(
      'ok', false, 'policy_id', 'matter_client',
      'policy_reason', 'El asunto no corresponde al cliente de esta coincidencia.'
    );
  END IF;

  IF NOT (
    actor_role IN ('socio', 'asociado', 'admin')
    OR EXISTS (
      SELECT 1 FROM ciceron.matter_members mm
      WHERE mm.matter_id = p_matter_id AND mm.user_id = p_actor
    )
  ) THEN
    PERFORM ciceron.write_audit_event(
      p_firm_id, p_actor, 'match_comment_add', 'match_comments', p_match_id,
      jsonb_build_object('matter_id', p_matter_id),
      'denied', 'matter_member',
      'Actor is not a member of this matter',
      jsonb_build_object('entity_type', 'matters', 'entity_id', p_matter_id)
    );
    RETURN jsonb_build_object(
      'ok', false, 'policy_id', 'matter_member',
      'policy_reason', 'Actor is not a member of this matter'
    );
  END IF;

  -- Mentions must be firm members only
  IF EXISTS (
    SELECT 1
    FROM unnest(coalesce(p_mentions, '{}'::uuid[])) AS mid(uid)
    WHERE NOT EXISTS (
      SELECT 1 FROM ciceron.memberships ms
      WHERE ms.firm_id = p_firm_id AND ms.user_id = mid.uid
    )
  ) THEN
    PERFORM ciceron.write_audit_event(
      p_firm_id, p_actor, 'match_comment_add', 'match_comments', p_match_id,
      jsonb_build_object('mentions', p_mentions),
      'denied', 'mention_firm',
      'Solo puede mencionar a miembros del despacho.',
      jsonb_build_object('entity_type', 'matches', 'entity_id', p_match_id)
    );
    RETURN jsonb_build_object(
      'ok', false, 'policy_id', 'mention_firm',
      'policy_reason', 'Solo puede mencionar a miembros del despacho.'
    );
  END IF;

  INSERT INTO ciceron.match_comments (
    firm_id, match_id, matter_id, author_actor, body, mentions
  ) VALUES (
    p_firm_id, p_match_id, p_matter_id, p_actor, clean_body, coalesce(p_mentions, '{}'::uuid[])
  )
  RETURNING id INTO new_id;

  PERFORM ciceron.write_audit_event(
    p_firm_id, p_actor, 'match_comment_add', 'match_comments', new_id,
    jsonb_build_object('match_id', p_match_id, 'mentions', p_mentions),
    'allowed', 'rbac_role', NULL,
    jsonb_build_object('entity_type', 'match_comments', 'entity_id', new_id)
  );

  RETURN jsonb_build_object('ok', true, 'id', new_id);
END;
$$;

REVOKE ALL ON FUNCTION ciceron.add_match_comment(uuid, uuid, uuid, uuid, text, uuid[])
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION ciceron.add_match_comment(uuid, uuid, uuid, uuid, text, uuid[])
  TO service_role;

-- ---------------------------------------------------------------------------
-- RPC: edit_match_comment (author only; soft fields)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION ciceron.edit_match_comment(
  p_firm_id uuid,
  p_comment_id uuid,
  p_actor uuid,
  p_body text,
  p_mentions uuid[] DEFAULT '{}'::uuid[]
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ciceron
AS $$
DECLARE
  row_author uuid;
  row_matter uuid;
  actor_role text;
  clean_body text;
BEGIN
  clean_body := trim(both FROM coalesce(p_body, ''));
  IF char_length(clean_body) < 1 OR char_length(clean_body) > 8000 THEN
    RETURN jsonb_build_object(
      'ok', false, 'policy_id', 'invalid_body',
      'policy_reason', 'El comentario debe tener entre 1 y 8000 caracteres.'
    );
  END IF;

  SELECT c.author_actor, c.matter_id INTO row_author, row_matter
  FROM ciceron.match_comments c
  WHERE c.id = p_comment_id AND c.firm_id = p_firm_id AND c.deleted_at IS NULL;

  IF row_author IS NULL THEN
    RETURN jsonb_build_object(
      'ok', false, 'policy_id', 'not_found',
      'policy_reason', 'Comentario no encontrado.'
    );
  END IF;

  SELECT ms.role INTO actor_role
  FROM ciceron.memberships ms
  WHERE ms.firm_id = p_firm_id AND ms.user_id = p_actor;

  IF NOT (
    actor_role IN ('socio', 'asociado', 'admin')
    OR EXISTS (
      SELECT 1 FROM ciceron.matter_members mm
      WHERE mm.matter_id = row_matter AND mm.user_id = p_actor
    )
  ) THEN
    PERFORM ciceron.write_audit_event(
      p_firm_id, p_actor, 'match_comment_edit', 'match_comments', p_comment_id,
      '{}'::jsonb, 'denied', 'matter_member',
      'Actor is not a member of this matter',
      jsonb_build_object('entity_type', 'match_comments', 'entity_id', p_comment_id)
    );
    RETURN jsonb_build_object(
      'ok', false, 'policy_id', 'matter_member',
      'policy_reason', 'Actor is not a member of this matter'
    );
  END IF;

  IF row_author <> p_actor THEN
    PERFORM ciceron.write_audit_event(
      p_firm_id, p_actor, 'match_comment_edit', 'match_comments', p_comment_id,
      '{}'::jsonb, 'denied', 'comment_author',
      'Solo el autor puede editar el comentario.',
      jsonb_build_object('entity_type', 'match_comments', 'entity_id', p_comment_id)
    );
    RETURN jsonb_build_object(
      'ok', false, 'policy_id', 'comment_author',
      'policy_reason', 'Solo el autor puede editar el comentario.'
    );
  END IF;

  UPDATE ciceron.match_comments
  SET body = clean_body,
      mentions = coalesce(p_mentions, '{}'::uuid[]),
      edited_at = now()
  WHERE id = p_comment_id AND firm_id = p_firm_id;

  PERFORM ciceron.write_audit_event(
    p_firm_id, p_actor, 'match_comment_edit', 'match_comments', p_comment_id,
    jsonb_build_object('mentions', p_mentions),
    'allowed', 'rbac_role', NULL,
    jsonb_build_object('entity_type', 'match_comments', 'entity_id', p_comment_id)
  );

  RETURN jsonb_build_object('ok', true);
END;
$$;

REVOKE ALL ON FUNCTION ciceron.edit_match_comment(uuid, uuid, uuid, text, uuid[])
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION ciceron.edit_match_comment(uuid, uuid, uuid, text, uuid[])
  TO service_role;

-- ---------------------------------------------------------------------------
-- RPC: soft_delete_match_comment
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION ciceron.soft_delete_match_comment(
  p_firm_id uuid,
  p_comment_id uuid,
  p_actor uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ciceron
AS $$
DECLARE
  row_author uuid;
  row_matter uuid;
  actor_role text;
BEGIN
  SELECT c.author_actor, c.matter_id INTO row_author, row_matter
  FROM ciceron.match_comments c
  WHERE c.id = p_comment_id AND c.firm_id = p_firm_id AND c.deleted_at IS NULL;

  IF row_author IS NULL THEN
    RETURN jsonb_build_object(
      'ok', false, 'policy_id', 'not_found',
      'policy_reason', 'Comentario no encontrado.'
    );
  END IF;

  SELECT ms.role INTO actor_role
  FROM ciceron.memberships ms
  WHERE ms.firm_id = p_firm_id AND ms.user_id = p_actor;

  IF NOT (
    actor_role IN ('socio', 'asociado', 'admin')
    OR EXISTS (
      SELECT 1 FROM ciceron.matter_members mm
      WHERE mm.matter_id = row_matter AND mm.user_id = p_actor
    )
  ) THEN
    PERFORM ciceron.write_audit_event(
      p_firm_id, p_actor, 'match_comment_delete', 'match_comments', p_comment_id,
      '{}'::jsonb, 'denied', 'matter_member',
      'Actor is not a member of this matter',
      jsonb_build_object('entity_type', 'match_comments', 'entity_id', p_comment_id)
    );
    RETURN jsonb_build_object(
      'ok', false, 'policy_id', 'matter_member',
      'policy_reason', 'Actor is not a member of this matter'
    );
  END IF;

  IF row_author <> p_actor
     AND (actor_role IS NULL OR actor_role NOT IN ('socio', 'admin')) THEN
    PERFORM ciceron.write_audit_event(
      p_firm_id, p_actor, 'match_comment_delete', 'match_comments', p_comment_id,
      '{}'::jsonb, 'denied', 'comment_author',
      'Solo el autor o un socio/admin puede eliminar el comentario.',
      jsonb_build_object('entity_type', 'match_comments', 'entity_id', p_comment_id)
    );
    RETURN jsonb_build_object(
      'ok', false, 'policy_id', 'comment_author',
      'policy_reason', 'Solo el autor o un socio/admin puede eliminar el comentario.'
    );
  END IF;

  UPDATE ciceron.match_comments
  SET deleted_at = now()
  WHERE id = p_comment_id AND firm_id = p_firm_id;

  PERFORM ciceron.write_audit_event(
    p_firm_id, p_actor, 'match_comment_delete', 'match_comments', p_comment_id,
    '{}'::jsonb, 'allowed', 'rbac_role', NULL,
    jsonb_build_object('entity_type', 'match_comments', 'entity_id', p_comment_id)
  );

  RETURN jsonb_build_object('ok', true);
END;
$$;

REVOKE ALL ON FUNCTION ciceron.soft_delete_match_comment(uuid, uuid, uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION ciceron.soft_delete_match_comment(uuid, uuid, uuid)
  TO service_role;
