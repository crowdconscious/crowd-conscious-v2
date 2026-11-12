-- 313_ciceron_review_seed.sql
-- Prompt 7 demo seed: review tasks across 2–3 clients, firm_settings, labelled Datos de demostración.
-- Requires 312. Applied by CTO after review.
--
-- Fixed UUIDs (valid hex; f100…001–008 reserved for case_files in 302/309):
-- ai_runs:      f1000000-0000-4000-8000-000000000101..104
-- ai_outputs:   f1000000-0000-4000-8000-000000000111..114
-- drafts:       f1000000-0000-4000-8000-000000000121..124
-- draft_vers:   f1000000-0000-4000-8000-000000000131..135
-- review_tasks: f1000000-0000-4000-8000-000000000141..144
-- prompt_ver:   f1000000-0000-4000-8000-000000000151

INSERT INTO ciceron.firm_settings (firm_id, four_eyes_output_types, email_allowlist)
VALUES (
  'a1000000-0000-4000-8000-000000000001'::uuid,
  ARRAY['client_alert']::text[],
  '{}'::text[]
)
ON CONFLICT (firm_id) DO UPDATE
  SET four_eyes_output_types = EXCLUDED.four_eyes_output_types,
      email_allowlist = EXCLUDED.email_allowlist,
      updated_at = now();

INSERT INTO ciceron.prompt_versions (id, purpose, version_label, template, model_hint)
SELECT
  'f1000000-0000-4000-8000-000000000151'::uuid,
  'client_alert',
  'v1',
  'Datos de demostración. Plantilla de alerta al cliente con citas DOF.',
  'claude-sonnet-5'
WHERE NOT EXISTS (
  SELECT 1 FROM ciceron.prompt_versions pv
  WHERE pv.id = 'f1000000-0000-4000-8000-000000000151'::uuid
     OR (pv.purpose = 'client_alert' AND pv.version_label = 'v1')
);

INSERT INTO ciceron.ai_runs (
  id, purpose, model, prompt_version_id,
  input_tokens, output_tokens, cost_estimate_usd, latency_ms,
  retrieved_chunk_ids, firm_id, matter_id, user_id
) VALUES
(
  'f1000000-0000-4000-8000-000000000101'::uuid,
  'client_alert',
  'claude-sonnet-5',
  'f1000000-0000-4000-8000-000000000151'::uuid,
  1200, 480, 0.012, 2100,
  '{}'::uuid[],
  'a1000000-0000-4000-8000-000000000001'::uuid,
  'd1000000-0000-4000-8000-000000000001'::uuid,
  'b1000000-0000-4000-8000-000000000002'::uuid
),
(
  'f1000000-0000-4000-8000-000000000102'::uuid,
  'client_alert',
  'claude-sonnet-5',
  'f1000000-0000-4000-8000-000000000151'::uuid,
  980, 410, 0.010, 1900,
  '{}'::uuid[],
  'a1000000-0000-4000-8000-000000000001'::uuid,
  'd1000000-0000-4000-8000-000000000003'::uuid,
  'b1000000-0000-4000-8000-000000000002'::uuid
),
(
  'f1000000-0000-4000-8000-000000000103'::uuid,
  'research_summary',
  'claude-sonnet-5',
  'f1000000-0000-4000-8000-000000000151'::uuid,
  1500, 620, 0.015, 2400,
  '{}'::uuid[],
  'a1000000-0000-4000-8000-000000000001'::uuid,
  'd1000000-0000-4000-8000-000000000004'::uuid,
  'b1000000-0000-4000-8000-000000000005'::uuid
),
(
  'f1000000-0000-4000-8000-000000000104'::uuid,
  'client_notify',
  'claude-sonnet-5',
  'f1000000-0000-4000-8000-000000000151'::uuid,
  800, 360, 0.009, 1700,
  '{}'::uuid[],
  'a1000000-0000-4000-8000-000000000001'::uuid,
  'd1000000-0000-4000-8000-000000000001'::uuid,
  'b1000000-0000-4000-8000-000000000002'::uuid
)
ON CONFLICT (id) DO UPDATE SET purpose = EXCLUDED.purpose;

