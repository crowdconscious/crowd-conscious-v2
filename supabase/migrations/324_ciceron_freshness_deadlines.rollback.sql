-- Rollback 324 — drop seed events + add_business_days; restore 319 refresh_demo_dates.

DELETE FROM ciceron.case_events
WHERE id IN (
  'e4000000-0000-4000-8000-000000000101'::uuid,
  'e4000000-0000-4000-8000-000000000102'::uuid,
  'e4000000-0000-4000-8000-000000000103'::uuid,
  'e4000000-0000-4000-8000-000000000104'::uuid,
  'e4000000-0000-4000-8000-000000000105'::uuid,
  'e4000000-0000-4000-8000-000000000106'::uuid,
  'e4000000-0000-4000-8000-000000000107'::uuid,
  'e4000000-0000-4000-8000-000000000108'::uuid,
  'e4000000-0000-4000-8000-000000000109'::uuid,
  'e4000000-0000-4000-8000-000000000110'::uuid,
  'e4000000-0000-4000-8000-000000000111'::uuid,
  'e4000000-0000-4000-8000-000000000112'::uuid
);

DROP FUNCTION IF EXISTS ciceron.add_business_days(date, int);

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
