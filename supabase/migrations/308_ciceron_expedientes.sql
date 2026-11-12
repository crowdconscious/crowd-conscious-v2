-- 308_ciceron_expedientes.sql
-- Prompt 6: Expedientes room + simulated Microsoft 365 (schema only).
-- Additive. Applied by CTO after review.
-- No judiciary automation; M365 is demo-only (no Graph network calls).
-- auth.users FKs on confirmed_by / proposed_by / assignee_id / decided_by stay intact.
-- Demo invite actors write companion *_persona columns → ciceron.demo_personas.

-- ---------------------------------------------------------------------------
-- Deadline rules (admins edit; seed is sample-only in 309)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ciceron.deadline_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL REFERENCES ciceron.firms(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (char_length(event_type) BETWEEN 1 AND 80),
  term_days int NOT NULL CHECK (term_days > 0 AND term_days <= 365),
  day_count text NOT NULL CHECK (day_count IN ('business', 'calendar')),
  legal_basis text NOT NULL CHECK (char_length(legal_basis) BETWEEN 1 AND 2000),
  is_sample boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (firm_id, event_type, term_days, day_count)
);

CREATE INDEX IF NOT EXISTS deadline_rules_firm_id_idx
  ON ciceron.deadline_rules (firm_id) WHERE is_active;

COMMENT ON TABLE ciceron.deadline_rules IS
  'Configurable term rules for proposing deadlines from case events. Example rules are is_sample.';

ALTER TABLE ciceron.deadline_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE ciceron.deadline_rules FORCE ROW LEVEL SECURITY;
REVOKE ALL ON ciceron.deadline_rules FROM PUBLIC, anon;
GRANT SELECT ON ciceron.deadline_rules TO authenticated;
GRANT ALL ON ciceron.deadline_rules TO service_role;

DROP POLICY IF EXISTS deadline_rules_select ON ciceron.deadline_rules;
CREATE POLICY deadline_rules_select ON ciceron.deadline_rules
  FOR SELECT TO authenticated
  USING (firm_id IN (SELECT ciceron.firms_of_current_user()));

DROP POLICY IF EXISTS deadline_rules_write ON ciceron.deadline_rules;
CREATE POLICY deadline_rules_write ON ciceron.deadline_rules
  FOR ALL TO authenticated
  USING (
    firm_id IN (SELECT ciceron.firms_of_current_user())
    AND EXISTS (
      SELECT 1 FROM ciceron.memberships m
      WHERE m.firm_id = deadline_rules.firm_id
        AND m.user_id = ciceron.current_actor_id()
        AND m.role IN ('socio', 'admin')
    )
  )
  WITH CHECK (
    firm_id IN (SELECT ciceron.firms_of_current_user())
    AND EXISTS (
      SELECT 1 FROM ciceron.memberships m
      WHERE m.firm_id = deadline_rules.firm_id
        AND m.user_id = ciceron.current_actor_id()
        AND m.role IN ('socio', 'admin')
    )
  );

DROP TRIGGER IF EXISTS deadline_rules_set_updated_at ON ciceron.deadline_rules;
CREATE TRIGGER deadline_rules_set_updated_at
  BEFORE UPDATE ON ciceron.deadline_rules
  FOR EACH ROW EXECUTE FUNCTION ciceron.set_updated_at();

