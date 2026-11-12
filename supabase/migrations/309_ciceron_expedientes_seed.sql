-- 309_ciceron_expedientes_seed.sql
-- Prompt 6 seed: Datos de demostración (is_sample / is_demo).
-- Additive. Do NOT apply from agents. Requires 302 + 308.
-- Archive chunk embeddings left NULL (embedding_pending); backfill via gateway.

-- ---------------------------------------------------------------------------
-- Deadline rules (labelled examples; admins edit later)
-- ---------------------------------------------------------------------------
INSERT INTO ciceron.deadline_rules (
  id, firm_id, event_type, term_days, day_count, legal_basis, is_sample, is_active
) VALUES
  (
    'e1000000-0000-4000-8000-000000000001'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'notificacion_demanda',
    15,
    'business',
    'Ejemplo de demostración — CFPC art. 332 (término genérico ilustrativo; no sustituye asesoría).',
    true,
    true
  ),
  (
    'e1000000-0000-4000-8000-000000000002'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'acuerdo_requerimiento',
    5,
    'business',
    'Ejemplo de demostración — término de 5 días hábiles para desahogar requerimiento (ilustrativo).',
    true,
    true
  ),
  (
    'e1000000-0000-4000-8000-000000000003'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'notificacion_sentencia',
    10,
    'calendar',
    'Ejemplo de demostración — término de 10 días naturales para interponer recurso (ilustrativo).',
    true,
    true
  ),
  (
    'e1000000-0000-4000-8000-000000000004'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'emplazamiento',
    9,
    'business',
    'Ejemplo de demostración — emplazamiento; término ilustrativo de 9 días hábiles.',
    true,
    true
  )
ON CONFLICT (firm_id, event_type, term_days, day_count) DO UPDATE
SET legal_basis = EXCLUDED.legal_basis,
    is_sample = true,
    is_active = true;

-- Enrich existing sample case events
UPDATE ciceron.case_events e
SET
  is_sample = true,
  capture_kind = 'sample',
  court_name = cf.court_name,
  file_number = cf.file_number,
  event_text = e.summary,
  ai_summary = CASE
    WHEN e.event_type = 'notificacion'
      THEN 'Se notificó un acuerdo que abre término de contestación. Conviene revisar el plazo propuesto antes de confirmarlo.'
    WHEN e.event_type = 'acuerdo'
      THEN 'El juzgado tuvo por presentada la demanda. No abre por sí un término de contestación en este ejemplo.'
    ELSE left(coalesce(e.summary, ''), 220)
  END
FROM ciceron.case_files cf
WHERE e.case_file_id = cf.id
  AND cf.is_sample = true;

-- Extra sample events for richer timeline
INSERT INTO ciceron.case_events (
  id, case_file_id, event_type, occurred_at, summary, raw_payload,
  is_sample, capture_kind, court_name, file_number, event_text, ai_summary
)
SELECT
  v.id,
  v.case_file_id,
  v.event_type,
  v.occurred_at,
  v.summary,
  v.raw_payload::jsonb,
  true,
  'sample',
  cf.court_name,
  cf.file_number,
  v.event_text,
  v.ai_summary
FROM (
  VALUES
    (
      'e2000000-0000-4000-8000-000000000001'::uuid,
      'f1000000-0000-4000-8000-000000000001'::uuid,
      'acuerdo_requerimiento',
      '2026-11-03T16:00:00Z'::timestamptz,
      'Datos de demostración. Requerimiento para exhibir poder notarial.',
      '{"source":"sample","label":"Datos de demostración"}',
      'Requerimiento para exhibir poder notarial actualizado en cinco días hábiles.',
      'El tribunal requiere exhibir el poder del representante legal. El plazo propuesto usa la regla de requerimiento de demostración.'
    ),
    (
      'e2000000-0000-4000-8000-000000000002'::uuid,
      'f1000000-0000-4000-8000-000000000002'::uuid,
      'notificacion_demanda',
      '2026-11-05T15:00:00Z'::timestamptz,
      'Datos de demostración. Emplazamiento al quejoso — término para ampliar.',
      '{"source":"sample","label":"Datos de demostración"}',
      'Emplazamiento al quejoso con término para ampliar la demanda.',
      'Se emplazó al quejoso. Revise el plazo propuesto antes de confirmarlo con el socio del asunto.'
    ),
    (
      'e2000000-0000-4000-8000-000000000003'::uuid,
      'f1000000-0000-4000-8000-000000000004'::uuid,
      'audiencia',
      '2026-11-18T17:00:00Z'::timestamptz,
      'Datos de demostración. Audiencia de pruebas señalada.',
      '{"source":"sample","label":"Datos de demostración"}',
      'Audiencia de pruebas señalada para el 18 de noviembre de 2026.',
      'Quedó señalada audiencia de pruebas. No genera plazo de contestación; aparece en el calendario simulado.'
    )
) AS v(id, case_file_id, event_type, occurred_at, summary, raw_payload, event_text, ai_summary)
JOIN ciceron.case_files cf ON cf.id = v.case_file_id
WHERE NOT EXISTS (SELECT 1 FROM ciceron.case_events e WHERE e.id = v.id);

