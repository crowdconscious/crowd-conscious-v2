-- 308_ciceron_expedientes.rollback.sql (branch / non-prod only)

DROP TRIGGER IF EXISTS client_notify_tier2_gate ON ciceron.client_notify_drafts;
DROP FUNCTION IF EXISTS ciceron.client_notify_tier2_gate();

DROP POLICY IF EXISTS client_notify_drafts_all ON ciceron.client_notify_drafts;
DROP TABLE IF EXISTS ciceron.client_notify_drafts;

DROP POLICY IF EXISTS simulated_calendar_events_all ON ciceron.simulated_calendar_events;
DROP TABLE IF EXISTS ciceron.simulated_calendar_events;

DROP POLICY IF EXISTS firm_archive_items_select ON ciceron.firm_archive_items;
DROP TABLE IF EXISTS ciceron.firm_archive_items;

DROP POLICY IF EXISTS firm_integrations_write ON ciceron.firm_integrations;
DROP POLICY IF EXISTS firm_integrations_select ON ciceron.firm_integrations;
DROP TABLE IF EXISTS ciceron.firm_integrations;

DROP POLICY IF EXISTS saved_views_own ON ciceron.saved_views;
DROP TABLE IF EXISTS ciceron.saved_views;

DROP POLICY IF EXISTS deadline_reminders_select ON ciceron.deadline_reminders;
DROP TABLE IF EXISTS ciceron.deadline_reminders;

ALTER TABLE ciceron.case_events
  DROP COLUMN IF EXISTS original_storage_path,
  DROP COLUMN IF EXISTS original_mime,
  DROP COLUMN IF EXISTS ai_summary,
  DROP COLUMN IF EXISTS is_sample,
  DROP COLUMN IF EXISTS court_name,
  DROP COLUMN IF EXISTS file_number,
  DROP COLUMN IF EXISTS event_text,
  DROP COLUMN IF EXISTS capture_kind;

ALTER TABLE ciceron.deadlines
  DROP COLUMN IF EXISTS case_event_id,
  DROP COLUMN IF EXISTS rule_id,
  DROP COLUMN IF EXISTS computation_text,
  DROP COLUMN IF EXISTS confirmed_at,
  DROP COLUMN IF EXISTS discarded_by,
  DROP COLUMN IF EXISTS discarded_at,
  DROP COLUMN IF EXISTS is_sample;

DROP POLICY IF EXISTS deadline_rules_write ON ciceron.deadline_rules;
DROP POLICY IF EXISTS deadline_rules_select ON ciceron.deadline_rules;
DROP TABLE IF EXISTS ciceron.deadline_rules;

DELETE FROM ciceron.prompt_versions
WHERE purpose IN ('case_event_summary', 'client_notify_email', 'informar_cliente_note')
  AND version_label = 'v1';