-- ---------------------------------------------------------------------------
-- Deadlines: computation audit + confirmation timestamp + rule/event link
-- Persona columns keep auth.users FKs intact for real users.
-- ---------------------------------------------------------------------------
ALTER TABLE ciceron.deadlines
  ADD COLUMN IF NOT EXISTS case_event_id uuid REFERENCES ciceron.case_events(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS rule_id uuid REFERENCES ciceron.deadline_rules(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS computation_text text,
  ADD COLUMN IF NOT EXISTS confirmed_at timestamptz,
  ADD COLUMN IF NOT EXISTS confirmed_by_persona uuid REFERENCES ciceron.demo_personas(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS proposed_by_persona uuid REFERENCES ciceron.demo_personas(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS discarded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS discarded_by_persona uuid REFERENCES ciceron.demo_personas(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS discarded_at timestamptz,
  ADD COLUMN IF NOT EXISTS is_sample boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS deadlines_case_event_id_idx
  ON ciceron.deadlines (case_event_id) WHERE case_event_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS deadlines_status_due_idx
  ON ciceron.deadlines (status, due_at);

COMMENT ON COLUMN ciceron.deadlines.computation_text IS
  'Human-readable basis + day-count computation shown before confirm.';
COMMENT ON COLUMN ciceron.deadlines.confirmed_at IS
  'When a socio/asociado/admin confirmed; paired with confirmed_by or confirmed_by_persona.';
COMMENT ON COLUMN ciceron.deadlines.confirmed_by IS
  'Real auth.users id when a signed-in lawyer confirms. Demo path leaves NULL.';
COMMENT ON COLUMN ciceron.deadlines.confirmed_by_persona IS
  'Demo persona id when confirming via invite session. Mutually exclusive with confirmed_by in app writes.';

-- Review actor persona companions (auth.users FKs unchanged)
ALTER TABLE ciceron.review_tasks
  ADD COLUMN IF NOT EXISTS assignee_persona uuid REFERENCES ciceron.demo_personas(id) ON DELETE SET NULL;

ALTER TABLE ciceron.review_decisions
  ADD COLUMN IF NOT EXISTS decided_by_persona uuid REFERENCES ciceron.demo_personas(id) ON DELETE SET NULL;

COMMENT ON COLUMN ciceron.review_tasks.assignee_persona IS
  'Demo persona assignee; assignee_id remains auth.users FK for real users.';
COMMENT ON COLUMN ciceron.review_decisions.decided_by_persona IS
  'Demo persona decision actor; decided_by remains auth.users FK for real users.';

-- Tier-2 confirm gate: accept auth user OR demo persona with socio/asociado/admin membership
CREATE OR REPLACE FUNCTION ciceron.deadlines_confirm_authority()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ciceron
AS $$
DECLARE
  actor uuid;
BEGIN
  IF NEW.status = 'confirmado' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM NEW.status) THEN
    IF NEW.confirmed_by IS NULL AND NEW.confirmed_by_persona IS NULL THEN
      RAISE EXCEPTION 'confirmed_by or confirmed_by_persona is required when status is confirmado'
        USING ERRCODE = 'check_violation';
    END IF;

    actor := COALESCE(NEW.confirmed_by, NEW.confirmed_by_persona);

    IF NOT EXISTS (
      SELECT 1
      FROM ciceron.matters m
      JOIN ciceron.memberships ms
        ON ms.firm_id = m.firm_id
       AND ms.user_id = actor
       AND ms.role IN ('socio', 'asociado', 'admin')
      WHERE m.id = NEW.matter_id
    ) THEN
      RAISE EXCEPTION 'only socio, asociado, or admin may confirm deadlines'
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION ciceron.deadlines_confirm_authority() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION ciceron.deadlines_confirm_authority() TO service_role;

-- ---------------------------------------------------------------------------
-- Case events: original capture + AI summary
-- ---------------------------------------------------------------------------
ALTER TABLE ciceron.case_events
  ADD COLUMN IF NOT EXISTS original_storage_path text,
  ADD COLUMN IF NOT EXISTS original_mime text,
  ADD COLUMN IF NOT EXISTS ai_summary text,
  ADD COLUMN IF NOT EXISTS is_sample boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS court_name text,
  ADD COLUMN IF NOT EXISTS file_number text,
  ADD COLUMN IF NOT EXISTS event_text text,
  ADD COLUMN IF NOT EXISTS capture_kind text
    CHECK (capture_kind IS NULL OR capture_kind IN ('paste', 'pdf', 'email', 'sample'));

COMMENT ON COLUMN ciceron.case_events.original_storage_path IS
  'Path under Storage bucket ciceron for the lawyer-supplied original (manual capture).';
COMMENT ON COLUMN ciceron.case_events.ai_summary IS
  'Two-sentence draft summary (tier 1). Source chip opens original_storage_path or raw_payload.';

-- ---------------------------------------------------------------------------
-- Deadline reminders (15 / 7 / 3 days → in-app alerts)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ciceron.deadline_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL REFERENCES ciceron.firms(id) ON DELETE CASCADE,
  deadline_id uuid NOT NULL REFERENCES ciceron.deadlines(id) ON DELETE CASCADE,
  days_before int NOT NULL CHECK (days_before IN (15, 7, 3)),
  alert_id uuid REFERENCES ciceron.alerts(id) ON DELETE SET NULL,
  sent_at timestamptz NOT NULL DEFAULT now(),
  is_sample boolean NOT NULL DEFAULT false,
  UNIQUE (deadline_id, days_before)
);

CREATE INDEX IF NOT EXISTS deadline_reminders_firm_id_idx
  ON ciceron.deadline_reminders (firm_id, sent_at DESC);

ALTER TABLE ciceron.deadline_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE ciceron.deadline_reminders FORCE ROW LEVEL SECURITY;
REVOKE ALL ON ciceron.deadline_reminders FROM PUBLIC, anon;
GRANT SELECT ON ciceron.deadline_reminders TO authenticated;
GRANT ALL ON ciceron.deadline_reminders TO service_role;

DROP POLICY IF EXISTS deadline_reminders_select ON ciceron.deadline_reminders;
CREATE POLICY deadline_reminders_select ON ciceron.deadline_reminders
  FOR SELECT TO authenticated
  USING (firm_id IN (SELECT ciceron.firms_of_current_user()));

-- ---------------------------------------------------------------------------
-- Saved views (filters) for Expedientes list
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ciceron.saved_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL REFERENCES ciceron.firms(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  room text NOT NULL DEFAULT 'expedientes' CHECK (room IN ('expedientes', 'calendario')),
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 120),
  filters jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_sample boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS saved_views_user_id_idx
  ON ciceron.saved_views (firm_id, user_id, room);

ALTER TABLE ciceron.saved_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE ciceron.saved_views FORCE ROW LEVEL SECURITY;
REVOKE ALL ON ciceron.saved_views FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON ciceron.saved_views TO authenticated;
GRANT ALL ON ciceron.saved_views TO service_role;

DROP POLICY IF EXISTS saved_views_own ON ciceron.saved_views;
CREATE POLICY saved_views_own ON ciceron.saved_views
  FOR ALL TO authenticated
  USING (
    firm_id IN (SELECT ciceron.firms_of_current_user())
    AND user_id = ciceron.current_actor_id()
  )
  WITH CHECK (
    firm_id IN (SELECT ciceron.firms_of_current_user())
    AND user_id = ciceron.current_actor_id()
  );

DROP TRIGGER IF EXISTS saved_views_set_updated_at ON ciceron.saved_views;
CREATE TRIGGER saved_views_set_updated_at
  BEFORE UPDATE ON ciceron.saved_views
  FOR EACH ROW EXECUTE FUNCTION ciceron.set_updated_at();

-- ---------------------------------------------------------------------------
-- Simulated Microsoft 365 connection (per firm; no tokens, no Graph)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ciceron.firm_integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL REFERENCES ciceron.firms(id) ON DELETE CASCADE,
  provider text NOT NULL CHECK (provider IN ('microsoft365_sim')),
  status text NOT NULL DEFAULT 'disconnected'
    CHECK (status IN ('disconnected', 'connected')),
  connected_at timestamptz,
  connected_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  connected_by_persona uuid REFERENCES ciceron.demo_personas(id) ON DELETE SET NULL,
  disconnected_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_sample boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (firm_id, provider)
);

COMMENT ON TABLE ciceron.firm_integrations IS
  'Demo-only integration state. microsoft365_sim never stores secrets or calls Graph.';

ALTER TABLE ciceron.firm_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ciceron.firm_integrations FORCE ROW LEVEL SECURITY;
REVOKE ALL ON ciceron.firm_integrations FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE ON ciceron.firm_integrations TO authenticated;
GRANT ALL ON ciceron.firm_integrations TO service_role;

DROP POLICY IF EXISTS firm_integrations_select ON ciceron.firm_integrations;
CREATE POLICY firm_integrations_select ON ciceron.firm_integrations
  FOR SELECT TO authenticated
  USING (firm_id IN (SELECT ciceron.firms_of_current_user()));

DROP POLICY IF EXISTS firm_integrations_write ON ciceron.firm_integrations;
CREATE POLICY firm_integrations_write ON ciceron.firm_integrations
  FOR ALL TO authenticated
  USING (
    firm_id IN (SELECT ciceron.firms_of_current_user())
    AND EXISTS (
      SELECT 1 FROM ciceron.memberships m
      WHERE m.firm_id = firm_integrations.firm_id
        AND m.user_id = ciceron.current_actor_id()
        AND m.role IN ('socio', 'admin', 'asociado')
    )
  )
  WITH CHECK (
    firm_id IN (SELECT ciceron.firms_of_current_user())
    AND EXISTS (
      SELECT 1 FROM ciceron.memberships m
      WHERE m.firm_id = firm_integrations.firm_id
        AND m.user_id = ciceron.current_actor_id()
        AND m.role IN ('socio', 'admin', 'asociado')
    )
  );

DROP TRIGGER IF EXISTS firm_integrations_set_updated_at ON ciceron.firm_integrations;
CREATE TRIGGER firm_integrations_set_updated_at
  BEFORE UPDATE ON ciceron.firm_integrations
  FOR EACH ROW EXECUTE FUNCTION ciceron.set_updated_at();

-- ---------------------------------------------------------------------------
-- Firm archive index (OneDrive/SharePoint simulation metadata)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ciceron.firm_archive_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL REFERENCES ciceron.firms(id) ON DELETE CASCADE,
  document_id uuid NOT NULL REFERENCES ciceron.documents(id) ON DELETE CASCADE,
  folder_path text NOT NULL CHECK (char_length(folder_path) BETWEEN 1 AND 400),
  doc_date date,
  parties text,
  is_sample boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (firm_id, document_id)
);

CREATE INDEX IF NOT EXISTS firm_archive_items_firm_id_idx
  ON ciceron.firm_archive_items (firm_id, folder_path);

COMMENT ON TABLE ciceron.firm_archive_items IS
  'Datos de demostración — simulated OneDrive/SharePoint archive index. Chunks live in ciceron.chunks.';

ALTER TABLE ciceron.firm_archive_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE ciceron.firm_archive_items FORCE ROW LEVEL SECURITY;
REVOKE ALL ON ciceron.firm_archive_items FROM PUBLIC, anon;
GRANT SELECT ON ciceron.firm_archive_items TO authenticated;
GRANT ALL ON ciceron.firm_archive_items TO service_role;

DROP POLICY IF EXISTS firm_archive_items_select ON ciceron.firm_archive_items;
CREATE POLICY firm_archive_items_select ON ciceron.firm_archive_items
  FOR SELECT TO authenticated
  USING (firm_id IN (SELECT ciceron.firms_of_current_user()));

-- ---------------------------------------------------------------------------
-- Simulated Outlook calendar events
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ciceron.simulated_calendar_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL REFERENCES ciceron.firms(id) ON DELETE CASCADE,
  matter_id uuid REFERENCES ciceron.matters(id) ON DELETE SET NULL,
  case_file_id uuid REFERENCES ciceron.case_files(id) ON DELETE SET NULL,
  deadline_id uuid REFERENCES ciceron.deadlines(id) ON DELETE SET NULL,
  client_id uuid REFERENCES ciceron.clients(id) ON DELETE SET NULL,
  lawyer_user_id uuid,
  event_kind text NOT NULL CHECK (
    event_kind IN ('hearing', 'deadline', 'dof_alert', 'other')
  ),
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 500),
  starts_at timestamptz NOT NULL,
  ends_at timestamptz,
  body text,
  synced_from_ciceron boolean NOT NULL DEFAULT false,
  is_sample boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS simulated_calendar_events_firm_starts_idx
  ON ciceron.simulated_calendar_events (firm_id, starts_at);
