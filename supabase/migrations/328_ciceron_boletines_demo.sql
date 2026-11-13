-- 328_ciceron_boletines_demo.sql
-- Prompt B3/B3b: demo seed for bulletins + Coordinador persona.
-- CREATE OR REPLACE: ciceron.refresh_demo_dates (324 body + bulletin block),
--   ciceron.reset_demo_firm (322 body + bulletin reset).
-- Additive otherwise. Agent does not apply to production.

-- ---------------------------------------------------------------------------
-- Coordinador persona (RBAC role = asociado; display name Coordinador)
-- ---------------------------------------------------------------------------
INSERT INTO ciceron.demo_personas (id, firm_id, role, display_name, invite_code, is_demo)
VALUES (
  'b1000000-0000-4000-8000-000000000006'::uuid,
  'a1000000-0000-4000-8000-000000000001'::uuid,
  'asociado',
  'Coordinador Demo Salazar',
  'nr-coordinador-b1006',
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
  'b1000000-0000-4000-8000-000000000006'::uuid,
  'asociado'
)
ON CONFLICT (firm_id, user_id) DO UPDATE SET role = EXCLUDED.role;

-- ---------------------------------------------------------------------------
-- State-court demo case files (current samples are federal)
-- ---------------------------------------------------------------------------
INSERT INTO ciceron.case_files (
  id, firm_id, matter_id, is_sample, court_name, file_number, connector_kind, metadata
) VALUES
  (
    'f1000000-0000-4000-8000-000000000021'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000001'::uuid,
    true,
    'Juzgado Primero Civil de Querétaro',
    '123/2026',
    'sample',
    '{"label":"Datos de demostración","state":"QRO"}'::jsonb
  ),
  (
    'f1000000-0000-4000-8000-000000000022'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000006'::uuid,
    true,
    'Juzgado Segundo Familiar de Querétaro',
    '88/2025',
    'sample',
    '{"label":"Datos de demostración","state":"QRO"}'::jsonb
  ),
  (
    'f1000000-0000-4000-8000-000000000023'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000007'::uuid,
    true,
    'Juzgado Primero de lo Civil — Ciudad Judicial',
    '210/2026',
    'sample',
    '{"label":"Datos de demostración","state":"JAL"}'::jsonb
  ),
  (
    'f1000000-0000-4000-8000-000000000024'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000001'::uuid,
    true,
    'Juzgado 32 Civil CDMX',
    '512/2026',
    'sample',
    '{"label":"Datos de demostración","state":"CDMX"}'::jsonb
  ),
  (
    'f1000000-0000-4000-8000-000000000025'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000003'::uuid,
    true,
    'Juzgado Primero Civil Toluca',
    '901/2026',
    'sample',
    '{"label":"Datos de demostración","state":"MEX"}'::jsonb
  )
ON CONFLICT (id) DO UPDATE
  SET matter_id = EXCLUDED.matter_id,
      court_name = EXCLUDED.court_name,
      file_number = EXCLUDED.file_number,
      is_sample = true,
      metadata = EXCLUDED.metadata;

