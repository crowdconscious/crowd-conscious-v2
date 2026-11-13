-- Rollback 328_ciceron_boletines_demo.sql
-- Removes demo bulletin seed + coordinador persona.
-- Restores refresh_demo_dates to the live 324 body and reset_demo_firm to the 322 body.

DELETE FROM ciceron.bulletin_hits
WHERE firm_id = 'a1000000-0000-4000-8000-000000000001'::uuid AND is_demo = true;
DELETE FROM ciceron.bulletin_entries
WHERE firm_id = 'a1000000-0000-4000-8000-000000000001'::uuid AND is_demo = true;
DELETE FROM ciceron.bulletin_manual_checks
WHERE firm_id = 'a1000000-0000-4000-8000-000000000001'::uuid AND is_demo = true;
DELETE FROM ciceron.bulletin_runs
WHERE firm_id = 'a1000000-0000-4000-8000-000000000001'::uuid AND is_demo = true;
DELETE FROM ciceron.bulletin_matter_catalogue
WHERE firm_id = 'a1000000-0000-4000-8000-000000000001'::uuid AND is_demo = true;

DELETE FROM ciceron.case_files
WHERE id IN (
  'f1000000-0000-4000-8000-000000000021'::uuid,
  'f1000000-0000-4000-8000-000000000022'::uuid,
  'f1000000-0000-4000-8000-000000000023'::uuid,
  'f1000000-0000-4000-8000-000000000024'::uuid,
  'f1000000-0000-4000-8000-000000000025'::uuid
);

DELETE FROM ciceron.memberships
WHERE user_id = 'b1000000-0000-4000-8000-000000000006'::uuid;
DELETE FROM ciceron.demo_personas
WHERE id = 'b1000000-0000-4000-8000-000000000006'::uuid;

-- Restore 324 refresh_demo_dates (without bulletin extensions)
CREATE OR REPLACE FUNCTION ciceron.refresh_demo_dates(
  p_firm_id uuid,
  p_force boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ciceron
AS $$
DECLARE
  today date := (now() AT TIME ZONE 'America/Mexico_City')::date;
  already boolean;
  ev_count int := 0;
  dl_count int := 0;
  anchor date;
  delta int;
  due_dates date[];
  i int;
  dl_ids uuid[];
BEGIN
  IF p_firm_id IS NULL THEN
    RAISE EXCEPTION 'firm_id required';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM ciceron.demo_freshness_runs
    WHERE firm_id = p_firm_id AND run_date = today
  ) INTO already;

  IF already AND NOT COALESCE(p_force, false) THEN
    RETURN jsonb_build_object(
      'ok', true,
      'skipped', true,
      'run_date', today,
      'events_shifted', 0,
      'deadlines_shifted', 0
    );
  END IF;

  SELECT max((e.occurred_at AT TIME ZONE 'America/Mexico_City')::date)
    INTO anchor
  FROM ciceron.case_events e
  JOIN ciceron.case_files cf ON cf.id = e.case_file_id
  WHERE cf.firm_id = p_firm_id
    AND cf.is_sample = true
    AND e.is_sample = true;

  IF anchor IS NULL THEN
    INSERT INTO ciceron.demo_freshness_runs (firm_id, run_date, events_shifted, deadlines_shifted)
    VALUES (p_firm_id, today, 0, 0)
    ON CONFLICT (firm_id, run_date) DO UPDATE
      SET ran_at = now();
    RETURN jsonb_build_object(
      'ok', true, 'skipped', false, 'run_date', today,
      'events_shifted', 0, 'deadlines_shifted', 0, 'note', 'no_sample_events'
    );
  END IF;

  -- Shift events so the latest lands near today-2
  delta := (today - interval '2 days')::date - anchor;

  IF delta <> 0 THEN
    UPDATE ciceron.case_events e
    SET occurred_at = e.occurred_at + make_interval(days => delta)
    FROM ciceron.case_files cf
    WHERE e.case_file_id = cf.id
      AND cf.firm_id = p_firm_id
      AND cf.is_sample = true
      AND e.is_sample = true;
    GET DIAGNOSTICS ev_count = ROW_COUNT;

    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'ciceron' AND table_name = 'simulated_calendar_events'
    ) THEN
      UPDATE ciceron.simulated_calendar_events sce
      SET starts_at = sce.starts_at + make_interval(days => delta),
          ends_at = CASE
            WHEN sce.ends_at IS NULL THEN NULL
            ELSE sce.ends_at + make_interval(days => delta)
          END
      WHERE sce.firm_id = p_firm_id
        AND sce.is_sample = true;
    END IF;
  END IF;

  -- Deadlines: assign explicitly to ~2 / 6 / 14 business days from today (never overdue)
  due_dates := ARRAY[
    ciceron.add_business_days(today, 2),
    ciceron.add_business_days(today, 6),
    ciceron.add_business_days(today, 14)
  ];

  SELECT array_agg(d.id ORDER BY d.due_at, d.id)
    INTO dl_ids
  FROM ciceron.deadlines d
  JOIN ciceron.case_files cf ON cf.id = d.case_file_id
  WHERE cf.firm_id = p_firm_id
    AND cf.is_sample = true
    AND d.is_sample = true;

  IF dl_ids IS NOT NULL THEN
    FOR i IN 1..array_length(dl_ids, 1) LOOP
      UPDATE ciceron.deadlines
      SET due_at = (due_dates[((i - 1) % 3) + 1] + time '23:59:00')
                    AT TIME ZONE 'America/Mexico_City'
      WHERE id = dl_ids[i];
      dl_count := dl_count + 1;
    END LOOP;
  END IF;

  INSERT INTO ciceron.demo_freshness_runs (firm_id, run_date, events_shifted, deadlines_shifted)
  VALUES (p_firm_id, today, ev_count, dl_count)
  ON CONFLICT (firm_id, run_date) DO UPDATE
    SET ran_at = now(),
        events_shifted = EXCLUDED.events_shifted,
        deadlines_shifted = EXCLUDED.deadlines_shifted;

  RETURN jsonb_build_object(
    'ok', true,
    'skipped', false,
    'run_date', today,
    'delta_days', delta,
    'events_shifted', ev_count,
    'deadlines_shifted', dl_count,
    'deadline_offsets_business_days', ARRAY[2, 6, 14]
  );
END;
$$;

COMMENT ON FUNCTION ciceron.refresh_demo_dates(uuid, boolean) IS
  'Re-date sample events; set sample deadlines to ~2/6/14 business days from today. Never touches DOF.';

REVOKE ALL ON FUNCTION ciceron.refresh_demo_dates(uuid, boolean)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION ciceron.refresh_demo_dates(uuid, boolean) TO service_role;


-- Restore 322 reset_demo_firm (without bulletin reset extensions)
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