INSERT INTO ciceron.ai_outputs (id, ai_run_id, tier, status, body) VALUES
(
  'f1000000-0000-4000-8000-000000000111'::uuid,
  'f1000000-0000-4000-8000-000000000101'::uuid,
  2, 'en_revision',
  $body$Datos de demostración.

Estimada dirección de cumplimiento:

El Diario Oficial publicó modificaciones a las Disposiciones de carácter general aplicables a las instituciones de crédito que amplían el plazo de conservación de registros de operaciones. Recomendamos revisar las políticas internas de archivo de Nexora Pagos y confirmar el alcance frente a fondos de pago electrónico.

Quedamos a sus órdenes para preparar el plan de adecuación.
$body$
),
(
  'f1000000-0000-4000-8000-000000000112'::uuid,
  'f1000000-0000-4000-8000-000000000102'::uuid,
  2, 'en_revision',
  $body$Datos de demostración.

Estimado equipo de asuntos regulatorios:

Identificamos una disposición relacionada con cadena de frío y farmacovigilancia que puede afectar la red de distribución de Farma Sierra. Sugerimos contrastar el texto oficial con los procedimientos actuales de almacenamiento y notificar a operaciones si hubiera un ajuste de plazos.

Este mensaje es un borrador pendiente de su revisión.
$body$
),
(
  'f1000000-0000-4000-8000-000000000113'::uuid,
  'f1000000-0000-4000-8000-000000000103'::uuid,
  2, 'en_revision',
  $body$Datos de demostración.

Resumen para Viento del Istmo Energía:

La nota identificada toca permisos de generación e interconexión. Conviene verificar si el parque del Istmo queda dentro del supuesto y, en su caso, documentar la evidencia de cumplimiento ambiental ya aportada ante la autoridad.
$body$
),
(
  'f1000000-0000-4000-8000-000000000114'::uuid,
  'f1000000-0000-4000-8000-000000000104'::uuid,
  2, 'en_revision',
  $body$Datos de demostración.

Seguimiento para Nexora Pagos: confirmamos recepción del borrador de alerta PLD y proponemos una llamada breve para alinear el plan de adecuación.
$body$
)
ON CONFLICT (id) DO UPDATE SET body = EXCLUDED.body, status = EXCLUDED.status, tier = EXCLUDED.tier;

INSERT INTO ciceron.drafts (id, matter_id, title, status) VALUES
(
  'f1000000-0000-4000-8000-000000000121'::uuid,
  'd1000000-0000-4000-8000-000000000001'::uuid,
  'Alerta PLD — Nexora Pagos',
  'en_revision'
),
(
  'f1000000-0000-4000-8000-000000000122'::uuid,
  'd1000000-0000-4000-8000-000000000003'::uuid,
  'Alerta cadena de frío — Farma Sierra',
  'en_revision'
),
(
  'f1000000-0000-4000-8000-000000000123'::uuid,
  'd1000000-0000-4000-8000-000000000004'::uuid,
  'Nota de investigación — Viento del Istmo',
  'en_revision'
),
(
  'f1000000-0000-4000-8000-000000000124'::uuid,
  'd1000000-0000-4000-8000-000000000001'::uuid,
  'Seguimiento alerta PLD — Nexora Pagos',
  'en_revision'
)
ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, status = EXCLUDED.status;

INSERT INTO ciceron.draft_versions (
  id, draft_id, author_type, author_user_id, author_persona,
  body, ai_output_id, version_number
) VALUES
(
  'f1000000-0000-4000-8000-000000000131'::uuid,
  'f1000000-0000-4000-8000-000000000121'::uuid,
  'model', NULL, NULL,
  (SELECT body FROM ciceron.ai_outputs WHERE id = 'f1000000-0000-4000-8000-000000000111'::uuid),
  'f1000000-0000-4000-8000-000000000111'::uuid,
  1
),
(
  'f1000000-0000-4000-8000-000000000132'::uuid,
  'f1000000-0000-4000-8000-000000000122'::uuid,
  'model', NULL, NULL,
  (SELECT body FROM ciceron.ai_outputs WHERE id = 'f1000000-0000-4000-8000-000000000112'::uuid),
  'f1000000-0000-4000-8000-000000000112'::uuid,
  1
),
(
  'f1000000-0000-4000-8000-000000000133'::uuid,
  'f1000000-0000-4000-8000-000000000123'::uuid,
  'model', NULL, NULL,
  (SELECT body FROM ciceron.ai_outputs WHERE id = 'f1000000-0000-4000-8000-000000000113'::uuid),
  'f1000000-0000-4000-8000-000000000113'::uuid,
  1
),
(
  'f1000000-0000-4000-8000-000000000134'::uuid,
  'f1000000-0000-4000-8000-000000000121'::uuid,
  'human', NULL, 'b1000000-0000-4000-8000-000000000001'::uuid,
  $body$Datos de demostración.

Estimada dirección de cumplimiento:

El Diario Oficial publicó modificaciones a las Disposiciones de carácter general aplicables a las instituciones de crédito que amplían el plazo de conservación de registros de operaciones a no menos de diez años. Recomendamos revisar las políticas internas de archivo de Nexora Pagos, confirmar el alcance frente a fondos de pago electrónico y agendar una sesión de adecuación la próxima semana.

Quedamos a sus órdenes.
$body$,
  'f1000000-0000-4000-8000-000000000111'::uuid,
  2
),
(
  'f1000000-0000-4000-8000-000000000135'::uuid,
  'f1000000-0000-4000-8000-000000000124'::uuid,
  'model', NULL, NULL,
  (SELECT body FROM ciceron.ai_outputs WHERE id = 'f1000000-0000-4000-8000-000000000114'::uuid),
  'f1000000-0000-4000-8000-000000000114'::uuid,
  1
)
ON CONFLICT (id) DO UPDATE SET body = EXCLUDED.body;