-- ---------------------------------------------------------------------------
-- Catalogue rows (fictional firm clients only)
-- ---------------------------------------------------------------------------
INSERT INTO ciceron.bulletin_matter_catalogue (
  id, firm_id, matter_id, case_file_id, state_code, state_name,
  court_name, expediente_number, party_name_variants, is_active, is_demo, notes
) VALUES
  (
    'b7100000-0000-4000-8000-000000000001'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000001'::uuid,
    'f1000000-0000-4000-8000-000000000021'::uuid,
    'QRO', 'Querétaro',
    'Juzgado Primero Civil de Querétaro', '123/2026',
    ARRAY['Nexora Pagos, S.A.P.I. de C.V.', 'Nexora Pagos'],
    true, true, 'Datos de demostración'
  ),
  (
    'b7100000-0000-4000-8000-000000000002'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000006'::uuid,
    'f1000000-0000-4000-8000-000000000022'::uuid,
    'QRO', 'Querétaro',
    'Juzgado Segundo Familiar de Querétaro', '88/2025',
    ARRAY[
      'Fondo Pedregal Inmuebles, S.A. de C.V.',
      'Fondo Pedregal',
      'Elena Ficticia Pedregal Demo'
    ],
    true, true, 'Datos de demostración — cliente Fondo Pedregal Inmuebles'
  ),
  (
    'b7100000-0000-4000-8000-000000000003'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000007'::uuid,
    'f1000000-0000-4000-8000-000000000023'::uuid,
    'JAL', 'Jalisco',
    'Juzgado Primero de lo Civil — Ciudad Judicial', '210/2026',
    ARRAY[
      'Alimentos del Bajío Integrados, S.A. de C.V.',
      'Alimentos del Bajío'
    ],
    true, true, 'Datos de demostración — cliente Alimentos del Bajío'
  ),
  (
    'b7100000-0000-4000-8000-000000000004'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000001'::uuid,
    'f1000000-0000-4000-8000-000000000024'::uuid,
    'CDMX', 'Ciudad de México',
    'Juzgado 32 Civil CDMX', '512/2026',
    ARRAY['Nexora Pagos, S.A.P.I. de C.V.'],
    true, true, 'Datos de demostración'
  ),
  (
    'b7100000-0000-4000-8000-000000000005'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000003'::uuid,
    'f1000000-0000-4000-8000-000000000025'::uuid,
    'MEX', 'Estado de México',
    'Juzgado Primero Civil Toluca', '901/2026',
    ARRAY['Distribuidora Farma Sierra, S.A. de C.V.', 'Farma Sierra'],
    true, true, 'Datos de demostración'
  ),
  (
    'b7100000-0000-4000-8000-000000000006'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000004'::uuid,
    NULL,
    'GTO', 'Guanajuato',
    'Juzgado Primero Civil León', '44/2026',
    ARRAY['Viento del Istmo Energía, S.A.P.I. de C.V.'],
    true, true, 'Datos de demostración — manual-check state'
  )
ON CONFLICT (id) DO UPDATE
  SET matter_id = EXCLUDED.matter_id,
      case_file_id = EXCLUDED.case_file_id,
      party_name_variants = EXCLUDED.party_name_variants,
      notes = EXCLUDED.notes,
      is_active = true,
      is_demo = true;

-- ---------------------------------------------------------------------------
-- Demo runs / entries / hits / manual checks (relative to Mexico City today)
-- metadata.demo_day_offset keeps refresh_demo_dates deterministic.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  today date := (now() AT TIME ZONE 'America/Mexico_City')::date;
  firm uuid := 'a1000000-0000-4000-8000-000000000001'::uuid;
  src_qro uuid := 'b7000000-0000-4000-8000-000000000001'::uuid;
  src_jal uuid := 'b7000000-0000-4000-8000-000000000002'::uuid;
  src_cdmx uuid := 'b7000000-0000-4000-8000-000000000003'::uuid;
  src_mex uuid := 'b7000000-0000-4000-8000-000000000004'::uuid;
  src_gto uuid := 'b7000000-0000-4000-8000-000000000005'::uuid;
  src_nl uuid := 'b7000000-0000-4000-8000-000000000006'::uuid;
  run_qro uuid := 'b7200000-0000-4000-8000-000000000001'::uuid;
  run_jal uuid := 'b7200000-0000-4000-8000-000000000002'::uuid;
  run_cdmx uuid := 'b7200000-0000-4000-8000-000000000003'::uuid;
  run_mex uuid := 'b7200000-0000-4000-8000-000000000004'::uuid;
  run_fail uuid := 'b7200000-0000-4000-8000-000000000005'::uuid;
  run_gto uuid := 'b7200000-0000-4000-8000-000000000006'::uuid;
  run_nl uuid := 'b7200000-0000-4000-8000-000000000007'::uuid;
  ent uuid;