CREATE INDEX IF NOT EXISTS simulated_calendar_events_lawyer_idx
  ON ciceron.simulated_calendar_events (firm_id, lawyer_user_id, starts_at)
  WHERE lawyer_user_id IS NOT NULL;

COMMENT ON TABLE ciceron.simulated_calendar_events IS
  'Datos de demostración — Outlook calendar simulation. No Microsoft Graph sync.';

ALTER TABLE ciceron.simulated_calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE ciceron.simulated_calendar_events FORCE ROW LEVEL SECURITY;
REVOKE ALL ON ciceron.simulated_calendar_events FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE ON ciceron.simulated_calendar_events TO authenticated;
GRANT ALL ON ciceron.simulated_calendar_events TO service_role;

DROP POLICY IF EXISTS simulated_calendar_events_all ON ciceron.simulated_calendar_events;
CREATE POLICY simulated_calendar_events_all ON ciceron.simulated_calendar_events
  FOR ALL TO authenticated
  USING (firm_id IN (SELECT ciceron.firms_of_current_user()))
  WITH CHECK (firm_id IN (SELECT ciceron.firms_of_current_user()));

DROP TRIGGER IF EXISTS simulated_calendar_events_set_updated_at ON ciceron.simulated_calendar_events;
CREATE TRIGGER simulated_calendar_events_set_updated_at
  BEFORE UPDATE ON ciceron.simulated_calendar_events
  FOR EACH ROW EXECUTE FUNCTION ciceron.set_updated_at();

