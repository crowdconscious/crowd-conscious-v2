-- 312_ciceron_review_queue.sql
-- Prompt 7: review queue, decisions, delivery gate, audit shape for Prompt 9, learning loop.
-- Additive only. Review/delivery writes are RPC-only and strictly tighter than Prompt 1.
-- Applied by CTO after review. Agents do not apply to production.

-- ---------------------------------------------------------------------------
-- Firm settings (four-eyes output types + email allow-list)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ciceron.firm_settings (
  firm_id uuid PRIMARY KEY REFERENCES ciceron.firms(id) ON DELETE CASCADE,
  four_eyes_output_types text[] NOT NULL DEFAULT '{}'::text[],
  email_allowlist text[] NOT NULL DEFAULT '{}'::text[],
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE ciceron.firm_settings IS
  'Per-firm oversight settings. four_eyes_output_types: editor cannot be final approver. email_allowlist: empty = simulate only.';

ALTER TABLE ciceron.firm_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE ciceron.firm_settings FORCE ROW LEVEL SECURITY;
REVOKE ALL ON ciceron.firm_settings FROM PUBLIC, anon;
GRANT SELECT ON ciceron.firm_settings TO authenticated;
GRANT ALL ON ciceron.firm_settings TO service_role;

DROP POLICY IF EXISTS firm_settings_select ON ciceron.firm_settings;
CREATE POLICY firm_settings_select ON ciceron.firm_settings
  FOR SELECT TO authenticated
  USING (firm_id IN (SELECT ciceron.firms_of_current_user()));

DROP POLICY IF EXISTS firm_settings_write ON ciceron.firm_settings;
CREATE POLICY firm_settings_write ON ciceron.firm_settings
  FOR ALL TO authenticated
  USING (
    firm_id IN (SELECT ciceron.firms_of_current_user())
    AND EXISTS (
      SELECT 1 FROM ciceron.memberships m
      WHERE m.firm_id = firm_settings.firm_id
        AND m.user_id = ciceron.current_actor_id()
        AND m.role IN ('socio', 'admin')
    )
  )
  WITH CHECK (
    firm_id IN (SELECT ciceron.firms_of_current_user())
    AND EXISTS (
      SELECT 1 FROM ciceron.memberships m
      WHERE m.firm_id = firm_settings.firm_id
        AND m.user_id = ciceron.current_actor_id()
        AND m.role IN ('socio', 'admin')
    )
  );

DROP TRIGGER IF EXISTS firm_settings_set_updated_at ON ciceron.firm_settings;
CREATE TRIGGER firm_settings_set_updated_at
  BEFORE UPDATE ON ciceron.firm_settings
  FOR EACH ROW EXECUTE FUNCTION ciceron.set_updated_at();

-- ---------------------------------------------------------------------------
-- Review tasks: due, title, output_type, draft link
-- ---------------------------------------------------------------------------
ALTER TABLE ciceron.review_tasks
  ADD COLUMN IF NOT EXISTS due_at timestamptz,
  ADD COLUMN IF NOT EXISTS title text,
  ADD COLUMN IF NOT EXISTS output_type text,
  ADD COLUMN IF NOT EXISTS draft_id uuid REFERENCES ciceron.drafts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS review_tasks_assignee_due_idx
  ON ciceron.review_tasks (assignee_id, due_at)
  WHERE status IN ('pendiente', 'en_curso');

CREATE INDEX IF NOT EXISTS review_tasks_assignee_persona_due_idx
  ON ciceron.review_tasks (assignee_persona, due_at)
  WHERE status IN ('pendiente', 'en_curso');

CREATE INDEX IF NOT EXISTS review_tasks_draft_id_idx
  ON ciceron.review_tasks (draft_id)
  WHERE draft_id IS NOT NULL;

COMMENT ON COLUMN ciceron.review_tasks.output_type IS
  'Logical output class (client_alert, research_summary, client_notify, …). Used for four-eyes.';
COMMENT ON COLUMN ciceron.review_tasks.is_demo IS
  'Datos de demostración seed rows.';

-- ---------------------------------------------------------------------------
-- Review decisions: nullable decided_by (persona path), version refs, XOR check
-- Writes: service_role RPC only (see REVOKE below + authority trigger).
-- ---------------------------------------------------------------------------
ALTER TABLE ciceron.review_decisions
  ALTER COLUMN decided_by DROP NOT NULL;

ALTER TABLE ciceron.review_decisions
  ADD COLUMN IF NOT EXISTS model_draft_version_id uuid
    REFERENCES ciceron.draft_versions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS approved_draft_version_id uuid
    REFERENCES ciceron.draft_versions(id) ON DELETE SET NULL;

ALTER TABLE ciceron.review_decisions
  DROP CONSTRAINT IF EXISTS review_decisions_decider_present;

ALTER TABLE ciceron.review_decisions
  ADD CONSTRAINT review_decisions_decider_present
  CHECK (decided_by IS NOT NULL OR decided_by_persona IS NOT NULL);

COMMENT ON COLUMN ciceron.review_decisions.model_draft_version_id IS
  'Model draft version at decision time (before human edit).';
COMMENT ON COLUMN ciceron.review_decisions.approved_draft_version_id IS
  'Version that was approved (model or new human edit).';

-- RPC-only writes: authenticated may SELECT via RLS, not mutate
REVOKE INSERT, UPDATE, DELETE ON ciceron.review_decisions FROM PUBLIC, anon, authenticated;
GRANT SELECT ON ciceron.review_decisions TO authenticated;
GRANT ALL ON ciceron.review_decisions TO service_role;

DROP POLICY IF EXISTS review_decisions_all ON ciceron.review_decisions;
DROP POLICY IF EXISTS review_decisions_select ON ciceron.review_decisions;
CREATE POLICY review_decisions_select ON ciceron.review_decisions
  FOR SELECT TO authenticated
  USING (ciceron.is_matter_member(matter_id));

CREATE OR REPLACE FUNCTION ciceron.review_decisions_authority()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ciceron
AS $$
DECLARE
  actor uuid;
BEGIN
  IF NEW.decided_by IS NULL AND NEW.decided_by_persona IS NULL THEN
    RAISE EXCEPTION 'decided_by or decided_by_persona is required'
      USING ERRCODE = 'check_violation';
  END IF;

  actor := COALESCE(NEW.decided_by, NEW.decided_by_persona);

  IF actor IS DISTINCT FROM ciceron.current_actor_id() THEN
    RAISE EXCEPTION 'decision actor must match the logged-in session actor'
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
    RAISE EXCEPTION 'only socio, asociado, or admin may decide reviews'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION ciceron.review_decisions_authority() IS
  'BEFORE INSERT/UPDATE: decider must equal current_actor_id and be socio|asociado|admin on the matter firm.';

REVOKE ALL ON FUNCTION ciceron.review_decisions_authority() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION ciceron.review_decisions_authority() TO service_role;

DROP TRIGGER IF EXISTS review_decisions_authority ON ciceron.review_decisions;
CREATE TRIGGER review_decisions_authority
  BEFORE INSERT OR UPDATE ON ciceron.review_decisions
  FOR EACH ROW EXECUTE FUNCTION ciceron.review_decisions_authority();

-- ---------------------------------------------------------------------------
-- Draft versions: persona author companion
-- ---------------------------------------------------------------------------
ALTER TABLE ciceron.draft_versions
  ADD COLUMN IF NOT EXISTS author_persona uuid
    REFERENCES ciceron.demo_personas(id) ON DELETE SET NULL;

COMMENT ON COLUMN ciceron.draft_versions.author_persona IS
  'Demo persona author; leave author_user_id NULL for invite actors.';

-- ---------------------------------------------------------------------------
-- Deliveries: persona, decision link, message snapshot, simulation flag
-- Writes: create_delivery RPC only
-- ---------------------------------------------------------------------------
ALTER TABLE ciceron.deliveries
  ADD COLUMN IF NOT EXISTS delivered_by_persona uuid
    REFERENCES ciceron.demo_personas(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS review_decision_id uuid
    REFERENCES ciceron.review_decisions(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS recipient text,
  ADD COLUMN IF NOT EXISTS subject text,
  ADD COLUMN IF NOT EXISTS body_snapshot text,
  ADD COLUMN IF NOT EXISTS is_simulated boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN ciceron.deliveries.is_simulated IS
  'True when channel rendered and recorded without real egress (demo default).';

REVOKE INSERT, UPDATE, DELETE ON ciceron.deliveries FROM PUBLIC, anon, authenticated;
GRANT SELECT ON ciceron.deliveries TO authenticated;
GRANT ALL ON ciceron.deliveries TO service_role;

DROP POLICY IF EXISTS deliveries_all ON ciceron.deliveries;
DROP POLICY IF EXISTS deliveries_select ON ciceron.deliveries;
CREATE POLICY deliveries_select ON ciceron.deliveries
  FOR SELECT TO authenticated
  USING (ciceron.is_matter_member(matter_id));

-- ---------------------------------------------------------------------------
-- Audit events: outcome + policy fields for Prompt 9 access denials
-- ---------------------------------------------------------------------------
ALTER TABLE ciceron.audit_events
  ADD COLUMN IF NOT EXISTS outcome text NOT NULL DEFAULT 'allowed'
    CHECK (outcome IN ('allowed', 'denied')),
  ADD COLUMN IF NOT EXISTS policy_id text,
  ADD COLUMN IF NOT EXISTS policy_reason text,
  ADD COLUMN IF NOT EXISTS snapshot_ref jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS audit_events_firm_action_idx
  ON ciceron.audit_events (firm_id, action, created_at DESC);

CREATE INDEX IF NOT EXISTS audit_events_firm_outcome_idx
  ON ciceron.audit_events (firm_id, outcome, created_at DESC);

COMMENT ON COLUMN ciceron.audit_events.outcome IS
  'allowed (default) or denied. Prompt 9 logs RBAC/ABAC denials here.';
COMMENT ON COLUMN ciceron.audit_events.policy_id IS
  'Stable rule identifier that allowed or blocked the action (e.g. matter_member, four_eyes).';
COMMENT ON COLUMN ciceron.audit_events.policy_reason IS
  'Human-readable explanation of the rule outcome.';
COMMENT ON COLUMN ciceron.audit_events.snapshot_ref IS
  'Pointer to the object version as seen at event time (entity_type, entity_id, version_id).';

-- ---------------------------------------------------------------------------
-- Evaluation candidates (learning loop)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ciceron.evaluation_candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL REFERENCES ciceron.firms(id) ON DELETE CASCADE,
  matter_id uuid NOT NULL REFERENCES ciceron.matters(id) ON DELETE CASCADE,
  review_decision_id uuid NOT NULL REFERENCES ciceron.review_decisions(id) ON DELETE CASCADE,
  ai_run_id uuid REFERENCES ciceron.ai_runs(id) ON DELETE SET NULL,
  ai_output_id uuid REFERENCES ciceron.ai_outputs(id) ON DELETE SET NULL,
  model_output text NOT NULL,
  human_output text,
  reason text,
  decision text NOT NULL CHECK (decision IN ('corrected', 'rejected')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS evaluation_candidates_firm_id_idx
  ON ciceron.evaluation_candidates (firm_id, created_at DESC);

COMMENT ON TABLE ciceron.evaluation_candidates IS
  'Approve-with-edits and reject pairs for offline eval export per firm.';

ALTER TABLE ciceron.evaluation_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE ciceron.evaluation_candidates FORCE ROW LEVEL SECURITY;
REVOKE ALL ON ciceron.evaluation_candidates FROM PUBLIC, anon;
GRANT SELECT ON ciceron.evaluation_candidates TO authenticated;
GRANT ALL ON ciceron.evaluation_candidates TO service_role;

DROP POLICY IF EXISTS evaluation_candidates_select ON ciceron.evaluation_candidates;
CREATE POLICY evaluation_candidates_select ON ciceron.evaluation_candidates
  FOR SELECT TO authenticated
  USING (
    firm_id IN (SELECT ciceron.firms_of_current_user())
    AND EXISTS (
      SELECT 1 FROM ciceron.memberships m
      WHERE m.firm_id = evaluation_candidates.firm_id
        AND m.user_id = ciceron.current_actor_id()
        AND m.role IN ('socio', 'admin')
    )
  );

-- ---------------------------------------------------------------------------
-- In-app notifications (reassignment)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ciceron.in_app_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL REFERENCES ciceron.firms(id) ON DELETE CASCADE,
  recipient_id uuid,
  recipient_persona uuid REFERENCES ciceron.demo_personas(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (char_length(kind) BETWEEN 1 AND 80),
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 300),
  body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 4000),
  entity_type text,
  entity_id uuid,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (recipient_id IS NOT NULL OR recipient_persona IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS in_app_notifications_recipient_idx
  ON ciceron.in_app_notifications (recipient_id, created_at DESC)
  WHERE read_at IS NULL;

CREATE INDEX IF NOT EXISTS in_app_notifications_recipient_persona_idx
  ON ciceron.in_app_notifications (recipient_persona, created_at DESC)
  WHERE read_at IS NULL;

COMMENT ON TABLE ciceron.in_app_notifications IS
  'In-app notices (e.g. review reassignment). No email egress.';

ALTER TABLE ciceron.in_app_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE ciceron.in_app_notifications FORCE ROW LEVEL SECURITY;
REVOKE ALL ON ciceron.in_app_notifications FROM PUBLIC, anon;
GRANT SELECT, UPDATE ON ciceron.in_app_notifications TO authenticated;
GRANT ALL ON ciceron.in_app_notifications TO service_role;

DROP POLICY IF EXISTS in_app_notifications_select ON ciceron.in_app_notifications;
CREATE POLICY in_app_notifications_select ON ciceron.in_app_notifications
  FOR SELECT TO authenticated
  USING (
    firm_id IN (SELECT ciceron.firms_of_current_user())
    AND (
      recipient_id = ciceron.current_actor_id()
      OR recipient_persona = ciceron.current_actor_id()
    )
  );

DROP POLICY IF EXISTS in_app_notifications_update ON ciceron.in_app_notifications;
CREATE POLICY in_app_notifications_update ON ciceron.in_app_notifications
  FOR UPDATE TO authenticated
  USING (
    firm_id IN (SELECT ciceron.firms_of_current_user())
    AND (
      recipient_id = ciceron.current_actor_id()
      OR recipient_persona = ciceron.current_actor_id()
    )
  )
  WITH CHECK (
    firm_id IN (SELECT ciceron.firms_of_current_user())
    AND (
      recipient_id = ciceron.current_actor_id()
      OR recipient_persona = ciceron.current_actor_id()
    )
  );

-- ---------------------------------------------------------------------------
-- deliveries_tier2_gate: persona-aware + four-eyes (bool_or across tasks)
-- BEFORE INSERT OR UPDATE. create_delivery is the sole client write path.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION ciceron.deliveries_tier2_gate()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ciceron
AS $$
DECLARE
  v_tier int;
  v_decision_id uuid;
  v_decider uuid;
  v_firm_id uuid;
  v_four_eyes text[];
  v_needs_four_eyes boolean := false;
  v_edit_author uuid;
  v_approved_version uuid;
BEGIN
  SELECT o.tier INTO v_tier
  FROM ciceron.ai_outputs o
  WHERE o.id = NEW.ai_output_id;

  IF v_tier IS NULL THEN
    RAISE EXCEPTION 'ai_output not found'
      USING ERRCODE = 'check_violation';
  END IF;

  IF v_tier <> 2 THEN
    RETURN NEW;
  END IF;

  SELECT rd.id,
         COALESCE(rd.decided_by, rd.decided_by_persona),
         rd.approved_draft_version_id
    INTO v_decision_id, v_decider, v_approved_version
  FROM ciceron.review_decisions rd
  JOIN ciceron.matters m ON m.id = rd.matter_id
  JOIN ciceron.memberships ms
    ON ms.firm_id = m.firm_id
   AND ms.user_id = COALESCE(rd.decided_by, rd.decided_by_persona)
   AND ms.role IN ('socio', 'asociado', 'admin')
  WHERE rd.ai_output_id = NEW.ai_output_id
    AND rd.matter_id = NEW.matter_id
    AND rd.decision IN ('approved', 'corrected')
  ORDER BY rd.created_at DESC
  LIMIT 1;

  IF v_decision_id IS NULL OR v_decider IS NULL THEN
    RAISE EXCEPTION 'tier 2 delivery requires approved or corrected review by an authorised reviewer'
      USING ERRCODE = 'check_violation';
  END IF;

  SELECT m.firm_id INTO v_firm_id
  FROM ciceron.matters m
  WHERE m.id = NEW.matter_id;

  SELECT COALESCE(fs.four_eyes_output_types, '{}'::text[])
    INTO v_four_eyes
  FROM ciceron.firm_settings fs
  WHERE fs.firm_id = v_firm_id;

  IF v_four_eyes IS NULL THEN
    v_four_eyes := '{}'::text[];
  END IF;

  SELECT COALESCE(bool_or(rt.output_type = ANY (v_four_eyes)), false)
    INTO v_needs_four_eyes
  FROM ciceron.review_tasks rt
  WHERE rt.ai_output_id = NEW.ai_output_id
    AND rt.matter_id = NEW.matter_id;

  IF v_needs_four_eyes AND v_approved_version IS NOT NULL THEN
    SELECT COALESCE(dv.author_user_id, dv.author_persona)
      INTO v_edit_author
    FROM ciceron.draft_versions dv
    WHERE dv.id = v_approved_version
      AND dv.author_type = 'human';

    IF v_edit_author IS NOT NULL AND v_edit_author = v_decider THEN
      RAISE EXCEPTION 'four-eyes: editor cannot give final approval'
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  IF NEW.review_decision_id IS NULL THEN
    NEW.review_decision_id := v_decision_id;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION ciceron.deliveries_tier2_gate() IS
  'BEFORE INSERT OR UPDATE on deliveries: tier-2 needs approved/corrected by socio|asociado|admin (persona-aware). Four-eyes if any linked task output_type is configured.';

REVOKE ALL ON FUNCTION ciceron.deliveries_tier2_gate() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION ciceron.deliveries_tier2_gate() TO service_role;

DROP TRIGGER IF EXISTS deliveries_tier2_gate ON ciceron.deliveries;
CREATE TRIGGER deliveries_tier2_gate
  BEFORE INSERT OR UPDATE ON ciceron.deliveries
  FOR EACH ROW EXECUTE FUNCTION ciceron.deliveries_tier2_gate();

-- ---------------------------------------------------------------------------
-- Helper: write audit event (used by RPCs)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION ciceron.write_audit_event(
  p_firm_id uuid,
  p_user_id uuid,
  p_action text,
  p_entity_type text,
  p_entity_id uuid,
  p_payload jsonb DEFAULT '{}'::jsonb,
  p_outcome text DEFAULT 'allowed',
  p_policy_id text DEFAULT NULL,
  p_policy_reason text DEFAULT NULL,
  p_snapshot_ref jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ciceron
AS $$
DECLARE
  eid uuid;
BEGIN
  IF p_outcome IS NULL OR p_outcome NOT IN ('allowed', 'denied') THEN
    RAISE EXCEPTION 'invalid audit outcome'
      USING ERRCODE = 'check_violation';
  END IF;

  INSERT INTO ciceron.audit_events (
    firm_id, user_id, action, entity_type, entity_id,
    payload, outcome, policy_id, policy_reason, snapshot_ref
  ) VALUES (
    p_firm_id, p_user_id, p_action, p_entity_type, p_entity_id,
    COALESCE(p_payload, '{}'::jsonb),
    p_outcome,
    p_policy_id,
    p_policy_reason,
    COALESCE(p_snapshot_ref, '{}'::jsonb)
  )
  RETURNING id INTO eid;

  RETURN eid;
END;
$$;

COMMENT ON FUNCTION ciceron.write_audit_event(uuid, uuid, text, text, uuid, jsonb, text, text, text, jsonb) IS
  'Append one audit_events row. Use outcome=denied + policy_id for Prompt 9 denials.';

REVOKE ALL ON FUNCTION ciceron.write_audit_event(uuid, uuid, text, text, uuid, jsonb, text, text, text, jsonb)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION ciceron.write_audit_event(uuid, uuid, text, text, uuid, jsonb, text, text, text, jsonb)
  TO service_role;

-- ---------------------------------------------------------------------------
-- decide_review RPC — RETURNS jsonb {ok, id?} | {ok:false, policy_id, policy_reason}
-- Policy denials write audit then return (no RAISE) so the denial row commits.
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS ciceron.decide_review(uuid, uuid, text, text, text);

CREATE OR REPLACE FUNCTION ciceron.decide_review(
  p_actor uuid,
  p_task_id uuid,
  p_decision text,
  p_notes text DEFAULT NULL,
  p_edited_body text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ciceron
AS $$
DECLARE
  is_persona boolean;
  task ciceron.review_tasks%ROWTYPE;
  matter_firm uuid;
  actor_role text;
  decision_id uuid;
  model_version_id uuid;
  approved_version_id uuid;
  next_version int;
  four_eyes text[];
  prior_human_author uuid;
  ai_run uuid;
  model_body text;
  eval_decision text;
  task_status text;
BEGIN
  IF p_actor IS NULL OR p_task_id IS NULL THEN
    RAISE EXCEPTION 'actor and task id are required'
      USING ERRCODE = 'check_violation';
  END IF;

  IF p_decision NOT IN ('approved', 'corrected', 'rejected', 'returned') THEN
    RAISE EXCEPTION 'unsupported decision: %', p_decision
      USING ERRCODE = 'check_violation';
  END IF;

  IF p_decision = 'corrected' AND (p_edited_body IS NULL OR length(trim(p_edited_body)) = 0) THEN
    RAISE EXCEPTION 'corrected decision requires edited body'
      USING ERRCODE = 'check_violation';
  END IF;

  IF p_decision = 'rejected' AND (p_notes IS NULL OR length(trim(p_notes)) = 0) THEN
    RAISE EXCEPTION 'rejected decision requires a reason'
      USING ERRCODE = 'check_violation';
  END IF;

  PERFORM ciceron.set_actor(p_actor);

  SELECT * INTO task
  FROM ciceron.review_tasks
  WHERE id = p_task_id
  FOR UPDATE;

  IF task.id IS NULL THEN
    RAISE EXCEPTION 'review task not found'
      USING ERRCODE = 'check_violation';
  END IF;

  IF task.status = 'cerrado' THEN
    RAISE EXCEPTION 'review task already decided'
      USING ERRCODE = 'check_violation';
  END IF;

  IF EXISTS (
    SELECT 1 FROM ciceron.review_decisions rd
    WHERE rd.review_task_id = p_task_id
      AND rd.decision IN ('approved', 'corrected', 'rejected')
  ) THEN
    RAISE EXCEPTION 'review task already decided'
      USING ERRCODE = 'check_violation';
  END IF;

  SELECT m.firm_id INTO matter_firm
  FROM ciceron.matters m
  WHERE m.id = task.matter_id;

  SELECT ms.role INTO actor_role
  FROM ciceron.memberships ms
  WHERE ms.firm_id = matter_firm
    AND ms.user_id = p_actor;

  IF actor_role IS NULL OR actor_role NOT IN ('socio', 'asociado', 'admin') THEN
    PERFORM ciceron.write_audit_event(
      matter_firm, p_actor, 'review_decide', 'review_tasks', p_task_id,
      jsonb_build_object('decision', p_decision, 'actor_role', actor_role),
      'denied', 'role', 'Solo socio, asociado o admin puede decidir revisiones',
      jsonb_build_object('entity_type', 'review_tasks', 'entity_id', p_task_id)
    );
    RETURN jsonb_build_object(
      'ok', false,
      'policy_id', 'role',
      'policy_reason', 'Solo socio, asociado o admin puede decidir revisiones'
    );
  END IF;

  IF NOT ciceron.is_matter_member(task.matter_id) THEN
    PERFORM ciceron.write_audit_event(
      matter_firm, p_actor, 'review_decide', 'review_tasks', p_task_id,
      jsonb_build_object('decision', p_decision),
      'denied', 'matter_member', 'Actor is not a member of this matter',
      jsonb_build_object('entity_type', 'review_tasks', 'entity_id', p_task_id)
    );
    RETURN jsonb_build_object(
      'ok', false,
      'policy_id', 'matter_member',
      'policy_reason', 'Actor is not a member of this matter'
    );
  END IF;

  is_persona := EXISTS (
    SELECT 1 FROM ciceron.demo_personas dp WHERE dp.id = p_actor
  );

  SELECT COALESCE(fs.four_eyes_output_types, '{}'::text[])
    INTO four_eyes
  FROM ciceron.firm_settings fs
  WHERE fs.firm_id = matter_firm;

  IF four_eyes IS NULL THEN
    four_eyes := '{}'::text[];
  END IF;

  IF task.draft_id IS NOT NULL THEN
    SELECT dv.id, dv.body INTO model_version_id, model_body
    FROM ciceron.draft_versions dv
    WHERE dv.draft_id = task.draft_id
      AND dv.author_type = 'model'
    ORDER BY dv.version_number DESC
    LIMIT 1;

    SELECT COALESCE(dv.author_user_id, dv.author_persona)
      INTO prior_human_author
    FROM ciceron.draft_versions dv
    WHERE dv.draft_id = task.draft_id
      AND dv.author_type = 'human'
    ORDER BY dv.version_number DESC
    LIMIT 1;
  END IF;

  IF model_body IS NULL AND task.ai_output_id IS NOT NULL THEN
    SELECT o.body INTO model_body
    FROM ciceron.ai_outputs o
    WHERE o.id = task.ai_output_id;
  END IF;

  IF task.output_type IS NOT NULL
     AND task.output_type = ANY (four_eyes) THEN
    IF p_decision = 'corrected' THEN
      PERFORM ciceron.write_audit_event(
        matter_firm, p_actor, 'review_decide', 'review_tasks', p_task_id,
        jsonb_build_object('decision', p_decision, 'output_type', task.output_type),
        'denied', 'four_eyes', 'Editor cannot give final approval on this output type',
        jsonb_build_object('entity_type', 'review_tasks', 'entity_id', p_task_id)
      );
      RETURN jsonb_build_object(
        'ok', false,
        'policy_id', 'four_eyes',
        'policy_reason', 'Editor cannot give final approval on this output type'
      );
    END IF;

    IF p_decision = 'approved'
       AND prior_human_author IS NOT NULL
       AND prior_human_author = p_actor THEN
      PERFORM ciceron.write_audit_event(
        matter_firm, p_actor, 'review_decide', 'review_tasks', p_task_id,
        jsonb_build_object('decision', p_decision, 'output_type', task.output_type),
        'denied', 'four_eyes', 'Editor cannot give final approval on this output type',
        jsonb_build_object('entity_type', 'review_tasks', 'entity_id', p_task_id)
      );
      RETURN jsonb_build_object(
        'ok', false,
        'policy_id', 'four_eyes',
        'policy_reason', 'Editor cannot give final approval on this output type'
      );
    END IF;
  END IF;

  approved_version_id := model_version_id;

  IF p_decision = 'corrected' AND task.draft_id IS NOT NULL THEN
    SELECT COALESCE(MAX(dv.version_number), 0) + 1 INTO next_version
    FROM ciceron.draft_versions dv
    WHERE dv.draft_id = task.draft_id;

    IF is_persona THEN
      INSERT INTO ciceron.draft_versions (
        draft_id, author_type, author_user_id, author_persona,
        body, ai_output_id, version_number
      ) VALUES (
        task.draft_id, 'human', NULL, p_actor,
        p_edited_body, task.ai_output_id, next_version
      )
      RETURNING id INTO approved_version_id;
    ELSE
      INSERT INTO ciceron.draft_versions (
        draft_id, author_type, author_user_id, author_persona,
        body, ai_output_id, version_number
      ) VALUES (
        task.draft_id, 'human', p_actor, NULL,
        p_edited_body, task.ai_output_id, next_version
      )
      RETURNING id INTO approved_version_id;
    END IF;
  ELSIF p_decision = 'approved' AND prior_human_author IS NOT NULL THEN
    SELECT dv.id INTO approved_version_id
    FROM ciceron.draft_versions dv
    WHERE dv.draft_id = task.draft_id
      AND dv.author_type = 'human'
    ORDER BY dv.version_number DESC
    LIMIT 1;
  END IF;

  IF is_persona THEN
    INSERT INTO ciceron.review_decisions (
      review_task_id, matter_id, ai_output_id, decision,
      decided_by, decided_by_persona, notes,
      model_draft_version_id, approved_draft_version_id
    ) VALUES (
      p_task_id, task.matter_id, task.ai_output_id, p_decision,
      NULL, p_actor, p_notes,
      model_version_id, approved_version_id
    )
    RETURNING id INTO decision_id;
  ELSE
    INSERT INTO ciceron.review_decisions (
      review_task_id, matter_id, ai_output_id, decision,
      decided_by, decided_by_persona, notes,
      model_draft_version_id, approved_draft_version_id
    ) VALUES (
      p_task_id, task.matter_id, task.ai_output_id, p_decision,
      p_actor, NULL, p_notes,
      model_version_id, approved_version_id
    )
    RETURNING id INTO decision_id;
  END IF;

  -- returned keeps the queue open; terminal decisions close
  IF p_decision = 'returned' THEN
    task_status := 'pendiente';
  ELSE
    task_status := 'cerrado';
  END IF;

  UPDATE ciceron.review_tasks
  SET status = task_status, updated_at = now()
  WHERE id = p_task_id;

  IF task.ai_output_id IS NOT NULL AND p_decision <> 'returned' THEN
    UPDATE ciceron.ai_outputs
    SET status = CASE p_decision
          WHEN 'approved' THEN 'aprobado'
          WHEN 'corrected' THEN 'corregido'
          WHEN 'rejected' THEN 'rechazado'
          ELSE 'en_revision'
        END,
        updated_at = now()
    WHERE id = task.ai_output_id;
  END IF;

  IF p_decision IN ('corrected', 'rejected') THEN
    eval_decision := p_decision;
    SELECT o.ai_run_id INTO ai_run
    FROM ciceron.ai_outputs o
    WHERE o.id = task.ai_output_id;

    INSERT INTO ciceron.evaluation_candidates (
      firm_id, matter_id, review_decision_id, ai_run_id, ai_output_id,
      model_output, human_output, reason, decision
    ) VALUES (
      matter_firm, task.matter_id, decision_id, ai_run, task.ai_output_id,
      COALESCE(model_body, ''),
      CASE WHEN p_decision = 'corrected' THEN p_edited_body ELSE NULL END,
      p_notes,
      eval_decision
    );
  END IF;

  PERFORM ciceron.write_audit_event(
    matter_firm, p_actor, 'review_decision', 'review_decisions', decision_id,
    jsonb_build_object(
      'decision', p_decision,
      'review_task_id', p_task_id,
      'ai_output_id', task.ai_output_id,
      'model_draft_version_id', model_version_id,
      'approved_draft_version_id', approved_version_id
    ),
    'allowed', 'can_review_matter', 'Authorised reviewer recorded a decision',
    jsonb_build_object(
      'entity_type', 'review_decisions',
      'entity_id', decision_id,
      'version_id', approved_version_id
    )
  );

  RETURN jsonb_build_object('ok', true, 'id', decision_id);
END;
$$;

COMMENT ON FUNCTION ciceron.decide_review(uuid, uuid, text, text, text) IS
  'Service-role: set_actor, refuse already-decided. Policy denials return jsonb ok:false with audit committed; success returns {ok:true,id}.';

REVOKE ALL ON FUNCTION ciceron.decide_review(uuid, uuid, text, text, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION ciceron.decide_review(uuid, uuid, text, text, text)
  TO service_role;

-- ---------------------------------------------------------------------------
-- save_review_edit — RETURNS jsonb; matter_member denials audit + return
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS ciceron.save_review_edit(uuid, uuid, text);

CREATE OR REPLACE FUNCTION ciceron.save_review_edit(
  p_actor uuid,
  p_task_id uuid,
  p_edited_body text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ciceron
AS $$
DECLARE
  is_persona boolean;
  task ciceron.review_tasks%ROWTYPE;
  matter_firm uuid;
  actor_role text;
  next_version int;
  version_id uuid;
BEGIN
  IF p_actor IS NULL OR p_task_id IS NULL THEN
    RAISE EXCEPTION 'actor and task id are required'
      USING ERRCODE = 'check_violation';
  END IF;

  IF p_edited_body IS NULL OR length(trim(p_edited_body)) = 0 THEN
    RAISE EXCEPTION 'edited body is required'
      USING ERRCODE = 'check_violation';
  END IF;

  PERFORM ciceron.set_actor(p_actor);

  SELECT * INTO task
  FROM ciceron.review_tasks
  WHERE id = p_task_id
  FOR UPDATE;

  IF task.id IS NULL THEN
    RAISE EXCEPTION 'review task not found'
      USING ERRCODE = 'check_violation';
  END IF;

  IF task.status = 'cerrado' THEN
    RAISE EXCEPTION 'review task already decided'
      USING ERRCODE = 'check_violation';
  END IF;

  IF task.draft_id IS NULL THEN
    RAISE EXCEPTION 'review task has no draft'
      USING ERRCODE = 'check_violation';
  END IF;

  SELECT m.firm_id INTO matter_firm
  FROM ciceron.matters m
  WHERE m.id = task.matter_id;

  SELECT ms.role INTO actor_role
  FROM ciceron.memberships ms
  WHERE ms.firm_id = matter_firm
    AND ms.user_id = p_actor;

  IF actor_role IS NULL OR actor_role NOT IN ('socio', 'asociado', 'admin') THEN
    RAISE EXCEPTION 'only socio, asociado, or admin may edit reviews'
      USING ERRCODE = 'check_violation';
  END IF;

  IF NOT ciceron.is_matter_member(task.matter_id) THEN
    PERFORM ciceron.write_audit_event(
      matter_firm, p_actor, 'draft_edit', 'review_tasks', p_task_id,
      jsonb_build_object('draft_id', task.draft_id),
      'denied', 'matter_member', 'Actor is not a member of this matter',
      jsonb_build_object('entity_type', 'review_tasks', 'entity_id', p_task_id)
    );
    RETURN jsonb_build_object(
      'ok', false,
      'policy_id', 'matter_member',
      'policy_reason', 'Actor is not a member of this matter'
    );
  END IF;

  is_persona := EXISTS (
    SELECT 1 FROM ciceron.demo_personas dp WHERE dp.id = p_actor
  );

  SELECT COALESCE(MAX(dv.version_number), 0) + 1 INTO next_version
  FROM ciceron.draft_versions dv
  WHERE dv.draft_id = task.draft_id;

  IF is_persona THEN
    INSERT INTO ciceron.draft_versions (
      draft_id, author_type, author_user_id, author_persona,
      body, ai_output_id, version_number
    ) VALUES (
      task.draft_id, 'human', NULL, p_actor,
      p_edited_body, task.ai_output_id, next_version
    )
    RETURNING id INTO version_id;
  ELSE
    INSERT INTO ciceron.draft_versions (
      draft_id, author_type, author_user_id, author_persona,
      body, ai_output_id, version_number
    ) VALUES (
      task.draft_id, 'human', p_actor, NULL,
      p_edited_body, task.ai_output_id, next_version
    )
    RETURNING id INTO version_id;
  END IF;

  UPDATE ciceron.review_tasks
  SET status = 'en_curso', updated_at = now()
  WHERE id = p_task_id;

  PERFORM ciceron.write_audit_event(
    matter_firm, p_actor, 'draft_edit', 'draft_versions', version_id,
    jsonb_build_object('review_task_id', p_task_id, 'draft_id', task.draft_id),
    'allowed', 'can_review_matter', 'Human draft version saved',
    jsonb_build_object(
      'entity_type', 'draft_versions',
      'entity_id', version_id,
      'version_id', version_id
    )
  );

  RETURN jsonb_build_object('ok', true, 'id', version_id);
END;
$$;

COMMENT ON FUNCTION ciceron.save_review_edit(uuid, uuid, text) IS
  'Service-role: save human draft_version without closing. Matter denials return jsonb ok:false with audit.';

REVOKE ALL ON FUNCTION ciceron.save_review_edit(uuid, uuid, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION ciceron.save_review_edit(uuid, uuid, text)
  TO service_role;

-- ---------------------------------------------------------------------------
-- reassign_review RPC — RETURNS jsonb; matter_member denials audit + return
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS ciceron.reassign_review(uuid, uuid, uuid);

CREATE OR REPLACE FUNCTION ciceron.reassign_review(
  p_actor uuid,
  p_task_id uuid,
  p_new_assignee uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ciceron
AS $$
DECLARE
  task ciceron.review_tasks%ROWTYPE;
  matter_firm uuid;
  actor_role text;
  new_is_persona boolean;
  assignee_name text;
BEGIN
  IF p_actor IS NULL OR p_task_id IS NULL OR p_new_assignee IS NULL THEN
    RAISE EXCEPTION 'actor, task id and new assignee are required'
      USING ERRCODE = 'check_violation';
  END IF;

  PERFORM ciceron.set_actor(p_actor);

  SELECT * INTO task
  FROM ciceron.review_tasks
  WHERE id = p_task_id
  FOR UPDATE;

  IF task.id IS NULL THEN
    RAISE EXCEPTION 'review task not found'
      USING ERRCODE = 'check_violation';
  END IF;

  IF task.status = 'cerrado' THEN
    RAISE EXCEPTION 'review task already decided'
      USING ERRCODE = 'check_violation';
  END IF;

  SELECT m.firm_id INTO matter_firm
  FROM ciceron.matters m
  WHERE m.id = task.matter_id;

  SELECT ms.role INTO actor_role
  FROM ciceron.memberships ms
  WHERE ms.firm_id = matter_firm
    AND ms.user_id = p_actor;

  IF actor_role IS NULL OR actor_role NOT IN ('socio', 'asociado', 'admin') THEN
    RAISE EXCEPTION 'only socio, asociado, or admin may reassign reviews'
      USING ERRCODE = 'check_violation';
  END IF;

  IF NOT ciceron.is_matter_member(task.matter_id) THEN
    PERFORM ciceron.write_audit_event(
      matter_firm, p_actor, 'review_reassign', 'review_tasks', p_task_id,
      jsonb_build_object('new_assignee', p_new_assignee),
      'denied', 'matter_member', 'Actor is not a member of this matter',
      jsonb_build_object('entity_type', 'review_tasks', 'entity_id', p_task_id)
    );
    RETURN jsonb_build_object(
      'ok', false,
      'policy_id', 'matter_member',
      'policy_reason', 'Actor is not a member of this matter'
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM ciceron.memberships ms
    WHERE ms.firm_id = matter_firm
      AND ms.user_id = p_new_assignee
      AND ms.role IN ('socio', 'asociado', 'admin')
  ) THEN
    RAISE EXCEPTION 'new assignee must be an authorised reviewer in the firm'
      USING ERRCODE = 'check_violation';
  END IF;

  new_is_persona := EXISTS (
    SELECT 1 FROM ciceron.demo_personas dp WHERE dp.id = p_new_assignee
  );

  IF new_is_persona THEN
    UPDATE ciceron.review_tasks
    SET assignee_id = NULL,
        assignee_persona = p_new_assignee,
        status = 'pendiente',
        updated_at = now()
    WHERE id = p_task_id;

    SELECT dp.display_name INTO assignee_name
    FROM ciceron.demo_personas dp
    WHERE dp.id = p_new_assignee;

    INSERT INTO ciceron.in_app_notifications (
      firm_id, recipient_id, recipient_persona, kind, title, body,
      entity_type, entity_id
    ) VALUES (
      matter_firm, NULL, p_new_assignee, 'review_reassigned',
      'Nueva tarea de revisión',
      'Se le reasignó una tarea de revisión: ' || COALESCE(task.title, 'sin título'),
      'review_tasks', p_task_id
    );
  ELSE
    UPDATE ciceron.review_tasks
    SET assignee_id = p_new_assignee,
        assignee_persona = NULL,
        status = 'pendiente',
        updated_at = now()
    WHERE id = p_task_id;

    INSERT INTO ciceron.in_app_notifications (
      firm_id, recipient_id, recipient_persona, kind, title, body,
      entity_type, entity_id
    ) VALUES (
      matter_firm, p_new_assignee, NULL, 'review_reassigned',
      'Nueva tarea de revisión',
      'Se le reasignó una tarea de revisión: ' || COALESCE(task.title, 'sin título'),
      'review_tasks', p_task_id
    );
  END IF;

  PERFORM ciceron.write_audit_event(
    matter_firm, p_actor, 'review_reassign', 'review_tasks', p_task_id,
    jsonb_build_object('new_assignee', p_new_assignee, 'assignee_name', assignee_name),
    'allowed', 'can_review_matter', 'Review task reassigned',
    jsonb_build_object('entity_type', 'review_tasks', 'entity_id', p_task_id)
  );

  RETURN jsonb_build_object('ok', true);
END;
$$;

COMMENT ON FUNCTION ciceron.reassign_review(uuid, uuid, uuid) IS
  'Service-role: reassign open review task. Matter denials return jsonb ok:false with audit.';

REVOKE ALL ON FUNCTION ciceron.reassign_review(uuid, uuid, uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION ciceron.reassign_review(uuid, uuid, uuid)
  TO service_role;

-- ---------------------------------------------------------------------------
-- create_delivery — sole write path; RETURNS jsonb; denials commit audit
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS ciceron.create_delivery(uuid, uuid, uuid, text, text, text, text, boolean);

CREATE OR REPLACE FUNCTION ciceron.create_delivery(
  p_actor uuid,
  p_ai_output_id uuid,
  p_matter_id uuid,
  p_channel text,
  p_recipient text,
  p_subject text,
  p_body text,
  p_confirm boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ciceron
AS $$
DECLARE
  is_persona boolean;
  matter_firm uuid;
  actor_role text;
  v_tier int;
  decision_id uuid;
  delivery_id uuid;
  allowlist text[];
  simulated boolean := true;
BEGIN
  IF p_actor IS NULL OR p_ai_output_id IS NULL OR p_matter_id IS NULL THEN
    RAISE EXCEPTION 'actor, ai_output and matter are required'
      USING ERRCODE = 'check_violation';
  END IF;

  IF p_channel IS NULL OR length(trim(p_channel)) = 0 THEN
    RAISE EXCEPTION 'channel is required'
      USING ERRCODE = 'check_violation';
  END IF;

  IF p_confirm IS NOT TRUE THEN
    RAISE EXCEPTION 'explicit confirm required'
      USING ERRCODE = 'check_violation';
  END IF;

  PERFORM ciceron.set_actor(p_actor);

  SELECT m.firm_id INTO matter_firm
  FROM ciceron.matters m
  WHERE m.id = p_matter_id;

  IF matter_firm IS NULL THEN
    RAISE EXCEPTION 'matter not found'
      USING ERRCODE = 'check_violation';
  END IF;

  SELECT ms.role INTO actor_role
  FROM ciceron.memberships ms
  WHERE ms.firm_id = matter_firm
    AND ms.user_id = p_actor;

  IF actor_role IS NULL OR actor_role NOT IN ('socio', 'asociado', 'admin') THEN
    PERFORM ciceron.write_audit_event(
      matter_firm, p_actor, 'delivery_create', 'ai_outputs', p_ai_output_id,
      jsonb_build_object('matter_id', p_matter_id, 'actor_role', actor_role),
      'denied', 'role', 'Solo socio, asociado o admin puede crear entregas',
      jsonb_build_object('entity_type', 'ai_outputs', 'entity_id', p_ai_output_id)
    );
    RETURN jsonb_build_object(
      'ok', false,
      'policy_id', 'role',
      'policy_reason', 'Solo socio, asociado o admin puede crear entregas'
    );
  END IF;

  IF NOT ciceron.is_matter_member(p_matter_id) THEN
    PERFORM ciceron.write_audit_event(
      matter_firm, p_actor, 'delivery_create', 'ai_outputs', p_ai_output_id,
      jsonb_build_object('matter_id', p_matter_id),
      'denied', 'matter_member', 'Actor is not a member of this matter',
      jsonb_build_object('entity_type', 'ai_outputs', 'entity_id', p_ai_output_id)
    );
    RETURN jsonb_build_object(
      'ok', false,
      'policy_id', 'matter_member',
      'policy_reason', 'Actor is not a member of this matter'
    );
  END IF;

  SELECT o.tier INTO v_tier
  FROM ciceron.ai_outputs o
  WHERE o.id = p_ai_output_id;

  IF v_tier IS NULL THEN
    RAISE EXCEPTION 'ai_output not found'
      USING ERRCODE = 'check_violation';
  END IF;

  SELECT rd.id INTO decision_id
  FROM ciceron.review_decisions rd
  WHERE rd.ai_output_id = p_ai_output_id
    AND rd.matter_id = p_matter_id
    AND rd.decision IN ('approved', 'corrected')
  ORDER BY rd.created_at DESC
  LIMIT 1;

  IF v_tier = 2 AND decision_id IS NULL THEN
    RAISE EXCEPTION 'tier 2 delivery requires an approved review decision'
      USING ERRCODE = 'check_violation';
  END IF;

  IF EXISTS (
    SELECT 1 FROM ciceron.deliveries d
    WHERE d.ai_output_id = p_ai_output_id
      AND d.matter_id = p_matter_id
  ) THEN
    PERFORM ciceron.write_audit_event(
      matter_firm, p_actor, 'delivery_create', 'ai_outputs', p_ai_output_id,
      jsonb_build_object('matter_id', p_matter_id),
      'denied', 'delivery_exists', 'A delivery already exists for this approved output',
      jsonb_build_object('entity_type', 'ai_outputs', 'entity_id', p_ai_output_id)
    );
    RETURN jsonb_build_object(
      'ok', false,
      'policy_id', 'delivery_exists',
      'policy_reason', 'A delivery already exists for this approved output'
    );
  END IF;

  SELECT COALESCE(fs.email_allowlist, '{}'::text[])
    INTO allowlist
  FROM ciceron.firm_settings fs
  WHERE fs.firm_id = matter_firm;

  IF allowlist IS NULL THEN
    allowlist := '{}'::text[];
  END IF;

  IF lower(p_channel) = 'email'
     AND p_recipient IS NOT NULL
     AND p_recipient = ANY (allowlist) THEN
    simulated := false;
  ELSE
    simulated := true;
  END IF;

  is_persona := EXISTS (
    SELECT 1 FROM ciceron.demo_personas dp WHERE dp.id = p_actor
  );

  IF is_persona THEN
    INSERT INTO ciceron.deliveries (
      matter_id, ai_output_id, channel, delivered_by, delivered_by_persona,
      review_decision_id, recipient, subject, body_snapshot, is_simulated
    ) VALUES (
      p_matter_id, p_ai_output_id, p_channel, NULL, p_actor,
      decision_id, p_recipient, p_subject, p_body, simulated
    )
    RETURNING id INTO delivery_id;
  ELSE
    INSERT INTO ciceron.deliveries (
      matter_id, ai_output_id, channel, delivered_by, delivered_by_persona,
      review_decision_id, recipient, subject, body_snapshot, is_simulated
    ) VALUES (
      p_matter_id, p_ai_output_id, p_channel, p_actor, NULL,
      decision_id, p_recipient, p_subject, p_body, simulated
    )
    RETURNING id INTO delivery_id;
  END IF;

  IF v_tier = 2 THEN
    UPDATE ciceron.ai_outputs
    SET status = 'entregado', updated_at = now()
    WHERE id = p_ai_output_id;
  END IF;

  PERFORM ciceron.write_audit_event(
    matter_firm, p_actor, 'delivery', 'deliveries', delivery_id,
    jsonb_build_object(
      'channel', p_channel,
      'recipient', p_recipient,
      'is_simulated', simulated,
      'ai_output_id', p_ai_output_id,
      'review_decision_id', decision_id
    ),
    'allowed', 'create_delivery', 'Delivery recorded',
    jsonb_build_object('entity_type', 'deliveries', 'entity_id', delivery_id)
  );

  RETURN jsonb_build_object('ok', true, 'id', delivery_id);
END;
$$;

COMMENT ON FUNCTION ciceron.create_delivery(uuid, uuid, uuid, text, text, text, text, boolean) IS
  'Sole service-role path to insert deliveries. Policy denials return jsonb ok:false with audit committed.';

REVOKE ALL ON FUNCTION ciceron.create_delivery(uuid, uuid, uuid, text, text, text, text, boolean)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION ciceron.create_delivery(uuid, uuid, uuid, text, text, text, text, boolean)
  TO service_role;
