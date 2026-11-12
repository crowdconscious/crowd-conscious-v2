-- 324_ciceron_freshness_deadlines.sql
-- Fix refresh_demo_dates so sample deadlines land at ~2/6/14 business days
-- from today (none overdue). Fix Décimo spelling. Ensure sample events.
-- Seed UUIDs use e4 prefix. Agents do NOT apply to production.
-- Pure TS mirror: lib/ciceron/case-files/demo-freshness.ts (offsets 2/6/14).

CREATE OR REPLACE FUNCTION ciceron.add_business_days(p_start date, p_days int)
RETURNS date
LANGUAGE plpgsql
STABLE
SET search_path = ciceron, public
AS $$
DECLARE
  cursor date := p_start;
  counted int := 0;
BEGIN
  IF p_days IS NULL OR p_days < 1 THEN
    RAISE EXCEPTION 'p_days must be >= 1';
  END IF;
  WHILE counted < p_days LOOP
    cursor := cursor + 1;
    -- Skip weekends and MX non_working_days (jurisdiction MX)
    IF EXTRACT(ISODOW FROM cursor) < 6
       AND NOT EXISTS (
         SELECT 1 FROM ciceron.non_working_days n
         WHERE n.calendar_date = cursor
           AND n.jurisdiction = 'MX'
       )
    THEN
      counted := counted + 1;
    END IF;
  END LOOP;
  RETURN cursor;
END;
$$;

REVOKE ALL ON FUNCTION ciceron.add_business_days(date, int) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION ciceron.add_business_days(date, int) TO service_role;

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

-- Spelling fix
UPDATE ciceron.case_files
SET court_name = replace(court_name, 'Juzgado Decimo', 'Juzgado Décimo')
WHERE is_sample = true AND court_name ILIKE '%Decimo%';

UPDATE ciceron.case_events
SET court_name = replace(court_name, 'Juzgado Decimo', 'Juzgado Décimo')
WHERE is_sample = true AND court_name ILIKE '%Decimo%';

-- Extra sample events so at most one case reads «Sin actuaciones»
-- (e4… UUIDs). Idempotent inserts.
INSERT INTO ciceron.case_events (
  id, case_file_id, event_type, occurred_at, summary, raw_payload,
  is_sample, capture_kind, event_text, ai_summary
)
SELECT
  v.id, v.case_file_id, v.event_type, v.occurred_at, v.summary,
  jsonb_build_object('source', 'sample', 'label', 'Datos de demostración'),
  true, 'sample', v.event_text, v.ai_summary
FROM (
  VALUES
    (
      'e4000000-0000-4000-8000-000000000101'::uuid,
      'f1000000-0000-4000-8000-000000000003'::uuid,
      'acuerdo',
      timestamptz '2026-10-20 12:00:00-06',
      'Datos de demostración. Se admite a trámite la demanda.',
      'Datos de demostración. Acuerdo de admisión.',
      'Datos de demostración. Acuerdo de admisión.'
    ),
    (
      'e4000000-0000-4000-8000-000000000102'::uuid,
      'f1000000-0000-4000-8000-000000000003'::uuid,
      'sentencia',
      timestamptz '2026-11-01 12:00:00-06',
      'Datos de demostración. Sentencia interlocutoria de muestra.',
      'Datos de demostración. Última resolución de muestra.',
      'Datos de demostración. Última resolución de muestra.'
    ),
    (
      'e4000000-0000-4000-8000-000000000103'::uuid,
      'f1000000-0000-4000-8000-000000000004'::uuid,
      'notificacion_demanda',
      timestamptz '2026-10-25 15:00:00-06',
      'Datos de demostración. Notificación de demanda.',
      'Datos de demostración. Notificación.',
      'Datos de demostración. Notificación.'
    ),
    (
      'e4000000-0000-4000-8000-000000000104'::uuid,
      'f1000000-0000-4000-8000-000000000004'::uuid,
      'sentencia',
      timestamptz '2026-11-02 16:00:00-06',
      'Datos de demostración. Última resolución (auto).',
      'Datos de demostración. Última resolución.',
      'Datos de demostración. Última resolución.'
    ),
    (
      'e4000000-0000-4000-8000-000000000105'::uuid,
      'f1000000-0000-4000-8000-000000000005'::uuid,
      'acuerdo',
      timestamptz '2026-10-28 11:00:00-06',
      'Datos de demostración. Acuerdo de radicación.',
      'Datos de demostración. Acuerdo.',
      'Datos de demostración. Acuerdo.'
    ),
    (
      'e4000000-0000-4000-8000-000000000106'::uuid,
      'f1000000-0000-4000-8000-000000000005'::uuid,
      'sentencia',
      timestamptz '2026-11-04 11:00:00-06',
      'Datos de demostración. Última resolución de muestra.',
      'Datos de demostración. Última resolución.',
      'Datos de demostración. Última resolución.'
    ),
    (
      'e4000000-0000-4000-8000-000000000107'::uuid,
      'f1000000-0000-4000-8000-000000000006'::uuid,
      'audiencia',
      timestamptz '2026-10-30 17:00:00-06',
      'Datos de demostración. Audiencia preliminar.',
      'Datos de demostración. Audiencia.',
      'Datos de demostración. Audiencia.'
    ),
    (
      'e4000000-0000-4000-8000-000000000108'::uuid,
      'f1000000-0000-4000-8000-000000000006'::uuid,
      'sentencia',
      timestamptz '2026-11-05 17:00:00-06',
      'Datos de demostración. Última resolución de muestra.',
      'Datos de demostración. Última resolución.',
      'Datos de demostración. Última resolución.'
    ),
    (
      'e4000000-0000-4000-8000-000000000109'::uuid,
      'f1000000-0000-4000-8000-000000000007'::uuid,
      'acuerdo',
      timestamptz '2026-10-15 10:00:00-06',
      'Datos de demostración. Acuerdo inicial.',
      'Datos de demostración. Acuerdo.',
      'Datos de demostración. Acuerdo.'
    ),
    (
      'e4000000-0000-4000-8000-000000000110'::uuid,
      'f1000000-0000-4000-8000-000000000007'::uuid,
      'sentencia',
      timestamptz '2026-10-29 10:00:00-06',
      'Datos de demostración. Última resolución de muestra.',
      'Datos de demostración. Última resolución.',
      'Datos de demostración. Última resolución.'
    ),
    (
      'e4000000-0000-4000-8000-000000000111'::uuid,
      'f1000000-0000-4000-8000-000000000002'::uuid,
      'sentencia',
      timestamptz '2026-11-06 12:00:00-06',
      'Datos de demostración. Última resolución de muestra.',
      'Datos de demostración. Última resolución.',
      'Datos de demostración. Última resolución.'
    ),
    (
      'e4000000-0000-4000-8000-000000000112'::uuid,
      'f1000000-0000-4000-8000-000000000001'::uuid,
      'sentencia',
      timestamptz '2026-11-07 12:00:00-06',
      'Datos de demostración. Última resolución de muestra.',
      'Datos de demostración. Última resolución.',
      'Datos de demostración. Última resolución.'
    )
) AS v(id, case_file_id, event_type, occurred_at, summary, event_text, ai_summary)
WHERE EXISTS (SELECT 1 FROM ciceron.case_files cf WHERE cf.id = v.case_file_id)
  AND NOT EXISTS (SELECT 1 FROM ciceron.case_events e WHERE e.id = v.id);