INSERT INTO ciceron.review_tasks (
  id, matter_id, ai_output_id, assignee_id, assignee_persona, status,
  due_at, title, output_type, draft_id, is_demo
) VALUES
(
  'f1000000-0000-4000-8000-000000000141'::uuid,
  'd1000000-0000-4000-8000-000000000001'::uuid,
  'f1000000-0000-4000-8000-000000000111'::uuid,
  NULL, 'b1000000-0000-4000-8000-000000000001'::uuid,
  'en_curso',
  timestamptz '2026-11-10 18:00:00-06',
  'Alerta PLD — Nexora Pagos',
  'client_alert',
  'f1000000-0000-4000-8000-000000000121'::uuid,
  true
),
(
  'f1000000-0000-4000-8000-000000000142'::uuid,
  'd1000000-0000-4000-8000-000000000003'::uuid,
  'f1000000-0000-4000-8000-000000000112'::uuid,
  NULL, 'b1000000-0000-4000-8000-000000000002'::uuid,
  'pendiente',
  timestamptz '2026-11-13 12:00:00-06',
  'Alerta cadena de frío — Farma Sierra',
  'client_alert',
  'f1000000-0000-4000-8000-000000000122'::uuid,
  true
),
(
  'f1000000-0000-4000-8000-000000000143'::uuid,
  'd1000000-0000-4000-8000-000000000004'::uuid,
  'f1000000-0000-4000-8000-000000000113'::uuid,
  NULL, 'b1000000-0000-4000-8000-000000000005'::uuid,
  'pendiente',
  timestamptz '2026-11-14 17:00:00-06',
  'Nota de investigación — Viento del Istmo',
  'research_summary',
  'f1000000-0000-4000-8000-000000000123'::uuid,
  true
),
(
  'f1000000-0000-4000-8000-000000000144'::uuid,
  'd1000000-0000-4000-8000-000000000001'::uuid,
  'f1000000-0000-4000-8000-000000000114'::uuid,
  NULL, 'b1000000-0000-4000-8000-000000000002'::uuid,
  'pendiente',
  timestamptz '2026-11-12 09:00:00-06',
  'Seguimiento alerta PLD — Nexora Pagos',
  'client_notify',
  'f1000000-0000-4000-8000-000000000124'::uuid,
  true
)
ON CONFLICT (id) DO UPDATE
  SET title = EXCLUDED.title,
      due_at = EXCLUDED.due_at,
      status = EXCLUDED.status,
      output_type = EXCLUDED.output_type,
      assignee_persona = EXCLUDED.assignee_persona,
      ai_output_id = EXCLUDED.ai_output_id,
      draft_id = EXCLUDED.draft_id,
      is_demo = true;

-- Seed audit (append-only; rollback will NOT delete these rows)
INSERT INTO ciceron.audit_events (
  firm_id, user_id, action, entity_type, entity_id,
  payload, outcome, policy_id, policy_reason, snapshot_ref
)
SELECT
  'a1000000-0000-4000-8000-000000000001'::uuid,
  'b1000000-0000-4000-8000-000000000001'::uuid,
  'view_client_material',
  'clients',
  'c1000000-0000-4000-8000-000000000001'::uuid,
  '{"label":"Datos de demostración","source":"313_review_seed"}'::jsonb,
  'allowed',
  'matter_member',
  'Socio viewed client material in demo seed',
  '{"entity_type":"clients","entity_id":"c1000000-0000-4000-8000-000000000001"}'::jsonb
WHERE NOT EXISTS (
  SELECT 1 FROM ciceron.audit_events e
  WHERE e.action = 'view_client_material'
    AND e.entity_id = 'c1000000-0000-4000-8000-000000000001'::uuid
    AND e.payload->>'source' = '313_review_seed'
);