BEGIN
  -- Clear prior demo bulletin rows for idempotent re-seed
  DELETE FROM ciceron.bulletin_hits WHERE firm_id = firm AND is_demo = true;
  DELETE FROM ciceron.bulletin_entries WHERE firm_id = firm AND is_demo = true;
  DELETE FROM ciceron.bulletin_manual_checks WHERE firm_id = firm AND is_demo = true;
  DELETE FROM ciceron.bulletin_runs WHERE firm_id = firm AND is_demo = true;

  INSERT INTO ciceron.bulletin_runs (
    id, firm_id, source_id, publication_date, bulletin_number, status,
    entries_parsed, matters_searched, hits_exact, hits_possible, duration_ms,
    parser_version, source_url, is_demo, metadata, started_at, finished_at
  ) VALUES
    (run_qro, firm, src_qro, today, 'QRO-DEMO', 'ok', 3, 6, 2, 0, 4200,
     'boletines-1.0.0-fixture', 'https://www.poderjudicialqro.gob.mx/acuerdos/lista-de-acuerdos-primera-instancia.php',
     true, '{"demo_day_offset":0,"hours_manual_replaced":1.5,"label":"Datos de demostración"}'::jsonb,
     now() - interval '40 minutes', now() - interval '35 minutes'),
    (run_jal, firm, src_jal, today, 'JAL-DEMO', 'ok', 3, 6, 1, 1, 3800,
     'boletines-1.0.0-fixture', 'https://cjj.gob.mx/bulletin',
     true, '{"demo_day_offset":0,"hours_manual_replaced":1.2,"label":"Datos de demostración"}'::jsonb,
     now() - interval '30 minutes', now() - interval '25 minutes'),
    (run_cdmx, firm, src_cdmx, today, 'CDMX-DEMO-512', 'ok', 120, 6, 1, 0, 0,
     'demo-seed', 'https://poderjudicialcdmx.gob.mx/consulta-boletin/',
     true, '{"demo_day_offset":0,"hours_manual_replaced":2.0,"format":"boletin_diario","label":"Datos de demostración"}'::jsonb,
     now() - interval '50 minutes', now() - interval '50 minutes'),
    (run_mex, firm, src_mex, today, 'MEX-LISTA-DEMO', 'ok', 40, 6, 1, 0, 0,
     'demo-seed', 'https://notificacion.pjedomex.gob.mx/',
     true, '{"demo_day_offset":0,"hours_manual_replaced":1.8,"format":"lista_acuerdos","label":"Datos de demostración"}'::jsonb,
     now() - interval '45 minutes', now() - interval '45 minutes'),
    (run_fail, firm, src_cdmx, today, NULL, 'failed', 0, 6, 0, 0, 1200,
     'demo-seed', 'https://poderjudicialcdmx.gob.mx/consulta-boletin/',
     true, '{"demo_day_offset":0,"label":"Datos de demostración","note":"secondary failed probe"}'::jsonb,
     now() - interval '20 minutes', now() - interval '20 minutes'),
    (run_gto, firm, src_gto, today, NULL, 'manual', 0, 6, 0, 0, 0,
     'demo-seed', 'https://www.poderjudicial-gto.gob.mx/modules.php?name=Acuerdos&file=primera_instancia',
     true, '{"demo_day_offset":0,"label":"Datos de demostración"}'::jsonb,
     now() - interval '10 minutes', now() - interval '10 minutes'),
    (run_nl, firm, src_nl, today, NULL, 'manual', 0, 6, 0, 0, 0,
     'demo-seed', 'https://www.pjenl.gob.mx/BoletinJudicial/',
     true, '{"demo_day_offset":0,"label":"Datos de demostración"}'::jsonb,
     now() - interval '8 minutes', now() - interval '8 minutes');

  UPDATE ciceron.bulletin_runs
  SET failure_stage = 'fetch',
      failure_message = 'Datos de demostración. Sondeo fallido (Cloudflare/bloqueo simulado) — nunca presentar como «sin novedades».'
  WHERE id = run_fail;

  UPDATE ciceron.bulletin_runs
  SET failure_stage = 'manual_required',
      failure_message = 'Fuente tier D (captcha): revisión manual pendiente.'
  WHERE id IN (run_gto, run_nl);

  -- QRO exact hit
  INSERT INTO ciceron.bulletin_entries (
    id, firm_id, run_id, source_id, publication_date, court_name, expediente_number,
    party_names, summary, source_url, raw_excerpt, retain_until, is_demo
  ) VALUES (
    'b7300000-0000-4000-8000-000000000001'::uuid,
    firm, run_qro, src_qro, today,
    'Juzgado Primero Civil de Querétaro', '123/2026',
    'Nexora Pagos, S.A.P.I. de C.V. / Comercial Ficticia Delta, S.A. de C.V.',
    'Se tiene por presentado el escrito de demanda. Datos de demostración.',
    'https://www.poderjudicialqro.gob.mx/acuerdos/lista-de-acuerdos-primera-instancia.php',
    'Datos de demostración — excerpt',
    today + 14, true
  );
  INSERT INTO ciceron.bulletin_hits (
    id, firm_id, run_id, entry_id, catalogue_id, matter_id, case_file_id,
    match_kind, score, reason, review_state, is_demo
  ) VALUES (
    'b7400000-0000-4000-8000-000000000001'::uuid,
    firm, run_qro, 'b7300000-0000-4000-8000-000000000001'::uuid,
    'b7100000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000001'::uuid,
    'f1000000-0000-4000-8000-000000000021'::uuid,
    'exact', 1.0,
    'Coincidencia exacta de expediente (123/2026) y juzgado («Juzgado Primero Civil de Querétaro»).',
    'pendiente', true
  );

  -- QRO second exact
  INSERT INTO ciceron.bulletin_entries (
    id, firm_id, run_id, source_id, publication_date, court_name, expediente_number,
    party_names, summary, source_url, raw_excerpt, retain_until, is_demo
  ) VALUES (
    'b7300000-0000-4000-8000-000000000002'::uuid,
    firm, run_qro, src_qro, today,
    'Juzgado Segundo Familiar de Querétaro', '88/2025',
    'Fondo Pedregal Inmuebles, S.A. de C.V. / Contraparte Demo Arrendamiento',
    'Se señala fecha de audiencia. Datos de demostración.',
    'https://www.poderjudicialqro.gob.mx/acuerdos/lista-de-acuerdos-primera-instancia.php',
    'Datos de demostración — excerpt',
    today + 14, true
  );
  INSERT INTO ciceron.bulletin_hits (
    id, firm_id, run_id, entry_id, catalogue_id, matter_id, case_file_id,
    match_kind, score, reason, review_state, is_demo
  ) VALUES (
    'b7400000-0000-4000-8000-000000000002'::uuid,
    firm, run_qro, 'b7300000-0000-4000-8000-000000000002'::uuid,
    'b7100000-0000-4000-8000-000000000002'::uuid,
    'd1000000-0000-4000-8000-000000000006'::uuid,
    'f1000000-0000-4000-8000-000000000022'::uuid,
    'exact', 1.0,
    'Coincidencia exacta de expediente (88/2025) y juzgado («Juzgado Segundo Familiar de Querétaro»).',
    'pendiente', true
  );

  -- JAL exact + possible
  INSERT INTO ciceron.bulletin_entries (
    id, firm_id, run_id, source_id, publication_date, court_name, expediente_number,
    party_names, summary, source_url, raw_excerpt, retain_until, is_demo
  ) VALUES (
    'b7300000-0000-4000-8000-000000000003'::uuid,
    firm, run_jal, src_jal, today,
    'Juzgado Primero de lo Civil — Ciudad Judicial', '210/2026',
    'Alimentos del Bajío Integrados, S.A. de C.V. / Distribuidora Ficticia Sol',
    'Se admite demanda mercantil. Datos de demostración.',
    'https://cjj.gob.mx/bulletin',
    'Datos de demostración — excerpt',
    today + 14, true
  );
  INSERT INTO ciceron.bulletin_hits (
    id, firm_id, run_id, entry_id, catalogue_id, matter_id, case_file_id,
    match_kind, score, reason, review_state, is_demo
  ) VALUES (
    'b7400000-0000-4000-8000-000000000003'::uuid,
    firm, run_jal, 'b7300000-0000-4000-8000-000000000003'::uuid,
    'b7100000-0000-4000-8000-000000000003'::uuid,
    'd1000000-0000-4000-8000-000000000007'::uuid,
    'f1000000-0000-4000-8000-000000000023'::uuid,
    'exact', 1.0,
    'Coincidencia exacta de expediente (210/2026) y juzgado.',
    'pendiente', true
  );

  INSERT INTO ciceron.bulletin_entries (
    id, firm_id, run_id, source_id, publication_date, court_name, expediente_number,
    party_names, summary, source_url, raw_excerpt, retain_until, is_demo
  ) VALUES (
    'b7300000-0000-4000-8000-000000000004'::uuid,
    firm, run_jal, src_jal, today,
    'Juzgado Familiar de Zapopan', '15/2026',
    'Pedregal Fondo Inmuebles Demo / Demo Contraparte Familiar',
    'Se provee escrito de desahogo. Datos de demostración.',
    'https://cjj.gob.mx/bulletin',
    'Datos de demostración — excerpt',
    today + 14, true
  );
  INSERT INTO ciceron.bulletin_hits (
    id, firm_id, run_id, entry_id, catalogue_id, matter_id, case_file_id,
    match_kind, score, reason, review_state, is_demo
  ) VALUES (
    'b7400000-0000-4000-8000-000000000004'::uuid,
    firm, run_jal, 'b7300000-0000-4000-8000-000000000004'::uuid,
    'b7100000-0000-4000-8000-000000000002'::uuid,
    'd1000000-0000-4000-8000-000000000006'::uuid,
    'f1000000-0000-4000-8000-000000000022'::uuid,
    'possible', 0.86,
    'Posible coincidencia por tokens de nombre de parte (variante demo «Fondo Pedregal Inmuebles»).',
    'pendiente', true
  );

  -- CDMX fictional daily boletin hit
  INSERT INTO ciceron.bulletin_entries (
    id, firm_id, run_id, source_id, publication_date, court_name, expediente_number,
    party_names, summary, source_url, raw_excerpt, retain_until, is_demo
  ) VALUES (
    'b7300000-0000-4000-8000-000000000005'::uuid,
    firm, run_cdmx, src_cdmx, today,
    'Juzgado 32 Civil CDMX', '512/2026',
    'Nexora Pagos, S.A.P.I. de C.V. / Demandado Ficticio Centro',
    'Boletín judicial (demostración): se ordena vista. Datos de demostración.',
    'https://poderjudicialcdmx.gob.mx/consulta-boletin/',
    'Datos de demostración — formato boletín CDMX',
    today + 14, true
  );
  INSERT INTO ciceron.bulletin_hits (
    id, firm_id, run_id, entry_id, catalogue_id, matter_id, case_file_id,
    match_kind, score, reason, review_state, is_demo
  ) VALUES (
    'b7400000-0000-4000-8000-000000000005'::uuid,
    firm, run_cdmx, 'b7300000-0000-4000-8000-000000000005'::uuid,
    'b7100000-0000-4000-8000-000000000004'::uuid,
    'd1000000-0000-4000-8000-000000000001'::uuid,
    'f1000000-0000-4000-8000-000000000024'::uuid,
    'exact', 1.0,
    'Coincidencia exacta de expediente (512/2026) y juzgado (CDMX demo).',
    'en_revision', true
  );

  -- Edomex lista de acuerdos style
  INSERT INTO ciceron.bulletin_entries (
    id, firm_id, run_id, source_id, publication_date, court_name, expediente_number,
    party_names, summary, source_url, raw_excerpt, retain_until, is_demo
  ) VALUES (
    'b7300000-0000-4000-8000-000000000006'::uuid,
    firm, run_mex, src_mex, today,
    'Juzgado Primero Civil Toluca', '901/2026',
    'Distribuidora Farma Sierra, S.A. de C.V. / Contraparte Demo Toluca',
    'Lista de acuerdos (demostración): se admite prueba. Datos de demostración.',
    'https://notificacion.pjedomex.gob.mx/',
    'Datos de demostración — formato lista Edomex',
    today + 14, true
  );
  INSERT INTO ciceron.bulletin_hits (
    id, firm_id, run_id, entry_id, catalogue_id, matter_id, case_file_id,
    match_kind, score, reason, review_state, is_demo
  ) VALUES (
    'b7400000-0000-4000-8000-000000000006'::uuid,
    firm, run_mex, 'b7300000-0000-4000-8000-000000000006'::uuid,
    'b7100000-0000-4000-8000-000000000005'::uuid,
    'd1000000-0000-4000-8000-000000000003'::uuid,
    'f1000000-0000-4000-8000-000000000025'::uuid,
    'exact', 1.0,
    'Coincidencia exacta de expediente (901/2026) y juzgado (Edomex demo).',
    'pendiente', true
  );

  INSERT INTO ciceron.bulletin_manual_checks (
    id, firm_id, source_id, run_id, check_date, status, source_url,
    assigned_to, assigned_by, is_demo
  ) VALUES
    (
      'b7500000-0000-4000-8000-000000000001'::uuid,
      firm, src_gto, run_gto, today, 'asignado',
      'https://www.poderjudicial-gto.gob.mx/modules.php?name=Acuerdos&file=primera_instancia',
      'b1000000-0000-4000-8000-000000000003'::uuid,
      'b1000000-0000-4000-8000-000000000006'::uuid,
      true
    ),
    (
      'b7500000-0000-4000-8000-000000000002'::uuid,
      firm, src_nl, run_nl, today, 'pendiente',
      'https://www.pjenl.gob.mx/BoletinJudicial/',
      NULL, NULL, true
    );

  -- silence unused
  ent := NULL;
