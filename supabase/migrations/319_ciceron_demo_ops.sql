-- 319_ciceron_demo_ops.sql
-- Prompt 9: guided story RPCs, demo freshness (no cron), reset_demo_firm, sales view.
-- Additive. Requires 317–318 and Prompt 8 events RPC. Agents do not apply.

-- ---------------------------------------------------------------------------
-- demo_freshness_runs — idempotent once-per-day marker (firm-scoped)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ciceron.demo_freshness_runs (
  firm_id uuid NOT NULL REFERENCES ciceron.firms(id) ON DELETE CASCADE,
  run_date date NOT NULL,
  ran_at timestamptz NOT NULL DEFAULT now(),
  events_shifted int NOT NULL DEFAULT 0,
  deadlines_shifted int NOT NULL DEFAULT 0,
  PRIMARY KEY (firm_id, run_date)
);

COMMENT ON TABLE ciceron.demo_freshness_runs IS
  'Prompt 9: freshness is lazy (session start / reset), never a Vercel cron. At most one run per firm per day.';

ALTER TABLE ciceron.demo_freshness_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ciceron.demo_freshness_runs FORCE ROW LEVEL SECURITY;
REVOKE ALL ON ciceron.demo_freshness_runs FROM PUBLIC, anon, authenticated;
GRANT SELECT ON ciceron.demo_freshness_runs TO authenticated;
GRANT ALL ON ciceron.demo_freshness_runs TO service_role;

DROP POLICY IF EXISTS demo_freshness_admin_select ON ciceron.demo_freshness_runs;
CREATE POLICY demo_freshness_admin_select ON ciceron.demo_freshness_runs
  FOR SELECT TO authenticated
  USING (
    firm_id IN (
      SELECT m.firm_id FROM ciceron.memberships m
      WHERE m.user_id = ciceron.current_actor_id()
        AND m.role IN ('admin', 'socio')
    )
  );

-- ---------------------------------------------------------------------------
-- refresh_demo_dates — re-date sample case events / deadlines relative to today
-- Does NOT touch dof_notes / classifications / matches / chunks (real DOF).
-- ---------------------------------------------------------------------------
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

  -- Anchor = latest sample case_event date for this firm; shift so it lands near today-2
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

    UPDATE ciceron.deadlines d
    SET due_at = d.due_at + make_interval(days => delta)
    FROM ciceron.case_files cf
    WHERE d.case_file_id = cf.id
      AND cf.firm_id = p_firm_id
      AND cf.is_sample = true
      AND d.is_sample = true;
    GET DIAGNOSTICS dl_count = ROW_COUNT;

    -- Simulated calendar events if present
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
    'deadlines_shifted', dl_count
  );
END;
$$;

COMMENT ON FUNCTION ciceron.refresh_demo_dates(uuid, boolean) IS
  'Prompt 9: re-date sample (is_sample) case events/deadlines relative to today. Never touches DOF. No cron.';

REVOKE ALL ON FUNCTION ciceron.refresh_demo_dates(uuid, boolean)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION ciceron.refresh_demo_dates(uuid, boolean) TO service_role;

-- ---------------------------------------------------------------------------
-- reset_demo_firm — admin-only; expire sessions (keep sales history + emails)
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
BEGIN
  IF p_firm_id IS NULL OR p_actor IS NULL THEN
    RAISE EXCEPTION 'firm and actor required';
  END IF;

  SELECT ms.role INTO actor_role
  FROM ciceron.memberships ms
  WHERE ms.firm_id = p_firm_id AND ms.user_id = p_actor;

  IF actor_role IS NULL OR actor_role <> 'admin' THEN
    -- Audit before set_actor when possible; non-members may lack membership for set_actor
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

  -- Expire sessions in place — do not delete (preserve sales history + work_email)
  UPDATE ciceron.demo_sessions
  SET expires_at = now(), updated_at = now()
  WHERE firm_id = p_firm_id
    AND expires_at > now();
  GET DIAGNOSTICS sessions_expired = ROW_COUNT;

  -- Reset invite use counts for this firm
  UPDATE ciceron.invite_codes
  SET use_count = 0, updated_at = now()
  WHERE firm_id = p_firm_id AND is_demo = true;

  -- Re-open sample deadlines that were confirmed in the demo walkthrough
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

  -- Onboarding checklist back to nearly-complete seed shape
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

  -- Freshness force-run (still no DOF touch)
  PERFORM ciceron.refresh_demo_dates(p_firm_id, true);

  PERFORM ciceron.write_audit_event(
    p_firm_id, p_actor, 'demo_reset', 'firms', p_firm_id,
    jsonb_build_object(
      'is_demo', true,
      'sessions_expired', sessions_expired
    ),
    'allowed', NULL, NULL,
    jsonb_build_object('entity_type', 'firms', 'entity_id', p_firm_id)
  );

  RETURN jsonb_build_object(
    'ok', true,
    'sessions_expired', sessions_expired,
    'firm_id', p_firm_id
  );
END;
$$;

