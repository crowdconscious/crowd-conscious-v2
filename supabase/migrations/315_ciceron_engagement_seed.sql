-- 315_ciceron_engagement_seed.sql
-- Prompt 8 demo seed: labelled Datos de demostración events + ai_runs for métricas.
-- Requires 314. Fixed ids: e2000000-0000-4000-8000-000000000001+
-- Applied by CTO after review. Agents do not apply to production.

-- Firm onboarding for Despacho Demo (checklist visible but nearly complete for socio demo)
INSERT INTO ciceron.firm_onboarding (
  firm_id, described_client, saw_matched_alert, sent_alert_through_review,
  completed_at, is_demo
) VALUES (
  'a1000000-0000-4000-8000-000000000001'::uuid,
  true,
  true,
  false,
  NULL,
  true
)
ON CONFLICT (firm_id) DO UPDATE
  SET described_client = EXCLUDED.described_client,
      saw_matched_alert = EXCLUDED.saw_matched_alert,
      sent_alert_through_review = EXCLUDED.sent_alert_through_review,
      is_demo = true,
      updated_at = now();

-- Resume cursor for socio
INSERT INTO ciceron.engagement_resume (firm_id, user_id, room, href, label, entity_type, entity_id)
VALUES (
  'a1000000-0000-4000-8000-000000000001'::uuid,
  'b1000000-0000-4000-8000-000000000001'::uuid,
  'monitor-dof',
  '/ciceron/monitor-dof',
  'monitor_dof_open_matches',
  'room',
  NULL
)
ON CONFLICT (firm_id, user_id) DO UPDATE
  SET room = EXCLUDED.room,
      href = EXCLUDED.href,
      label = EXCLUDED.label,
      updated_at = now();

-- Extra ai_runs across two recent weeks for cost view (Datos de demostración)
INSERT INTO ciceron.ai_runs (
  id, purpose, model, prompt_version_id,
  input_tokens, output_tokens, cost_estimate_usd, latency_ms,
  retrieved_chunk_ids, firm_id, matter_id, user_id, created_at
) VALUES
(
  'e2000000-0000-4000-8000-000000000201'::uuid,
  'research_answer',
  'claude-sonnet-5',
  NULL,
  2200, 900, 0.028, 3100,
  '{}'::uuid[],
  'a1000000-0000-4000-8000-000000000001'::uuid,
  'd1000000-0000-4000-8000-000000000001'::uuid,
  'b1000000-0000-4000-8000-000000000002'::uuid,
  (date_trunc('week', now() AT TIME ZONE 'America/Mexico_City') AT TIME ZONE 'America/Mexico_City')
    - interval '3 days'
),
(
  'e2000000-0000-4000-8000-000000000202'::uuid,
  'research_rewrite',
  'claude-haiku-4-5',
  NULL,
  800, 200, 0.004, 900,
  '{}'::uuid[],
  'a1000000-0000-4000-8000-000000000001'::uuid,
  'd1000000-0000-4000-8000-000000000001'::uuid,
  'b1000000-0000-4000-8000-000000000002'::uuid,
  (date_trunc('week', now() AT TIME ZONE 'America/Mexico_City') AT TIME ZONE 'America/Mexico_City')
    - interval '2 days'
),
(
  'e2000000-0000-4000-8000-000000000203'::uuid,
  'dof_classify',
  'claude-haiku-4-5',
  NULL,
  1500, 400, 0.006, 1200,
  '{}'::uuid[],
  'a1000000-0000-4000-8000-000000000001'::uuid,
  NULL,
  'b1000000-0000-4000-8000-000000000004'::uuid,
  (date_trunc('week', now() AT TIME ZONE 'America/Mexico_City') AT TIME ZONE 'America/Mexico_City')
    - interval '10 days'
),
(
  'e2000000-0000-4000-8000-000000000204'::uuid,
  'research_answer',
  'claude-sonnet-5',
  NULL,
  1800, 700, 0.022, 2800,
  '{}'::uuid[],
  'a1000000-0000-4000-8000-000000000001'::uuid,
  'd1000000-0000-4000-8000-000000000003'::uuid,
  'b1000000-0000-4000-8000-000000000005'::uuid,
  (date_trunc('week', now() AT TIME ZONE 'America/Mexico_City') AT TIME ZONE 'America/Mexico_City')
    - interval '9 days'
)
ON CONFLICT (id) DO NOTHING;

