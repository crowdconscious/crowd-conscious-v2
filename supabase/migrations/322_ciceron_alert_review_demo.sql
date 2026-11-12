-- 322_ciceron_alert_review_demo.sql
-- Pre-demo Group D: four-eyes seed author = Asociado; reset reopens review + clears
-- simulated deliveries. Prompt v2 for client alerts is seeded in 321.
-- Additive. Agents do NOT apply to production.

-- Guided-story draft (f100…134): Asociado edited so Socia can approve (four-eyes).
UPDATE ciceron.draft_versions
SET author_persona = 'b1000000-0000-4000-8000-000000000002'::uuid
WHERE id = 'f1000000-0000-4000-8000-000000000134'::uuid
  AND author_type = 'human';

-- Seeded demo drafts: durable language (no absolute past deadlines; no commercial pitch).
UPDATE ciceron.draft_versions
SET body = $body$Datos de demostración.

Estimada dirección de cumplimiento:

El Diario Oficial publicó modificaciones a las Disposiciones de carácter general aplicables a las instituciones de crédito que amplían el plazo de conservación de registros de operaciones a no menos de diez años. Recomendamos revisar las políticas internas de archivo de Nexora Pagos, confirmar el alcance frente a fondos de pago electrónico y preparar una sesión de adecuación con el equipo de cumplimiento.

Quedamos a sus órdenes.
$body$
WHERE id = 'f1000000-0000-4000-8000-000000000134'::uuid;