-- ---------------------------------------------------------------------------
-- Client notify drafts (simulated Outlook send; tier 2 gate via review_tasks)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ciceron.client_notify_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL REFERENCES ciceron.firms(id) ON DELETE CASCADE,
  matter_id uuid NOT NULL REFERENCES ciceron.matters(id) ON DELETE CASCADE,
  case_file_id uuid REFERENCES ciceron.case_files(id) ON DELETE SET NULL,
  deadline_id uuid REFERENCES ciceron.deadlines(id) ON DELETE SET NULL,
  case_event_id uuid REFERENCES ciceron.case_events(id) ON DELETE SET NULL,
  ai_output_id uuid REFERENCES ciceron.ai_outputs(id) ON DELETE SET NULL,
  review_task_id uuid REFERENCES ciceron.review_tasks(id) ON DELETE SET NULL,
  to_email text NOT NULL,
  subject text NOT NULL,
  body text NOT NULL,
  status text NOT NULL DEFAULT 'borrador'
    CHECK (status IN ('borrador', 'en_revision', 'aprobado', 'enviado_simulado', 'rechazado')),
  approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_by_persona uuid REFERENCES ciceron.demo_personas(id) ON DELETE SET NULL,
  approved_at timestamptz,
  simulated_sent_at timestamptz,
  is_sample boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by_persona uuid REFERENCES ciceron.demo_personas(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS client_notify_drafts_firm_id_idx
  ON ciceron.client_notify_drafts (firm_id, created_at DESC);

COMMENT ON TABLE ciceron.client_notify_drafts IS
  'Simulated Outlook compose + send. Nothing is emailed; status enviado_simulado is demo-only.';

ALTER TABLE ciceron.client_notify_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE ciceron.client_notify_drafts FORCE ROW LEVEL SECURITY;
REVOKE ALL ON ciceron.client_notify_drafts FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE ON ciceron.client_notify_drafts TO authenticated;
GRANT ALL ON ciceron.client_notify_drafts TO service_role;

DROP POLICY IF EXISTS client_notify_drafts_all ON ciceron.client_notify_drafts;
CREATE POLICY client_notify_drafts_all ON ciceron.client_notify_drafts
  FOR ALL TO authenticated
  USING (
    firm_id IN (SELECT ciceron.firms_of_current_user())
    AND ciceron.is_matter_member(matter_id)
  )
  WITH CHECK (
    firm_id IN (SELECT ciceron.firms_of_current_user())
    AND ciceron.is_matter_member(matter_id)
  );

DROP TRIGGER IF EXISTS client_notify_drafts_set_updated_at ON ciceron.client_notify_drafts;
CREATE TRIGGER client_notify_drafts_set_updated_at
  BEFORE UPDATE ON ciceron.client_notify_drafts
  FOR EACH ROW EXECUTE FUNCTION ciceron.set_updated_at();

-- Tier 2: only socio/asociado/admin may mark notify draft as approved / enviado_simulado
CREATE OR REPLACE FUNCTION ciceron.client_notify_tier2_gate()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ciceron
AS $$
DECLARE
  actor uuid;
BEGIN
  IF NEW.status IN ('aprobado', 'enviado_simulado')
     AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM NEW.status) THEN
    IF NEW.approved_by IS NULL AND NEW.approved_by_persona IS NULL THEN
      RAISE EXCEPTION 'approved_by or approved_by_persona is required when status is %', NEW.status
        USING ERRCODE = 'check_violation';
    END IF;
    actor := COALESCE(NEW.approved_by, NEW.approved_by_persona);
    IF NOT EXISTS (
      SELECT 1
      FROM ciceron.matters m
      JOIN ciceron.memberships ms
        ON ms.firm_id = m.firm_id
       AND ms.user_id = actor
       AND ms.role IN ('socio', 'asociado', 'admin')
      WHERE m.id = NEW.matter_id
    ) THEN
      RAISE EXCEPTION 'only socio, asociado, or admin may approve client notify drafts'
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION ciceron.client_notify_tier2_gate() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION ciceron.client_notify_tier2_gate() TO service_role;

DROP TRIGGER IF EXISTS client_notify_tier2_gate ON ciceron.client_notify_drafts;
CREATE TRIGGER client_notify_tier2_gate
  BEFORE INSERT OR UPDATE ON ciceron.client_notify_drafts
  FOR EACH ROW EXECUTE FUNCTION ciceron.client_notify_tier2_gate();

-- Prompt versions for event summary + client notify
INSERT INTO ciceron.prompt_versions (purpose, version_label, template, model_hint)
VALUES
  (
    'case_event_summary',
    'v1',
    'Two-sentence Spanish summary of a court case event; source is the stored original.',
    'fast'
  ),
  (
    'client_notify_email',
    'v1',
    'Plain-language client status email (usted); cites the event; no legalese.',
    'fast'
  ),
  (
    'informar_cliente_note',
    'v1',
    'Internal status note for client briefing; opens tier-2 review task.',
    'fast'
  )
ON CONFLICT (purpose, version_label) DO UPDATE
SET template = EXCLUDED.template,
    model_hint = EXCLUDED.model_hint;