END $$;

-- ---------------------------------------------------------------------------
-- CREATE OR REPLACE refresh_demo_dates — 324 body + bulletin demo date block only
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
  bol_count int := 0;
  anchor date;
  delta int;
  due_dates date[];
  i int;
  dl_ids uuid[];
  r record;
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
      'deadlines_shifted', 0,
      'bulletin_rows_refreshed', 0
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
    -- Still refresh demo bulletin dates when the firm has no sample events.
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'ciceron' AND table_name = 'bulletin_runs'
    ) THEN
      FOR r IN
        SELECT id, COALESCE((metadata->>'demo_day_offset')::int, 0) AS off
        FROM ciceron.bulletin_runs
        WHERE firm_id = p_firm_id AND is_demo = true
      LOOP
        UPDATE ciceron.bulletin_runs
        SET publication_date = today + r.off
        WHERE id = r.id;
        bol_count := bol_count + 1;
      END LOOP;

      UPDATE ciceron.bulletin_entries e
      SET publication_date = br.publication_date,
          retain_until = br.publication_date + 14
      FROM ciceron.bulletin_runs br
      WHERE e.run_id = br.id
        AND e.firm_id = p_firm_id
        AND e.is_demo = true;

      UPDATE ciceron.bulletin_manual_checks mc
      SET check_date = today + COALESCE((br.metadata->>'demo_day_offset')::int, 0)
      FROM ciceron.bulletin_runs br
      WHERE mc.run_id = br.id
        AND mc.firm_id = p_firm_id
        AND mc.is_demo = true;

      UPDATE ciceron.bulletin_manual_checks
      SET check_date = today
      WHERE firm_id = p_firm_id
        AND is_demo = true
        AND run_id IS NULL;
    END IF;

    INSERT INTO ciceron.demo_freshness_runs (firm_id, run_date, events_shifted, deadlines_shifted)
    VALUES (p_firm_id, today, 0, 0)
    ON CONFLICT (firm_id, run_date) DO UPDATE
      SET ran_at = now();
    RETURN jsonb_build_object(
      'ok', true, 'skipped', false, 'run_date', today,
      'events_shifted', 0, 'deadlines_shifted', 0,
      'bulletin_rows_refreshed', bol_count,
      'note', 'no_sample_events'
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

  -- Bulletin demo dates: publication_date = today + demo_day_offset
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'ciceron' AND table_name = 'bulletin_runs'
  ) THEN
    FOR r IN
      SELECT id, COALESCE((metadata->>'demo_day_offset')::int, 0) AS off
      FROM ciceron.bulletin_runs
      WHERE firm_id = p_firm_id AND is_demo = true
    LOOP
      UPDATE ciceron.bulletin_runs
      SET publication_date = today + r.off
      WHERE id = r.id;
      bol_count := bol_count + 1;
    END LOOP;

    UPDATE ciceron.bulletin_entries e
    SET publication_date = br.publication_date,
        retain_until = br.publication_date + 14
    FROM ciceron.bulletin_runs br
    WHERE e.run_id = br.id
      AND e.firm_id = p_firm_id
      AND e.is_demo = true;

    UPDATE ciceron.bulletin_manual_checks mc
    SET check_date = today + COALESCE((br.metadata->>'demo_day_offset')::int, 0)
    FROM ciceron.bulletin_runs br
    WHERE mc.run_id = br.id
      AND mc.firm_id = p_firm_id
      AND mc.is_demo = true;

    UPDATE ciceron.bulletin_manual_checks
    SET check_date = today
    WHERE firm_id = p_firm_id
      AND is_demo = true
      AND run_id IS NULL;
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
    'deadline_offsets_business_days', ARRAY[2, 6, 14],
    'bulletin_rows_refreshed', bol_count
  );