COMMENT ON FUNCTION ciceron.reset_demo_firm(uuid, uuid) IS
  'Admin-only: reset demo firm seed state. Expires sessions (keeps history/emails). Never deletes dof_notes.';

REVOKE ALL ON FUNCTION ciceron.reset_demo_firm(uuid, uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION ciceron.reset_demo_firm(uuid, uuid) TO service_role;

-- ---------------------------------------------------------------------------
-- Guided story progress RPCs
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION ciceron.update_guided_story(
  p_token_hash text,
  p_step int,
  p_dismiss boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ciceron
AS $$
DECLARE
  sess ciceron.demo_sessions%ROWTYPE;
  prog ciceron.guided_story_progress%ROWTYPE;
  steps int[];
BEGIN
  IF p_token_hash IS NULL OR p_token_hash !~ '^[0-9a-f]{64}$' THEN
    RETURN jsonb_build_object('ok', false, 'policy_id', 'session_token',
      'policy_reason', 'Sesión no válida.');
  END IF;

  SELECT * INTO sess FROM ciceron.demo_sessions WHERE token_hash = p_token_hash FOR UPDATE;
  IF sess.id IS NULL OR sess.expires_at < now() THEN
    RETURN jsonb_build_object('ok', false, 'policy_id', 'session_expired',
      'policy_reason', 'La sesión de demostración ha expirado.');
  END IF;

  IF COALESCE(p_dismiss, false) THEN
    UPDATE ciceron.demo_sessions SET story_dismissed = true, updated_at = now()
    WHERE id = sess.id;
    UPDATE ciceron.guided_story_progress
    SET dismissed = true, updated_at = now()
    WHERE session_id = sess.id;
    RETURN jsonb_build_object('ok', true, 'dismissed', true);
  END IF;

  IF p_step IS NULL OR p_step < 1 OR p_step > 7 THEN
    RETURN jsonb_build_object('ok', false, 'policy_id', 'story_step',
      'policy_reason', 'El paso del recorrido debe estar entre 1 y 7.');
  END IF;

  INSERT INTO ciceron.guided_story_progress (session_id, firm_id, current_step)
  VALUES (sess.id, sess.firm_id, p_step)
  ON CONFLICT (session_id) DO NOTHING;

  SELECT * INTO prog FROM ciceron.guided_story_progress WHERE session_id = sess.id FOR UPDATE;
  steps := prog.completed_steps;

  IF p_step BETWEEN 1 AND 6 AND NOT (p_step = ANY (steps)) THEN
    steps := array_append(steps, p_step);
  END IF;

  -- Completing step N advances cursor; arriving at 7 marks finished
  UPDATE ciceron.guided_story_progress
  SET current_step = p_step,
      completed_steps = steps,
      completed_at = CASE
        WHEN p_step >= 7 OR cardinality(steps) >= 6 THEN COALESCE(completed_at, now())
        ELSE completed_at
      END,
      dismissed = false,
      updated_at = now()
  WHERE session_id = sess.id;

  -- Mirror into engagement_resume for Prompt 8 «continuar»
  INSERT INTO ciceron.engagement_resume (firm_id, user_id, room, href, label, updated_at)
  VALUES (
    sess.firm_id,
    sess.persona_id,
    'hoy',
    '/ciceron/hoy',
    'guided_step_' || LEAST(p_step, 6)::text,
    now()
  )
  ON CONFLICT (firm_id, user_id) DO UPDATE
    SET room = EXCLUDED.room,
        href = EXCLUDED.href,
        label = EXCLUDED.label,
        updated_at = now();

  RETURN jsonb_build_object(
    'ok', true,
    'current_step', p_step,
    'completed_steps', to_jsonb(steps),
    'completed', (p_step >= 7 OR cardinality(steps) >= 6)
  );
END;
$$;

REVOKE ALL ON FUNCTION ciceron.update_guided_story(text, int, boolean)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION ciceron.update_guided_story(text, int, boolean) TO service_role;

-- ---------------------------------------------------------------------------
-- Extend record_product_event allow-list for Prompt 9 properties
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION ciceron.record_product_event(
  p_name text,
  p_firm_id uuid,
  p_user_id uuid,
  p_properties jsonb DEFAULT '{}'::jsonb,
  p_occurred_at timestamptz DEFAULT now(),
  p_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ciceron
AS $$
DECLARE
  v_id uuid;
  prop_key text;
  prop_val jsonb;
  prop_str text;
BEGIN
  IF p_name IS NULL OR char_length(p_name) < 1 OR char_length(p_name) > 120 THEN
    RAISE EXCEPTION 'invalid event name';
  END IF;

  FOR prop_key, prop_val IN
    SELECT * FROM jsonb_each(COALESCE(p_properties, '{}'::jsonb))
  LOOP
    IF prop_key NOT IN (
      'room', 'surface', 'kind', 'verdict', 'reason_code', 'output_type',
      'decision', 'simulated', 'invite_role', 'source_kind', 'source_id',
      'match_id', 'matter_id', 'client_id', 'watch_profile_id', 'is_demo',
      -- Prompt 9
      'step', 'persona_role', 'story_action', 'invite_id', 'model'
    ) THEN
      RAISE EXCEPTION 'forbidden event property: %', prop_key;
    END IF;

    IF jsonb_typeof(prop_val) = 'string' THEN
      prop_str := prop_val #>> '{}';
      IF prop_str IS NULL OR prop_str !~ '^[A-Za-z0-9_:.-]{1,120}$' THEN
        RAISE EXCEPTION 'invalid event property value for %', prop_key;
      END IF;
    ELSIF jsonb_typeof(prop_val) = 'boolean' THEN
      IF prop_key NOT IN ('simulated', 'is_demo') THEN
        RAISE EXCEPTION 'boolean not allowed for event property: %', prop_key;
      END IF;
    ELSIF jsonb_typeof(prop_val) = 'null' THEN
      CONTINUE;
    ELSE
      RAISE EXCEPTION 'invalid event property type for %', prop_key;
    END IF;
  END LOOP;

  INSERT INTO ciceron.events (id, name, firm_id, user_id, properties, occurred_at)
  VALUES (
    COALESCE(p_id, gen_random_uuid()),
    p_name,
    p_firm_id,
    p_user_id,
    COALESCE(p_properties, '{}'::jsonb),
    COALESCE(p_occurred_at, now())
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION ciceron.record_product_event(text, uuid, uuid, jsonb, timestamptz, uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION ciceron.record_product_event(text, uuid, uuid, jsonb, timestamptz, uuid)
  TO service_role;

-- ---------------------------------------------------------------------------
-- Sales view per invite code (admin / service_role)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW ciceron.sales_invite_progress
  WITH (security_invoker = true)
AS
SELECT
  ic.id AS invite_code_id,
  ic.prospect_label,
  ic.firm_id,
  f.name AS firm_name,
  ic.use_count,
  ic.max_uses,
  ic.expires_at,
  ic.is_active,
  count(DISTINCT ds.id)::int AS sessions_opened,
  coalesce(
    (
      SELECT count(DISTINCT e.properties->>'room')::int
      FROM ciceron.events e
      JOIN ciceron.demo_sessions ds2 ON ds2.firm_id = ic.firm_id
      WHERE e.firm_id = ic.firm_id
        AND e.name = 'room_opened'
        AND e.user_id = ds2.persona_id
        AND ds2.invite_code_id = ic.id
    ),
    0
  ) AS rooms_opened_approx,
  coalesce(
    (
      SELECT max(cardinality(g.completed_steps))
      FROM ciceron.guided_story_progress g
      JOIN ciceron.demo_sessions ds3 ON ds3.id = g.session_id
      WHERE ds3.invite_code_id = ic.id
    ),
    0
  ) AS max_story_steps_completed,
  (
    SELECT count(*)::int
    FROM ciceron.guided_story_progress g
    JOIN ciceron.demo_sessions ds4 ON ds4.id = g.session_id
    WHERE ds4.invite_code_id = ic.id
      AND (g.completed_at IS NOT NULL OR g.current_step >= 7)
  ) AS stories_finished,
  max(ds.last_seen_at) AS last_seen_at
FROM ciceron.invite_codes ic
JOIN ciceron.firms f ON f.id = ic.firm_id
LEFT JOIN ciceron.demo_sessions ds ON ds.invite_code_id = ic.id
GROUP BY ic.id, f.name;

COMMENT ON VIEW ciceron.sales_invite_progress IS
  'Prompt 9 sales view: per invite code — uses, sessions, story steps, rooms. Admin/service_role only.';

REVOKE ALL ON ciceron.sales_invite_progress FROM PUBLIC, anon, authenticated;
GRANT SELECT ON ciceron.sales_invite_progress TO service_role;

-- Mark sessions after lazy freshness
CREATE OR REPLACE FUNCTION ciceron.touch_session_freshness(p_token_hash text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ciceron
AS $$
DECLARE
  sess ciceron.demo_sessions%ROWTYPE;
  today date := (now() AT TIME ZONE 'America/Mexico_City')::date;
  freshen jsonb;
BEGIN
  SELECT * INTO sess FROM ciceron.demo_sessions WHERE token_hash = p_token_hash FOR UPDATE;
  IF sess.id IS NULL OR sess.expires_at < now() THEN
    RETURN jsonb_build_object('ok', false, 'policy_id', 'session_expired',
      'policy_reason', 'La sesión de demostración ha expirado.');
  END IF;

  IF sess.last_freshness_at IS NOT NULL AND sess.last_freshness_at = today THEN
    RETURN jsonb_build_object('ok', true, 'skipped', true, 'run_date', today);
  END IF;

  freshen := ciceron.refresh_demo_dates(sess.firm_id, false);

  UPDATE ciceron.demo_sessions
  SET last_freshness_at = today, last_seen_at = now(), updated_at = now()
  WHERE id = sess.id;

  RETURN jsonb_build_object('ok', true, 'freshness', freshen);
END;
$$;

REVOKE ALL ON FUNCTION ciceron.touch_session_freshness(text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION ciceron.touch_session_freshness(text) TO service_role;