-- Proposed deadlines linked to rules (keep status propuesto until confirm)
UPDATE ciceron.deadlines d
SET
  is_sample = true,
  rule_id = 'e1000000-0000-4000-8000-000000000001'::uuid,
  computation_text = 'Regla ejemplo: notificación_demanda · 15 días hábiles · base ilustrativa CFPC art. 332. Cómputo desde el día hábil siguiente a la notificación, omitiendo sábados, domingos y días inhábiles del calendario MX.',
  case_event_id = (
    SELECT e.id FROM ciceron.case_events e
    WHERE e.case_file_id = d.case_file_id
    ORDER BY e.occurred_at DESC
    LIMIT 1
  )
WHERE d.case_file_id IN (
  'f1000000-0000-4000-8000-000000000001'::uuid,
  'f1000000-0000-4000-8000-000000000002'::uuid
);

INSERT INTO ciceron.deadlines (
  id, matter_id, case_file_id, due_at, status, basis_text, rule_id,
  computation_text, is_sample, case_event_id
)
SELECT
  'e3000000-0000-4000-8000-000000000001'::uuid,
  cf.matter_id,
  cf.id,
  '2026-11-12T23:59:00-06:00'::timestamptz,
  'propuesto',
  'Ejemplo de demostración — 5 días hábiles por requerimiento.',
  'e1000000-0000-4000-8000-000000000002'::uuid,
  'Regla ejemplo: acuerdo_requerimiento · 5 días hábiles. Día 1 = primer día hábil posterior al acuerdo.',
  true,
  'e2000000-0000-4000-8000-000000000001'::uuid
FROM ciceron.case_files cf
WHERE cf.id = 'f1000000-0000-4000-8000-000000000001'::uuid
  AND NOT EXISTS (
    SELECT 1 FROM ciceron.deadlines d WHERE d.id = 'e3000000-0000-4000-8000-000000000001'::uuid
  );