END;
$$;

COMMENT ON FUNCTION ciceron.refresh_demo_dates(uuid, boolean) IS
  'Re-date sample events; set sample deadlines to ~2/6/14 business days from today; refresh demo bulletin dates. Never touches DOF. No cron.';

REVOKE ALL ON FUNCTION ciceron.refresh_demo_dates(uuid, boolean)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION ciceron.refresh_demo_dates(uuid, boolean) TO service_role;

-- ---------------------------------------------------------------------------
-- CREATE OR REPLACE reset_demo_firm — also reset bulletin demo review state
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
  bulletin_reset int := 0;
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

  DELETE FROM ciceron.deliveries d
  USING ciceron.matters m
  WHERE d.matter_id = m.id
    AND m.firm_id = p_firm_id
    AND d.is_simulated = true;
  GET DIAGNOSTICS deliveries_removed = ROW_COUNT;

  DELETE FROM ciceron.deliveries d
  USING ciceron.review_decisions rd
  JOIN ciceron.review_tasks rt ON rt.id = rd.review_task_id
  JOIN ciceron.matters m ON m.id = rt.matter_id
  WHERE d.review_decision_id = rd.id
    AND m.firm_id = p_firm_id
    AND rt.is_demo = true;

  DELETE FROM ciceron.review_decisions rd
  USING ciceron.review_tasks rt
  JOIN ciceron.matters m ON m.id = rt.matter_id
  WHERE rd.review_task_id = rt.id
    AND m.firm_id = p_firm_id
    AND rt.is_demo = true;

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

  -- Bulletin demo reset
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'ciceron' AND table_name = 'bulletin_hits'
  ) THEN
    UPDATE ciceron.bulletin_hits
    SET review_state = CASE
          WHEN id = 'b7400000-0000-4000-8000-000000000005'::uuid THEN 'en_revision'
          ELSE 'pendiente'
        END,
        updated_at = now()
    WHERE firm_id = p_firm_id AND is_demo = true;

    UPDATE ciceron.bulletin_manual_checks
    SET status = CASE
          WHEN id = 'b7500000-0000-4000-8000-000000000001'::uuid THEN 'asignado'
          ELSE 'pendiente'
        END,
        assigned_to = CASE
          WHEN id = 'b7500000-0000-4000-8000-000000000001'::uuid
            THEN 'b1000000-0000-4000-8000-000000000003'::uuid
          ELSE NULL
        END,
        assigned_by = CASE
          WHEN id = 'b7500000-0000-4000-8000-000000000001'::uuid
            THEN 'b1000000-0000-4000-8000-000000000006'::uuid
          ELSE NULL
        END,
        completed_by = NULL,
        completed_at = NULL,
        notes = NULL,
        updated_at = now()
    WHERE firm_id = p_firm_id AND is_demo = true;
    GET DIAGNOSTICS bulletin_reset = ROW_COUNT;
  END IF;

  PERFORM ciceron.refresh_demo_dates(p_firm_id, true);

  PERFORM ciceron.write_audit_event(
    p_firm_id, p_actor, 'demo_reset', 'firms', p_firm_id,
    jsonb_build_object(
      'is_demo', true,
      'sessions_expired', sessions_expired,
      'deliveries_removed', deliveries_removed,
      'tasks_reopened', tasks_reopened,
      'bulletin_reset', bulletin_reset
    ),
    'allowed', NULL, NULL,
    jsonb_build_object('entity_type', 'firms', 'entity_id', p_firm_id)
  );

  RETURN jsonb_build_object(
    'ok', true,
    'sessions_expired', sessions_expired,
    'deliveries_removed', deliveries_removed,
    'tasks_reopened', tasks_reopened,
    'bulletin_reset', bulletin_reset,
    'firm_id', p_firm_id
  );
END;
$$;

COMMENT ON FUNCTION ciceron.reset_demo_firm(uuid, uuid) IS
  'Admin-only: reset demo firm including bulletin demo hits/manual checks. Never deletes dof_notes.';

REVOKE ALL ON FUNCTION ciceron.reset_demo_firm(uuid, uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION ciceron.reset_demo_firm(uuid, uuid) TO service_role;