-- ---------------------------------------------------------------------------
-- reset_demo_firm — reopen seeded review tasks; remove simulated deliveries
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION ciceron.reset_demo_firm(
  p_firm_id uuid,
  p_actor uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ciceron
AS $$
DECLARE
  actor_role text;
  sessions_expired int := 0;
  deliveries_removed int := 0;
  tasks_reopened int := 0;
BEGIN
  IF p_firm_id IS NULL OR p_actor IS NULL THEN
    RAISE EXCEPTION 'firm and actor required';
  END IF;

  SELECT ms.role INTO actor_role
  FROM ciceron.memberships ms
  WHERE ms.firm_id = p_firm_id AND ms.user_id = p_actor;

  IF actor_role IS NULL OR actor_role <> 'admin' THEN
    IF actor_role IS NOT NULL THEN
      PERFORM ciceron.set_actor(p_actor);
    END IF;
    PERFORM ciceron.write_audit_event(
      p_firm_id, p_actor, 'demo_reset', 'firms', p_firm_id,
      jsonb_build_object('is_demo', true),
      'denied', 'rbac_role',
      'Solo un administrador puede restablecer la demostración.',
      jsonb_build_object('entity_type', 'firms', 'entity_id', p_firm_id)
    );
    RETURN jsonb_build_object(
      'ok', false,
      'policy_id', 'rbac_role',
      'policy_reason', 'Solo un administrador puede restablecer la demostración.'
    );
  END IF;

  PERFORM ciceron.set_actor(p_actor);

  IF NOT EXISTS (
    SELECT 1 FROM ciceron.firms f WHERE f.id = p_firm_id AND f.is_demo = true
  ) THEN
    RETURN jsonb_build_object(
      'ok', false,
      'policy_id', 'demo_firm_only',
      'policy_reason', 'Solo se pueden restablecer despachos de demostración.'
    );
  END IF;

  UPDATE ciceron.demo_sessions
  SET expires_at = now(), updated_at = now()
  WHERE firm_id = p_firm_id
    AND expires_at > now();
  GET DIAGNOSTICS sessions_expired = ROW_COUNT;

  UPDATE ciceron.invite_codes
  SET use_count = 0, updated_at = now()
  WHERE firm_id = p_firm_id AND is_demo = true;

  UPDATE ciceron.deadlines d
  SET status = 'propuesto',
      confirmed_at = NULL,
      confirmed_by = NULL,
      confirmed_by_persona = NULL
  FROM ciceron.case_files cf
  WHERE d.case_file_id = cf.id
    AND cf.firm_id = p_firm_id
    AND cf.is_sample = true
    AND d.is_sample = true
    AND d.status IN ('confirmado', 'descartado');

  -- Remove simulated deliveries for this firm
  DELETE FROM ciceron.deliveries d
  USING ciceron.matters m
  WHERE d.matter_id = m.id
    AND m.firm_id = p_firm_id
    AND d.is_simulated = true;
  GET DIAGNOSTICS deliveries_removed = ROW_COUNT;

  -- Also drop any delivery (simulated or not) that references a demo review
  -- decision, otherwise deleting those decisions fails the FK.
  DELETE FROM ciceron.deliveries d
  USING ciceron.review_decisions rd
  JOIN ciceron.review_tasks rt ON rt.id = rd.review_task_id
  JOIN ciceron.matters m ON m.id = rt.matter_id
  WHERE d.review_decision_id = rd.id
    AND m.firm_id = p_firm_id
    AND rt.is_demo = true;

  -- Clear demo decisions so seeded tasks can be approved again
  DELETE FROM ciceron.review_decisions rd
  USING ciceron.review_tasks rt
  JOIN ciceron.matters m ON m.id = rt.matter_id
  WHERE rd.review_task_id = rt.id
    AND m.firm_id = p_firm_id
    AND rt.is_demo = true;

  -- Reopen seeded review tasks (guided story Step 4 stays en_curso for Socia)
  UPDATE ciceron.review_tasks rt
  SET status = CASE
        WHEN rt.id = 'f1000000-0000-4000-8000-000000000141'::uuid THEN 'en_curso'
        ELSE 'pendiente'
      END,
      updated_at = now()
  FROM ciceron.matters m
  WHERE rt.matter_id = m.id
    AND m.firm_id = p_firm_id
    AND rt.is_demo = true;
  GET DIAGNOSTICS tasks_reopened = ROW_COUNT;

  UPDATE ciceron.ai_outputs ao
  SET status = 'en_revision'
  FROM ciceron.review_tasks rt
  JOIN ciceron.matters m ON m.id = rt.matter_id
  WHERE ao.id = rt.ai_output_id
    AND m.firm_id = p_firm_id
    AND rt.is_demo = true;

  UPDATE ciceron.drafts d
  SET status = 'en_revision', updated_at = now()
  FROM ciceron.review_tasks rt
  JOIN ciceron.matters m ON m.id = rt.matter_id
  WHERE d.id = rt.draft_id
    AND m.firm_id = p_firm_id
    AND rt.is_demo = true;

  -- Keep four-eyes seed: guided draft remains authored by Asociado
  UPDATE ciceron.draft_versions
  SET author_persona = 'b1000000-0000-4000-8000-000000000002'::uuid
  WHERE id = 'f1000000-0000-4000-8000-000000000134'::uuid
    AND author_type = 'human';

  INSERT INTO ciceron.firm_onboarding (
    firm_id, described_client, saw_matched_alert, sent_alert_through_review,
    completed_at, is_demo
  ) VALUES (p_firm_id, true, true, false, NULL, true)
  ON CONFLICT (firm_id) DO UPDATE
    SET described_client = true,
        saw_matched_alert = true,
        sent_alert_through_review = false,
        completed_at = NULL,
        is_demo = true,
        updated_at = now();

  PERFORM ciceron.refresh_demo_dates(p_firm_id, true);

  PERFORM ciceron.write_audit_event(
    p_firm_id, p_actor, 'demo_reset', 'firms', p_firm_id,
    jsonb_build_object(
      'is_demo', true,
      'sessions_expired', sessions_expired,
      'deliveries_removed', deliveries_removed,
      'tasks_reopened', tasks_reopened
    ),
    'allowed', NULL, NULL,
    jsonb_build_object('entity_type', 'firms', 'entity_id', p_firm_id)
  );

  RETURN jsonb_build_object(
    'ok', true,
    'sessions_expired', sessions_expired,
    'deliveries_removed', deliveries_removed,
    'tasks_reopened', tasks_reopened,
    'firm_id', p_firm_id
  );
END;
$$;

COMMENT ON FUNCTION ciceron.reset_demo_firm(uuid, uuid) IS
  'Admin-only: reset demo firm. Expires sessions; reopens demo review tasks; removes simulated deliveries. Never deletes dof_notes. Four-eyes unchanged.';

REVOKE ALL ON FUNCTION ciceron.reset_demo_firm(uuid, uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION ciceron.reset_demo_firm(uuid, uuid) TO service_role;
