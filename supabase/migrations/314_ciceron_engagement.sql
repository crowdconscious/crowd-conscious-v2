-- 314_ciceron_engagement.sql
-- Prompt 8: product events RPC, engagement tables, indicator views, budget thresholds.
-- Additive only. Agents do not apply to production.

-- ---------------------------------------------------------------------------
-- Budget threshold timestamps (alerts at 50 / 80 / 100 %)
-- ---------------------------------------------------------------------------
ALTER TABLE ciceron.firm_ai_budgets
  ADD COLUMN IF NOT EXISTS threshold_alert_50_at timestamptz,
  ADD COLUMN IF NOT EXISTS threshold_alert_80_at timestamptz,
  ADD COLUMN IF NOT EXISTS threshold_alert_100_at timestamptz;

COMMENT ON COLUMN ciceron.firm_ai_budgets.threshold_alert_50_at IS
  'When the firm first crossed 50% of monthly_budget_usd in the current month.';
COMMENT ON COLUMN ciceron.firm_ai_budgets.threshold_alert_80_at IS
  'When the firm first crossed 80% of monthly_budget_usd in the current month.';
COMMENT ON COLUMN ciceron.firm_ai_budgets.threshold_alert_100_at IS
  'When the firm first reached 100% — research pauses; DOF monitoring continues.';