-- Reminder alerts (15/7/3) for demo deadline — in-app only
INSERT INTO ciceron.alerts (id, firm_id, matter_id, client_id, severity, status, headline)
VALUES
  (
    'e4000000-0000-4000-8000-000000000001'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000001'::uuid,
    'c1000000-0000-4000-8000-000000000001'::uuid,
    'attention',
    'nuevo',
    'Datos de demostración. Recordatorio: faltan 7 días para contestar DEMO-TFJA-1001/2026.'
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO ciceron.deadline_reminders (
  id, firm_id, deadline_id, days_before, alert_id, is_sample
)
SELECT
  'e4000000-0000-4000-8000-000000000011'::uuid,
  'a1000000-0000-4000-8000-000000000001'::uuid,
  d.id,
  7,
  'e4000000-0000-4000-8000-000000000001'::uuid,
  true
FROM ciceron.deadlines d
WHERE d.case_file_id = 'f1000000-0000-4000-8000-000000000001'::uuid
  AND d.status = 'propuesto'
ORDER BY d.due_at
LIMIT 1
ON CONFLICT (deadline_id, days_before) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Firm archive source + sample documents (embeddings null until gateway backfill)
-- ---------------------------------------------------------------------------
INSERT INTO ciceron.sources (id, source_key, display_name, kind, official_base_url)
VALUES (
  'e5000000-0000-4000-8000-000000000001'::uuid,
  'firm_archive_sim',
  'Archivo del despacho (OneDrive / SharePoint simulado)',
  'interno',
  NULL
)
ON CONFLICT (source_key) DO UPDATE
SET display_name = EXCLUDED.display_name,
    kind = 'interno';

INSERT INTO ciceron.documents (id, canonical_id, doc_type, title, official_url, firm_id, source_id)
VALUES
  (
    'e5100000-0000-4000-8000-000000000001'::uuid,
    'firm-archive:nexora-contrato-servicio-2026',
    'contrato',
    'Contrato de prestación de servicios — Nexora Pagos / Despacho Demo',
    NULL,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'e5000000-0000-4000-8000-000000000001'::uuid
  ),
  (
    'e5100000-0000-4000-8000-000000000002'::uuid,
    'firm-archive:nexora-escrito-contestacion',
    'escrito',
    'Proyecto de contestación — DEMO-TFJA-1001/2026',
    NULL,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'e5000000-0000-4000-8000-000000000001'::uuid
  ),
  (
    'e5100000-0000-4000-8000-000000000003'::uuid,
    'firm-archive:viento-acuerdo-junta',
    'acuerdo',
    'Acuerdo de junta de aclaraciones — Viento del Istmo / CRE',
    NULL,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'e5000000-0000-4000-8000-000000000001'::uuid
  ),
  (
    'e5100000-0000-4000-8000-000000000004'::uuid,
    'firm-archive:farma-carta-cliente',
    'correspondencia',
    'Carta al cliente — Farma Sierra (cadena de frío)',
    NULL,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'e5000000-0000-4000-8000-000000000001'::uuid
  ),
  (
    'e5100000-0000-4000-8000-000000000005'::uuid,
    'firm-archive:nexora-nda-proveedor',
    'contrato',
    'Convenio de confidencialidad — Nexora / Proveedor Ficticio Sigma',
    NULL,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'e5000000-0000-4000-8000-000000000001'::uuid
  )
ON CONFLICT (canonical_id) DO UPDATE
SET title = EXCLUDED.title,
    firm_id = EXCLUDED.firm_id,
    source_id = EXCLUDED.source_id;

INSERT INTO ciceron.document_versions (id, document_id, valid_from, content_hash, raw_storage_path)
VALUES
  (
    'e5200000-0000-4000-8000-000000000001'::uuid,
    'e5100000-0000-4000-8000-000000000001'::uuid,
    '2026-01-15',
    'archivehash0000000000000000000001',
    'a1000000-0000-4000-8000-000000000001/archive/Contratos/nexora-servicios-2026.txt'
  ),
  (
    'e5200000-0000-4000-8000-000000000002'::uuid,
    'e5100000-0000-4000-8000-000000000002'::uuid,
    '2026-11-02',
    'archivehash0000000000000000000002',
    'a1000000-0000-4000-8000-000000000001/archive/Escritos/nexora-contestacion-borrador.txt'
  ),
  (
    'e5200000-0000-4000-8000-000000000003'::uuid,
    'e5100000-0000-4000-8000-000000000003'::uuid,
    '2026-09-20',
    'archivehash0000000000000000000003',
    'a1000000-0000-4000-8000-000000000001/archive/Asuntos/Viento/acuerdo-junta.txt'
  ),
  (
    'e5200000-0000-4000-8000-000000000004'::uuid,
    'e5100000-0000-4000-8000-000000000004'::uuid,
    '2026-10-28',
    'archivehash0000000000000000000004',
    'a1000000-0000-4000-8000-000000000001/archive/Correspondencia/farma-cadena-frio.txt'
  ),
  (
    'e5200000-0000-4000-8000-000000000005'::uuid,
    'e5100000-0000-4000-8000-000000000005'::uuid,
    '2026-03-01',
    'archivehash0000000000000000000005',
    'a1000000-0000-4000-8000-000000000001/archive/Contratos/nexora-nda-sigma.txt'
  )
ON CONFLICT (id) DO NOTHING;

-- Chunks (FTS-ready; embedding null until AI Gateway backfill)
INSERT INTO ciceron.chunks (id, version_id, text, position, embedding_model, canonical_citation_id)
VALUES
  (
    'e5300000-0000-4000-8000-000000000001'::uuid,
    'e5200000-0000-4000-8000-000000000001'::uuid,
    $c$Datos de demostración. CONTRATO DE PRESTACIÓN DE SERVICIOS JURÍDICOS. Celebran Nexora Pagos, S.A.P.I. de C.V. («Cliente») y Despacho Demo, S.C. («Despacho»). Objeto: asesoría en materia de instituciones de fondos de pago electrónico y prevención de lavado de dinero ante la CNBV. Honorarios: cuota mensual fija más gastos erogados. Confidencialidad: las partes guardarán secreto sobre información no pública del Cliente durante la vigencia y cinco años posteriores. Terminación: cualquiera podrá dar por terminado el contrato con treinta días naturales de aviso por escrito.$c$,
    0,
    'openai/text-embedding-3-small',
    'firm-archive:nexora-contrato-servicio-2026#0'
  ),
  (
    'e5300000-0000-4000-8000-000000000002'::uuid,
    'e5200000-0000-4000-8000-000000000002'::uuid,
    $c$Datos de demostración. PROYECTO DE CONTESTACIÓN. Expediente DEMO-TFJA-1001/2026. Nexora Pagos opone las defensas de falta de legitimación activa y cumplimiento oportuno de las obligaciones de identificación de clientes. Se ofrece como prueba la póliza de cumplimiento PLD y el informe de auditoría interna de octubre de 2026. Se solicita se declare la nulidad del acto impugnado.$c$,
    0,
    'openai/text-embedding-3-small',
    'firm-archive:nexora-escrito-contestacion#0'
  ),
  (
    'e5300000-0000-4000-8000-000000000003'::uuid,
    'e5200000-0000-4000-8000-000000000003'::uuid,
    $c$Datos de demostración. ACUERDO DE JUNTA DE ACLARACIONES. Proyecto eólico Viento del Istmo. Las partes aclaran el alcance de la interconexión y los plazos de respuesta a información adicional requerida por la autoridad. Queda asentado que el despacho coordinará la respuesta técnica con el área de ingeniería del Cliente.$c$,
    0,
    'openai/text-embedding-3-small',
    'firm-archive:viento-acuerdo-junta#0'
  ),
  (
    'e5300000-0000-4000-8000-000000000004'::uuid,
    'e5200000-0000-4000-8000-000000000004'::uuid,
    $c$Datos de demostración. Estimada Distribuidora Farma Sierra: le informamos que el aviso de COFEPRIS sobre verificación de cadena de frío puede afectar sus almacenes autorizados. Le recomendamos contrastar el protocolo vigente y agendar una revisión conjunta la próxima semana. Quedamos a sus órdenes.$c$,
    0,
    'openai/text-embedding-3-small',
    'firm-archive:farma-carta-cliente#0'
  ),
  (
    'e5300000-0000-4000-8000-000000000005'::uuid,
    'e5200000-0000-4000-8000-000000000005'::uuid,
    $c$Datos de demostración. CONVENIO DE CONFIDENCIALIDAD entre Nexora Pagos y Proveedor Ficticio Sigma, S.A. de C.V. La información técnica de APIs de pagos y los datos de clientes son confidenciales. Queda prohibida la ingeniería inversa de los sistemas del Cliente. Vigencia: tres años a partir de la firma.$c$,
    0,
    'openai/text-embedding-3-small',
    'firm-archive:nexora-nda-proveedor#0'
  )
ON CONFLICT (id) DO UPDATE
SET text = EXCLUDED.text,
    embedding_model = EXCLUDED.embedding_model;

INSERT INTO ciceron.firm_archive_items (
  id, firm_id, document_id, folder_path, doc_date, parties, is_sample
) VALUES
  (
    'e5400000-0000-4000-8000-000000000001'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'e5100000-0000-4000-8000-000000000001'::uuid,
    'OneDrive / Contratos / Nexora',
    '2026-01-15',
    'Nexora Pagos · Despacho Demo',
    true
  ),
  (
    'e5400000-0000-4000-8000-000000000002'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'e5100000-0000-4000-8000-000000000002'::uuid,
    'SharePoint / Escritos / TFJA',
    '2026-11-02',
    'Nexora Pagos',
    true
  ),
  (
    'e5400000-0000-4000-8000-000000000003'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'e5100000-0000-4000-8000-000000000003'::uuid,
    'OneDrive / Asuntos / Viento del Istmo',
    '2026-09-20',
    'Viento del Istmo Energía',
    true
  ),
  (
    'e5400000-0000-4000-8000-000000000004'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'e5100000-0000-4000-8000-000000000004'::uuid,
    'Outlook / Correspondencia / Farma Sierra',
    '2026-10-28',
    'Distribuidora Farma Sierra',
    true
  ),
  (
    'e5400000-0000-4000-8000-000000000005'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'e5100000-0000-4000-8000-000000000005'::uuid,
    'OneDrive / Contratos / Nexora',
    '2026-03-01',
    'Nexora Pagos · Proveedor Ficticio Sigma',
    true
  )
ON CONFLICT (firm_id, document_id) DO UPDATE
SET folder_path = EXCLUDED.folder_path,
    doc_date = EXCLUDED.doc_date,
    parties = EXCLUDED.parties,
    is_sample = true;

-- M365 sim connection row (starts disconnected)
INSERT INTO ciceron.firm_integrations (
  id, firm_id, provider, status, is_sample, metadata
) VALUES (
  'e5500000-0000-4000-8000-000000000001'::uuid,
  'a1000000-0000-4000-8000-000000000001'::uuid,
  'microsoft365_sim',
  'disconnected',
  true,
  '{"label":"Datos de demostración","permissions":["mail.read","calendars.readwrite","files.read","mail.send"]}'::jsonb
)
ON CONFLICT (firm_id, provider) DO NOTHING;

-- Simulated Outlook calendar (hearings + deadlines + DOF-style alert)
INSERT INTO ciceron.simulated_calendar_events (
  id, firm_id, matter_id, case_file_id, deadline_id, client_id, lawyer_user_id,
  event_kind, title, starts_at, ends_at, body, synced_from_ciceron, is_sample
) VALUES
  (
    'e5600000-0000-4000-8000-000000000001'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000001'::uuid,
    'f1000000-0000-4000-8000-000000000001'::uuid,
    NULL,
    'c1000000-0000-4000-8000-000000000001'::uuid,
    'b1000000-0000-4000-8000-000000000002'::uuid,
    'hearing',
    'Datos de demostración. Audiencia preliminar — DEMO-TFJA-1001/2026',
    '2026-11-21T10:00:00-06:00',
    '2026-11-21T12:00:00-06:00',
    'Sala Regional Metropolitana. Comparecencia de Nexora Pagos.',
    false,
    true
  ),
  (
    'e5600000-0000-4000-8000-000000000002'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000004'::uuid,
    'f1000000-0000-4000-8000-000000000004'::uuid,
    NULL,
    'c1000000-0000-4000-8000-000000000003'::uuid,
    'b1000000-0000-4000-8000-000000000001'::uuid,
    'hearing',
    'Datos de demostración. Audiencia incidental — DEMO-AMP-404/2026',
    '2026-11-25T09:30:00-06:00',
    '2026-11-25T11:00:00-06:00',
    'Juzgado de Distrito. Amparo de Viento del Istmo.',
    false,
    true
  ),
  (
    'e5600000-0000-4000-8000-000000000003'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000001'::uuid,
    'f1000000-0000-4000-8000-000000000001'::uuid,
    NULL,
    'c1000000-0000-4000-8000-000000000001'::uuid,
    'b1000000-0000-4000-8000-000000000001'::uuid,
    'dof_alert',
    'Datos de demostración. Alerta DOF — CNBV / Nexora',
    '2026-11-12T08:00:00-06:00',
    '2026-11-12T08:30:00-06:00',
    'Coincidencia del Monitor DOF con el perfil de vigilancia de Nexora Pagos.',
    false,
    true
  ),
  (
    'e5600000-0000-4000-8000-000000000004'::uuid,
    'a1000000-0000-4000-8000-000000000001'::uuid,
    'd1000000-0000-4000-8000-000000000003'::uuid,
    'f1000000-0000-4000-8000-000000000003'::uuid,
    NULL,
    'c1000000-0000-4000-8000-000000000002'::uuid,
    'b1000000-0000-4000-8000-000000000005'::uuid,
    'hearing',
    'Datos de demostración. Audiencia de pruebas — Farma Sierra',
    '2026-11-18T11:00:00-06:00',
    '2026-11-18T13:00:00-06:00',
    'Expediente DEMO-TFJA-331/2026.',
    false,
    true
  )
ON CONFLICT (id) DO NOTHING;

-- Saved view example
INSERT INTO ciceron.saved_views (id, firm_id, user_id, room, name, filters, is_sample)
VALUES (
  'e5700000-0000-4000-8000-000000000001'::uuid,
  'a1000000-0000-4000-8000-000000000001'::uuid,
  'b1000000-0000-4000-8000-000000000001'::uuid,
  'expedientes',
  'Urgentes esta semana',
  '{"urgency":"soon","status":"activo"}'::jsonb,
  true
)
ON CONFLICT (id) DO NOTHING;