-- Product events spanning two weeks (Datos de demostración)
-- Helper: week0 = current week start CDMX; week-1 = previous
INSERT INTO ciceron.events (id, name, firm_id, user_id, properties, occurred_at)
VALUES
-- invite / session
(
  'e2000000-0000-4000-8000-000000000001'::uuid,
  'invite_redeemed',
  'a1000000-0000-4000-8000-000000000001'::uuid,
  'b1000000-0000-4000-8000-000000000001'::uuid,
  '{"invite_role":"socio","is_demo":true}'::jsonb,
  now() - interval '20 days'
),
(
  'e2000000-0000-4000-8000-000000000002'::uuid,
  'session_started',
  'a1000000-0000-4000-8000-000000000001'::uuid,
  'b1000000-0000-4000-8000-000000000001'::uuid,
  '{"surface":"hoy","is_demo":true}'::jsonb,
  (date_trunc('week', now() AT TIME ZONE 'America/Mexico_City') AT TIME ZONE 'America/Mexico_City') + interval '9 hours'
),
(
  'e2000000-0000-4000-8000-000000000003'::uuid,
  'session_started',
  'a1000000-0000-4000-8000-000000000001'::uuid,
  'b1000000-0000-4000-8000-000000000002'::uuid,
  '{"surface":"hoy","is_demo":true}'::jsonb,
  (date_trunc('week', now() AT TIME ZONE 'America/Mexico_City') AT TIME ZONE 'America/Mexico_City') + interval '1 day 9 hours'
),
(
  'e2000000-0000-4000-8000-000000000004'::uuid,
  'session_started',
  'a1000000-0000-4000-8000-000000000001'::uuid,
  'b1000000-0000-4000-8000-000000000005'::uuid,
  '{"surface":"hoy","is_demo":true}'::jsonb,
  (date_trunc('week', now() AT TIME ZONE 'America/Mexico_City') AT TIME ZONE 'America/Mexico_City') + interval '2 days 9 hours'
),
-- room_opened hoy across 4+ business days for socio + asociado (habit)
(
  'e2000000-0000-4000-8000-000000000010'::uuid,
  'room_opened',
  'a1000000-0000-4000-8000-000000000001'::uuid,
  'b1000000-0000-4000-8000-000000000001'::uuid,
  '{"room":"hoy","is_demo":true}'::jsonb,
  (date_trunc('week', now() AT TIME ZONE 'America/Mexico_City') AT TIME ZONE 'America/Mexico_City') + interval '0 days 10 hours'
),
(
  'e2000000-0000-4000-8000-000000000011'::uuid,
  'room_opened',
  'a1000000-0000-4000-8000-000000000001'::uuid,
  'b1000000-0000-4000-8000-000000000001'::uuid,
  '{"room":"hoy","is_demo":true}'::jsonb,
  (date_trunc('week', now() AT TIME ZONE 'America/Mexico_City') AT TIME ZONE 'America/Mexico_City') + interval '1 day 10 hours'
),
(
  'e2000000-0000-4000-8000-000000000012'::uuid,
  'room_opened',
  'a1000000-0000-4000-8000-000000000001'::uuid,
  'b1000000-0000-4000-8000-000000000001'::uuid,
  '{"room":"hoy","is_demo":true}'::jsonb,
  (date_trunc('week', now() AT TIME ZONE 'America/Mexico_City') AT TIME ZONE 'America/Mexico_City') + interval '2 days 10 hours'
),
(
  'e2000000-0000-4000-8000-000000000013'::uuid,
  'room_opened',
  'a1000000-0000-4000-8000-000000000001'::uuid,
  'b1000000-0000-4000-8000-000000000001'::uuid,
  '{"room":"hoy","is_demo":true}'::jsonb,
  (date_trunc('week', now() AT TIME ZONE 'America/Mexico_City') AT TIME ZONE 'America/Mexico_City') + interval '3 days 10 hours'
),
(
  'e2000000-0000-4000-8000-000000000014'::uuid,
  'room_opened',
  'a1000000-0000-4000-8000-000000000001'::uuid,
  'b1000000-0000-4000-8000-000000000002'::uuid,
  '{"room":"hoy","is_demo":true}'::jsonb,
  (date_trunc('week', now() AT TIME ZONE 'America/Mexico_City') AT TIME ZONE 'America/Mexico_City') + interval '0 days 11 hours'
),
(
  'e2000000-0000-4000-8000-000000000015'::uuid,
  'room_opened',
  'a1000000-0000-4000-8000-000000000001'::uuid,
  'b1000000-0000-4000-8000-000000000002'::uuid,
  '{"room":"hoy","is_demo":true}'::jsonb,
  (date_trunc('week', now() AT TIME ZONE 'America/Mexico_City') AT TIME ZONE 'America/Mexico_City') + interval '1 day 11 hours'
),
(
  'e2000000-0000-4000-8000-000000000016'::uuid,
  'room_opened',
  'a1000000-0000-4000-8000-000000000001'::uuid,
  'b1000000-0000-4000-8000-000000000002'::uuid,
  '{"room":"hoy","is_demo":true}'::jsonb,
  (date_trunc('week', now() AT TIME ZONE 'America/Mexico_City') AT TIME ZONE 'America/Mexico_City') + interval '2 days 11 hours'
),
(
  'e2000000-0000-4000-8000-000000000017'::uuid,
  'room_opened',
  'a1000000-0000-4000-8000-000000000001'::uuid,
  'b1000000-0000-4000-8000-000000000002'::uuid,
  '{"room":"hoy","is_demo":true}'::jsonb,
  (date_trunc('week', now() AT TIME ZONE 'America/Mexico_City') AT TIME ZONE 'America/Mexico_City') + interval '3 days 11 hours'
),
-- previous week habit for socio
(
  'e2000000-0000-4000-8000-000000000018'::uuid,
  'room_opened',
  'a1000000-0000-4000-8000-000000000001'::uuid,
  'b1000000-0000-4000-8000-000000000001'::uuid,
  '{"room":"hoy","is_demo":true}'::jsonb,
  (date_trunc('week', now() AT TIME ZONE 'America/Mexico_City') AT TIME ZONE 'America/Mexico_City') - interval '7 days' + interval '10 hours'
),
(
  'e2000000-0000-4000-8000-000000000019'::uuid,
  'room_opened',
  'a1000000-0000-4000-8000-000000000001'::uuid,
  'b1000000-0000-4000-8000-000000000001'::uuid,
  '{"room":"hoy","is_demo":true}'::jsonb,
  (date_trunc('week', now() AT TIME ZONE 'America/Mexico_City') AT TIME ZONE 'America/Mexico_City') - interval '6 days' + interval '10 hours'
),
(
  'e2000000-0000-4000-8000-00000000001a'::uuid,
  'room_opened',
  'a1000000-0000-4000-8000-000000000001'::uuid,
  'b1000000-0000-4000-8000-000000000001'::uuid,
  '{"room":"hoy","is_demo":true}'::jsonb,
  (date_trunc('week', now() AT TIME ZONE 'America/Mexico_City') AT TIME ZONE 'America/Mexico_City') - interval '5 days' + interval '10 hours'
),
(
  'e2000000-0000-4000-8000-00000000001b'::uuid,
  'room_opened',
  'a1000000-0000-4000-8000-000000000001'::uuid,
  'b1000000-0000-4000-8000-000000000001'::uuid,
  '{"room":"hoy","is_demo":true}'::jsonb,
  (date_trunc('week', now() AT TIME ZONE 'America/Mexico_City') AT TIME ZONE 'America/Mexico_City') - interval '4 days' + interval '10 hours'
),
-- briefing / alerts / feedback
(
  'e2000000-0000-4000-8000-000000000020'::uuid,
  'briefing_opened',
  'a1000000-0000-4000-8000-000000000001'::uuid,
  'b1000000-0000-4000-8000-000000000001'::uuid,
  '{"kind":"morning","is_demo":true}'::jsonb,
  now() - interval '1 day'
),
(
  'e2000000-0000-4000-8000-000000000021'::uuid,
  'alert_opened',
  'a1000000-0000-4000-8000-000000000001'::uuid,
  'b1000000-0000-4000-8000-000000000002'::uuid,
  '{"match_id":"e2000000-0000-4000-8000-000000000090","is_demo":true}'::jsonb,
  now() - interval '18 days'
),
(
  'e2000000-0000-4000-8000-000000000022'::uuid,
  'alert_feedback',
  'a1000000-0000-4000-8000-000000000001'::uuid,
  'b1000000-0000-4000-8000-000000000002'::uuid,
  '{"match_id":"e2000000-0000-4000-8000-000000000090","verdict":"relevant","is_demo":true}'::jsonb,
  now() - interval '18 days' + interval '5 minutes'
),
(
  'e2000000-0000-4000-8000-000000000023'::uuid,
  'alert_feedback',
  'a1000000-0000-4000-8000-000000000001'::uuid,
  'b1000000-0000-4000-8000-000000000002'::uuid,
  '{"match_id":"e2000000-0000-4000-8000-000000000091","verdict":"not_relevant","reason_code":"wrong_authority","is_demo":true}'::jsonb,
  now() - interval '12 days'
),
(
  'e2000000-0000-4000-8000-000000000024'::uuid,
  'alert_feedback',
  'a1000000-0000-4000-8000-000000000001'::uuid,
  'b1000000-0000-4000-8000-000000000002'::uuid,
  '{"match_id":"e2000000-0000-4000-8000-000000000092","verdict":"not_relevant","reason_code":"wrong_authority","is_demo":true}'::jsonb,
  now() - interval '11 days'
),
(
  'e2000000-0000-4000-8000-000000000025'::uuid,
  'alert_feedback',
  'a1000000-0000-4000-8000-000000000001'::uuid,
  'b1000000-0000-4000-8000-000000000002'::uuid,
  '{"match_id":"e2000000-0000-4000-8000-000000000093","verdict":"not_relevant","reason_code":"wrong_authority","is_demo":true}'::jsonb,
  now() - interval '10 days'
),
(
  'e2000000-0000-4000-8000-000000000026'::uuid,
  'alert_feedback',
  'a1000000-0000-4000-8000-000000000001'::uuid,
  'b1000000-0000-4000-8000-000000000005'::uuid,
  '{"match_id":"e2000000-0000-4000-8000-000000000094","verdict":"relevant","is_demo":true}'::jsonb,
  now() - interval '8 days'
),
(
  'e2000000-0000-4000-8000-000000000027'::uuid,
  'alert_feedback',
  'a1000000-0000-4000-8000-000000000001'::uuid,
  'b1000000-0000-4000-8000-000000000001'::uuid,
  '{"match_id":"e2000000-0000-4000-8000-000000000095","verdict":"relevant","is_demo":true}'::jsonb,
  now() - interval '3 days'
),
(
  'e2000000-0000-4000-8000-000000000028'::uuid,
  'source_opened',
  'a1000000-0000-4000-8000-000000000001'::uuid,
  'b1000000-0000-4000-8000-000000000001'::uuid,
  '{"source_kind":"dof","is_demo":true}'::jsonb,
  now() - interval '3 days'
),
(
  'e2000000-0000-4000-8000-000000000030'::uuid,
  'research_asked',
  'a1000000-0000-4000-8000-000000000001'::uuid,
  'b1000000-0000-4000-8000-000000000002'::uuid,
  '{"matter_id":"d1000000-0000-4000-8000-000000000001","is_demo":true}'::jsonb,
  now() - interval '2 days'
),
(
  'e2000000-0000-4000-8000-000000000031'::uuid,
  'research_feedback',
  'a1000000-0000-4000-8000-000000000001'::uuid,
  'b1000000-0000-4000-8000-000000000002'::uuid,
  '{"verdict":"useful","is_demo":true}'::jsonb,
  now() - interval '2 days' + interval '10 minutes'
),
(
  'e2000000-0000-4000-8000-000000000032'::uuid,
  'draft_created',
  'a1000000-0000-4000-8000-000000000001'::uuid,
  'b1000000-0000-4000-8000-000000000002'::uuid,
  '{"output_type":"client_alert","is_demo":true}'::jsonb,
  now() - interval '5 days'
),
(
  'e2000000-0000-4000-8000-000000000033'::uuid,
  'review_decided',
  'a1000000-0000-4000-8000-000000000001'::uuid,
  'b1000000-0000-4000-8000-000000000001'::uuid,
  '{"decision":"approved","output_type":"client_alert","is_demo":true}'::jsonb,
  now() - interval '4 days'
),
(
  'e2000000-0000-4000-8000-000000000034'::uuid,
  'delivery_confirmed',
  'a1000000-0000-4000-8000-000000000001'::uuid,
  'b1000000-0000-4000-8000-000000000001'::uuid,
  '{"output_type":"client_alert","simulated":true,"is_demo":true}'::jsonb,
  now() - interval '4 days' + interval '20 minutes'
),
(
  'e2000000-0000-4000-8000-000000000035'::uuid,
  'deadline_confirmed',
  'a1000000-0000-4000-8000-000000000001'::uuid,
  'b1000000-0000-4000-8000-000000000001'::uuid,
  '{"matter_id":"d1000000-0000-4000-8000-000000000001","is_demo":true}'::jsonb,
  now() - interval '6 days'
),
(
  'e2000000-0000-4000-8000-000000000036'::uuid,
  'deadline_confirmed',
  'a1000000-0000-4000-8000-000000000001'::uuid,
  'b1000000-0000-4000-8000-000000000002'::uuid,
  '{"matter_id":"d1000000-0000-4000-8000-000000000003","is_demo":true}'::jsonb,
  now() - interval '1 day'
),
(
  'e2000000-0000-4000-8000-000000000037'::uuid,
  'watch_profile_created',
  'a1000000-0000-4000-8000-000000000001'::uuid,
  'b1000000-0000-4000-8000-000000000001'::uuid,
  '{"client_id":"c1000000-0000-4000-8000-000000000001","is_demo":true}'::jsonb,
  now() - interval '25 days'
),
(
  'e2000000-0000-4000-8000-000000000038'::uuid,
  'watch_profile_edited',
  'a1000000-0000-4000-8000-000000000001'::uuid,
  'b1000000-0000-4000-8000-000000000001'::uuid,
  '{"watch_profile_id":"e1000000-0000-4000-8000-000000000001","reason_code":"wrong_authority","is_demo":true}'::jsonb,
  now() - interval '9 days'
),
(
  'e2000000-0000-4000-8000-000000000039'::uuid,
  'saved_view_created',
  'a1000000-0000-4000-8000-000000000001'::uuid,
  'b1000000-0000-4000-8000-000000000001'::uuid,
  '{"room":"monitor-dof","is_demo":true}'::jsonb,
  now() - interval '7 days'
),
-- previous week value moments
(
  'e2000000-0000-4000-8000-000000000040'::uuid,
  'delivery_confirmed',
  'a1000000-0000-4000-8000-000000000001'::uuid,
  'b1000000-0000-4000-8000-000000000001'::uuid,
  '{"output_type":"client_alert","simulated":true,"is_demo":true}'::jsonb,
  (date_trunc('week', now() AT TIME ZONE 'America/Mexico_City') AT TIME ZONE 'America/Mexico_City')
    - interval '5 days'
),
(
  'e2000000-0000-4000-8000-000000000041'::uuid,
  'deadline_confirmed',
  'a1000000-0000-4000-8000-000000000001'::uuid,
  'b1000000-0000-4000-8000-000000000001'::uuid,
  '{"matter_id":"d1000000-0000-4000-8000-000000000004","is_demo":true}'::jsonb,
  (date_trunc('week', now() AT TIME ZONE 'America/Mexico_City') AT TIME ZONE 'America/Mexico_City')
    - interval '4 days'
)
ON CONFLICT (id) DO NOTHING;

-- Ensure demo firm budget row exists with thresholds clear
INSERT INTO ciceron.firm_ai_budgets (firm_id, monthly_budget_usd)
VALUES ('a1000000-0000-4000-8000-000000000001'::uuid, 50)
ON CONFLICT (firm_id) DO NOTHING;