-- ---------------------------------------------------------------------------
-- Firm onboarding checklist (disappears when complete)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ciceron.firm_onboarding (
  firm_id uuid PRIMARY KEY REFERENCES ciceron.firms(id) ON DELETE CASCADE,
  described_client boolean NOT NULL DEFAULT false,
  saw_matched_alert boolean NOT NULL DEFAULT false,
  sent_alert_through_review boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  is_demo boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE ciceron.firm_onboarding IS
  'Onboarding checklist per firm: describe a client, see first matched alert, send one alert through review.';

ALTER TABLE ciceron.firm_onboarding ENABLE ROW LEVEL SECURITY;
ALTER TABLE ciceron.firm_onboarding FORCE ROW LEVEL SECURITY;
REVOKE ALL ON ciceron.firm_onboarding FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE ON ciceron.firm_onboarding TO authenticated;
GRANT ALL ON ciceron.firm_onboarding TO service_role;

DROP POLICY IF EXISTS firm_onboarding_select ON ciceron.firm_onboarding;
CREATE POLICY firm_onboarding_select ON ciceron.firm_onboarding
  FOR SELECT TO authenticated
  USING (firm_id IN (SELECT ciceron.firms_of_current_user()));

DROP POLICY IF EXISTS firm_onboarding_write ON ciceron.firm_onboarding;
CREATE POLICY firm_onboarding_write ON ciceron.firm_onboarding
  FOR ALL TO authenticated
  USING (
    firm_id IN (
      SELECT m.firm_id FROM ciceron.memberships m
      WHERE m.user_id = ciceron.current_actor_id()
        AND m.role IN ('socio', 'admin', 'asociado')
    )
  )
  WITH CHECK (
    firm_id IN (
      SELECT m.firm_id FROM ciceron.memberships m
      WHERE m.user_id = ciceron.current_actor_id()
        AND m.role IN ('socio', 'admin', 'asociado')
    )
  );

DROP TRIGGER IF EXISTS firm_onboarding_set_updated_at ON ciceron.firm_onboarding;
CREATE TRIGGER firm_onboarding_set_updated_at
  BEFORE UPDATE ON ciceron.firm_onboarding
  FOR EACH ROW EXECUTE FUNCTION ciceron.set_updated_at();

-- ---------------------------------------------------------------------------
-- Morning briefing preview log (once-a-day empty state; no cron)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ciceron.briefing_previews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL REFERENCES ciceron.firms(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  preview_date date NOT NULL,
  kind text NOT NULL CHECK (kind IN ('morning', 'weekly_socio')),
  line_count int NOT NULL DEFAULT 0,
  empty_state boolean NOT NULL DEFAULT false,
  reviewed_count int NOT NULL DEFAULT 0,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  email_simulated boolean NOT NULL DEFAULT true,
  is_demo boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (firm_id, user_id, preview_date, kind)
);

COMMENT ON TABLE ciceron.briefing_previews IS
  'On-demand briefing/weekly summary previews. No scheduled cron. Email only if firm_settings.email_allowlist is non-empty (demo: empty → simulated).';

ALTER TABLE ciceron.briefing_previews ENABLE ROW LEVEL SECURITY;
ALTER TABLE ciceron.briefing_previews FORCE ROW LEVEL SECURITY;
REVOKE ALL ON ciceron.briefing_previews FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE ON ciceron.briefing_previews TO authenticated;
GRANT ALL ON ciceron.briefing_previews TO service_role;

DROP POLICY IF EXISTS briefing_previews_select ON ciceron.briefing_previews;
CREATE POLICY briefing_previews_select ON ciceron.briefing_previews
  FOR SELECT TO authenticated
  USING (
    firm_id IN (SELECT ciceron.firms_of_current_user())
    AND user_id = ciceron.current_actor_id()
  );

DROP POLICY IF EXISTS briefing_previews_insert ON ciceron.briefing_previews;
CREATE POLICY briefing_previews_insert ON ciceron.briefing_previews
  FOR INSERT TO authenticated
  WITH CHECK (
    firm_id IN (SELECT ciceron.firms_of_current_user())
    AND user_id = ciceron.current_actor_id()
  );

-- ---------------------------------------------------------------------------
-- Resume cursor («continuar donde lo dejó»)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ciceron.engagement_resume (
  firm_id uuid NOT NULL REFERENCES ciceron.firms(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  room text NOT NULL CHECK (char_length(room) BETWEEN 1 AND 64),
  href text NOT NULL CHECK (char_length(href) BETWEEN 1 AND 400),
  label text NOT NULL CHECK (char_length(label) BETWEEN 1 AND 64),
  entity_type text,
  entity_id uuid,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (firm_id, user_id)
);

COMMENT ON TABLE ciceron.engagement_resume IS
  'Last meaningful place per user for «continuar donde lo dejó» on Hoy. label is a stable code (not free text / client names); UI resolves display copy.';
COMMENT ON COLUMN ciceron.engagement_resume.label IS
  'Room/label code only (e.g. monitor_dof_open_matches). Never store client or matter names.';

ALTER TABLE ciceron.engagement_resume ENABLE ROW LEVEL SECURITY;
ALTER TABLE ciceron.engagement_resume FORCE ROW LEVEL SECURITY;
REVOKE ALL ON ciceron.engagement_resume FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON ciceron.engagement_resume TO authenticated;
GRANT ALL ON ciceron.engagement_resume TO service_role;

DROP POLICY IF EXISTS engagement_resume_own ON ciceron.engagement_resume;
CREATE POLICY engagement_resume_own ON ciceron.engagement_resume
  FOR ALL TO authenticated
  USING (
    firm_id IN (SELECT ciceron.firms_of_current_user())
    AND user_id = ciceron.current_actor_id()
  )
  WITH CHECK (
    firm_id IN (SELECT ciceron.firms_of_current_user())
    AND user_id = ciceron.current_actor_id()
  );

-- ---------------------------------------------------------------------------
-- record_product_event — SECURITY DEFINER, service_role only
-- App typed helper inserts via service role; this RPC is the explicit gate.
-- Does not revoke existing authenticated INSERT on ciceron.events (additive).
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

  -- Allow-list mirrors lib/ciceron/events.ts ALLOWED_EVENT_PROPERTY_KEYS.
  -- String values must be safe codes/ids (no free text / PII).
  FOR prop_key, prop_val IN
    SELECT * FROM jsonb_each(COALESCE(p_properties, '{}'::jsonb))
  LOOP
    IF prop_key NOT IN (
      'room', 'surface', 'kind', 'verdict', 'reason_code', 'output_type',
      'decision', 'simulated', 'invite_role', 'source_kind', 'source_id',
      'match_id', 'matter_id', 'client_id', 'watch_profile_id', 'is_demo'
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

COMMENT ON FUNCTION ciceron.record_product_event IS
  'Insert one product analytics event. service_role only. Allow-listed property keys; string values ^[A-Za-z0-9_:.-]{1,120}$.';

-- ---------------------------------------------------------------------------
-- Indicator views (security_invoker = true). Admin-only via grants.
-- Rate columns are NULL when sample size is under threshold (app shows —).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW ciceron.metric_activation
  WITH (security_invoker = true)
AS
SELECT
  f.id AS firm_id,
  f.name AS firm_name,
  (SELECT count(*)::int FROM ciceron.watch_profiles wp
     JOIN ciceron.clients c ON c.id = wp.client_id
    WHERE c.firm_id = f.id) AS watch_profile_count,
  first_wp.first_profile_at,
  first_alert.first_alert_opened_at,
  CASE
    WHEN (SELECT count(*) FROM ciceron.watch_profiles wp
            JOIN ciceron.clients c ON c.id = wp.client_id
           WHERE c.firm_id = f.id) >= 3
     AND first_alert.first_alert_opened_at IS NOT NULL
     AND first_wp.first_profile_at IS NOT NULL
     AND first_alert.first_alert_opened_at
         <= first_wp.first_profile_at + interval '48 hours'
    THEN true
    ELSE false
  END AS activated
FROM ciceron.firms f
LEFT JOIN LATERAL (
  SELECT min(wp.created_at) AS first_profile_at
  FROM ciceron.watch_profiles wp
  JOIN ciceron.clients c ON c.id = wp.client_id
  WHERE c.firm_id = f.id
) first_wp ON true
LEFT JOIN LATERAL (
  SELECT min(e.occurred_at) AS first_alert_opened_at
  FROM ciceron.events e
  WHERE e.firm_id = f.id AND e.name = 'alert_opened'
) first_alert ON true;

COMMENT ON VIEW ciceron.metric_activation IS
  'Activation: firm has >=3 watch profiles and a user opened a matched alert within 48h of the first profile.';

CREATE OR REPLACE VIEW ciceron.metric_habit_weekly
  WITH (security_invoker = true)
AS
WITH weeks AS (
  SELECT
    e.firm_id,
    date_trunc('week', e.occurred_at AT TIME ZONE 'America/Mexico_City')::date AS week_start,
    e.user_id,
    (e.occurred_at AT TIME ZONE 'America/Mexico_City')::date AS day_local
  FROM ciceron.events e
  WHERE e.name IN ('room_opened', 'session_started', 'briefing_opened')
    AND (
      e.name <> 'room_opened'
      OR COALESCE(e.properties->>'room', '') = 'hoy'
    )
    AND EXTRACT(ISODOW FROM (e.occurred_at AT TIME ZONE 'America/Mexico_City')) BETWEEN 1 AND 5
),
seat_days AS (
  SELECT firm_id, week_start, user_id, count(DISTINCT day_local)::int AS business_days_opened
  FROM weeks
  GROUP BY firm_id, week_start, user_id
),
seats AS (
  SELECT firm_id, count(*)::int AS seat_count
  FROM ciceron.memberships
  GROUP BY firm_id
)
SELECT
  sd.firm_id,
  f.name AS firm_name,
  sd.week_start,
  s.seat_count,
  count(*) FILTER (WHERE sd.business_days_opened >= 4)::int AS seats_habit,
  CASE
    WHEN COALESCE(s.seat_count, 0) < 3 THEN NULL
    ELSE round(
      (count(*) FILTER (WHERE sd.business_days_opened >= 4)::numeric
        / NULLIF(s.seat_count, 0)),
      4
    )
  END AS habit_share,
  count(*)::int AS sample_size
FROM seat_days sd
JOIN ciceron.firms f ON f.id = sd.firm_id
LEFT JOIN seats s ON s.firm_id = sd.firm_id
GROUP BY sd.firm_id, f.name, sd.week_start, s.seat_count;

COMMENT ON VIEW ciceron.metric_habit_weekly IS
  'Habit: share of seats opening Hoy on >=4 business days in a week. NULL rate when seats < 3.';

CREATE OR REPLACE VIEW ciceron.metric_alert_precision_weekly
  WITH (security_invoker = true)
AS
WITH base AS (
  SELECT
    e.firm_id,
    date_trunc('week', e.occurred_at AT TIME ZONE 'America/Mexico_City')::date AS week_start,
    e.name,
    e.properties
  FROM ciceron.events e
  WHERE e.name IN ('alert_feedback', 'delivery_confirmed', 'draft_created')
)
SELECT
  b.firm_id,
  f.name AS firm_name,
  b.week_start,
  count(*) FILTER (
    WHERE b.name = 'alert_feedback'
      AND COALESCE(b.properties->>'verdict', '') IN ('relevant', 'relevante')
  )::int
  + count(*) FILTER (
    WHERE b.name IN ('draft_created', 'delivery_confirmed')
      AND COALESCE(b.properties->>'output_type', b.properties->>'kind', '') IN ('client_alert', 'alert')
  )::int AS relevant_or_acted,
  greatest(
    count(*) FILTER (WHERE b.name = 'alert_feedback')::int,
    count(*) FILTER (
      WHERE b.name = 'delivery_confirmed'
        AND COALESCE(b.properties->>'output_type', '') = 'client_alert'
    )::int
  ) AS delivered_or_feedback,
  CASE
    WHEN count(*) FILTER (WHERE b.name = 'alert_feedback') < 5 THEN NULL
    ELSE round(
      (
        count(*) FILTER (
          WHERE b.name = 'alert_feedback'
            AND COALESCE(b.properties->>'verdict', '') IN ('relevant', 'relevante')
        )::numeric
        / NULLIF(count(*) FILTER (WHERE b.name = 'alert_feedback'), 0)
      ),
      4
    )
  END AS precision_rate,
  count(*) FILTER (WHERE b.name = 'alert_feedback')::int AS sample_size
FROM base b
JOIN ciceron.firms f ON f.id = b.firm_id
GROUP BY b.firm_id, f.name, b.week_start;

COMMENT ON VIEW ciceron.metric_alert_precision_weekly IS
  'Alert precision: alerts marked relevant or acted on / alerts with feedback. NULL rate when sample < 5.';

CREATE OR REPLACE VIEW ciceron.metric_review_turnaround_weekly
  WITH (security_invoker = true)
AS
SELECT
  m.firm_id,
  f.name AS firm_name,
  date_trunc('week', rd.created_at AT TIME ZONE 'America/Mexico_City')::date AS week_start,
  percentile_cont(0.5) WITHIN GROUP (
    ORDER BY EXTRACT(EPOCH FROM (rd.created_at - rt.created_at))
  ) AS median_seconds,
  count(*)::int AS sample_size,
  CASE
    WHEN count(*) < 3 THEN NULL
    ELSE percentile_cont(0.5) WITHIN GROUP (
      ORDER BY EXTRACT(EPOCH FROM (rd.created_at - rt.created_at))
    )
  END AS median_seconds_or_null
FROM ciceron.review_decisions rd
JOIN ciceron.review_tasks rt ON rt.id = rd.review_task_id
JOIN ciceron.matters m ON m.id = rt.matter_id
JOIN ciceron.firms f ON f.id = m.firm_id
WHERE rd.created_at >= rt.created_at
GROUP BY m.firm_id, f.name, date_trunc('week', rd.created_at AT TIME ZONE 'America/Mexico_City')::date;

COMMENT ON VIEW ciceron.metric_review_turnaround_weekly IS
  'Review turnaround: median seconds from review_task created to decision. NULL median when sample < 3.';

CREATE OR REPLACE VIEW ciceron.metric_value_moments_weekly
  WITH (security_invoker = true)
AS
SELECT
  e.firm_id,
  f.name AS firm_name,
  date_trunc('week', e.occurred_at AT TIME ZONE 'America/Mexico_City')::date AS week_start,
  count(*) FILTER (
    WHERE e.name = 'delivery_confirmed'
      AND COALESCE(e.properties->>'output_type', '') = 'client_alert'
  )::int AS approved_client_alerts,
  count(*) FILTER (WHERE e.name = 'deadline_confirmed')::int AS deadlines_confirmed,
  (
    count(*) FILTER (
      WHERE e.name = 'delivery_confirmed'
        AND COALESCE(e.properties->>'output_type', '') = 'client_alert'
    )
    + count(*) FILTER (WHERE e.name = 'deadline_confirmed')
  )::int AS value_moments,
  count(*)::int AS sample_size
FROM ciceron.events e
JOIN ciceron.firms f ON f.id = e.firm_id
WHERE e.name IN ('delivery_confirmed', 'deadline_confirmed', 'review_decided')
GROUP BY e.firm_id, f.name, date_trunc('week', e.occurred_at AT TIME ZONE 'America/Mexico_City')::date;

COMMENT ON VIEW ciceron.metric_value_moments_weekly IS
  'Value moments: approved client alerts delivered and deadlines confirmed per firm per week.';

CREATE OR REPLACE VIEW ciceron.metric_expansion
  WITH (security_invoker = true)
AS
SELECT
  f.id AS firm_id,
  f.name AS firm_name,
  (SELECT count(*)::int FROM ciceron.clients c WHERE c.firm_id = f.id) AS clients,
  (SELECT count(*)::int FROM ciceron.matters m WHERE m.firm_id = f.id) AS matters,
  (SELECT count(*)::int FROM ciceron.memberships mb WHERE mb.firm_id = f.id) AS seats,
  f.created_at AS firm_created_at
FROM ciceron.firms f;

COMMENT ON VIEW ciceron.metric_expansion IS
  'Expansion: current clients, matters and seats per firm (point-in-time; trend via weekly snapshots in app from events).';

CREATE OR REPLACE VIEW ciceron.metric_cost_weekly
  WITH (security_invoker = true)
AS
SELECT
  ar.firm_id,
  f.name AS firm_name,
  date_trunc('week', ar.created_at AT TIME ZONE 'America/Mexico_City')::date AS week_start,
  coalesce(sum(ar.cost_estimate_usd), 0)::numeric(14, 6) AS cost_usd,
  count(*)::int AS run_count,
  coalesce(sum(ar.input_tokens), 0)::bigint AS input_tokens,
  coalesce(sum(ar.output_tokens), 0)::bigint AS output_tokens
FROM ciceron.ai_runs ar
JOIN ciceron.firms f ON f.id = ar.firm_id
WHERE ar.firm_id IS NOT NULL
GROUP BY ar.firm_id, f.name, date_trunc('week', ar.created_at AT TIME ZONE 'America/Mexico_City')::date;

COMMENT ON VIEW ciceron.metric_cost_weekly IS
  'Cost per firm per week from ai_runs.cost_estimate_usd. Reconciles with raw ai_runs.';

-- Admin-only grants on metric views (service_role; app uses admin client)
DO $$
DECLARE
  v text;
BEGIN
  FOREACH v IN ARRAY ARRAY[
    'metric_activation',
    'metric_habit_weekly',
    'metric_alert_precision_weekly',
    'metric_review_turnaround_weekly',
    'metric_value_moments_weekly',
    'metric_expansion',
    'metric_cost_weekly'
  ] LOOP
    EXECUTE format('REVOKE ALL ON ciceron.%I FROM PUBLIC, anon, authenticated', v);
    EXECUTE format('GRANT SELECT ON ciceron.%I TO service_role', v);
  END LOOP;
END $$;
