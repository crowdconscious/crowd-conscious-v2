-- 327_ciceron_boletines.sql
-- Prompt B1: state court bulletin catalogue, sources, runs, entries, hits.
-- Additive. Do NOT apply to production from an agent — CTO applies and verifies.
-- Sources ship enabled=false; verified_by/on and terms_reviewed_on empty (rule 9b).
-- Writes only via service_role SECURITY DEFINER RPCs (search_path pinned).

-- ---------------------------------------------------------------------------
-- Registry of public bulletin sources (mirrors docs/ciceron/boletines/REGISTRY.csv)
-- Shared corpus-like: not firm-scoped. Enabling a source for auto-fetch requires
-- verified_by, verified_on, terms_reviewed_on and tier A/B (enforced in app + RPC).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ciceron.bulletin_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_key text NOT NULL UNIQUE
    CHECK (char_length(source_key) BETWEEN 2 AND 80),
  state_code text NOT NULL
    CHECK (char_length(state_code) BETWEEN 2 AND 40),
  state_name text NOT NULL
    CHECK (char_length(state_name) BETWEEN 2 AND 80),
  display_name text NOT NULL
    CHECK (char_length(display_name) BETWEEN 2 AND 300),
  landing_url text NOT NULL
    CHECK (char_length(landing_url) BETWEEN 8 AND 2000),
  branch_or_subject text,
  publication_form text,
  file_format text,
  proposed_tier text NOT NULL
    CHECK (proposed_tier IN ('A', 'B', 'C', 'D', 'E', 'not_verified')),
  needs_login boolean NOT NULL DEFAULT false,
  has_captcha boolean NOT NULL DEFAULT false,
  robots_ok boolean NOT NULL DEFAULT true,
  terms_ok boolean NOT NULL DEFAULT false,
  terms_of_use_url text,
  proposed_match_key text,
  difficulty_note text,
  verified_by text,
  verified_on date,
  terms_reviewed_on date,
  counsel_reviewed_on date,
  enabled boolean NOT NULL DEFAULT false,
  adapter_key text,
  retention_days int NOT NULL DEFAULT 14
    CHECK (retention_days >= 1 AND retention_days <= 365),
  is_demo boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS bulletin_sources_state_idx
  ON ciceron.bulletin_sources (state_code, enabled);

COMMENT ON TABLE ciceron.bulletin_sources IS
  'Public state-court bulletin sources. Auto-fetch only when enabled + verified (rule 9b). Demo rows are fictional seeds.';
COMMENT ON COLUMN ciceron.bulletin_sources.enabled IS
  'Default false. Never enable without named verifier, tier A/B, and terms review (rule 9b).';
COMMENT ON COLUMN ciceron.bulletin_sources.retention_days IS
  'Raw bulletin entry retention for matched/possible rows (rule 9d).';

ALTER TABLE ciceron.bulletin_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE ciceron.bulletin_sources FORCE ROW LEVEL SECURITY;
REVOKE ALL ON ciceron.bulletin_sources FROM PUBLIC, anon, authenticated;
GRANT SELECT ON ciceron.bulletin_sources TO authenticated;
GRANT ALL ON ciceron.bulletin_sources TO service_role;

DROP POLICY IF EXISTS bulletin_sources_select ON ciceron.bulletin_sources;
CREATE POLICY bulletin_sources_select ON ciceron.bulletin_sources
  FOR SELECT TO authenticated
  USING (ciceron.is_ciceron_member());

DROP TRIGGER IF EXISTS bulletin_sources_set_updated_at ON ciceron.bulletin_sources;
CREATE TRIGGER bulletin_sources_set_updated_at
  BEFORE UPDATE ON ciceron.bulletin_sources
  FOR EACH ROW EXECUTE FUNCTION ciceron.set_updated_at();

-- ---------------------------------------------------------------------------
-- Per-firm matter catalogue for bulletin matching (client data; demo labelled)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ciceron.bulletin_matter_catalogue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL REFERENCES ciceron.firms(id) ON DELETE CASCADE,
  matter_id uuid REFERENCES ciceron.matters(id) ON DELETE SET NULL,
  case_file_id uuid REFERENCES ciceron.case_files(id) ON DELETE SET NULL,
  state_code text NOT NULL
    CHECK (char_length(state_code) BETWEEN 2 AND 40),
  state_name text NOT NULL
    CHECK (char_length(state_name) BETWEEN 2 AND 80),
  court_name text NOT NULL
    CHECK (char_length(court_name) BETWEEN 1 AND 300),
  expediente_number text NOT NULL
    CHECK (char_length(expediente_number) BETWEEN 1 AND 120),
  party_name_variants text[] NOT NULL DEFAULT '{}'::text[],
  is_active boolean NOT NULL DEFAULT true,
  is_demo boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS bulletin_matter_catalogue_firm_idx
  ON ciceron.bulletin_matter_catalogue (firm_id, state_code)
  WHERE is_active;

CREATE INDEX IF NOT EXISTS bulletin_matter_catalogue_matter_idx
  ON ciceron.bulletin_matter_catalogue (matter_id)
  WHERE matter_id IS NOT NULL;

COMMENT ON TABLE ciceron.bulletin_matter_catalogue IS
  'Per-firm catalogue of state-court matters to search in bulletins. Real catalogues are client data (rule 9d).';

ALTER TABLE ciceron.bulletin_matter_catalogue ENABLE ROW LEVEL SECURITY;
ALTER TABLE ciceron.bulletin_matter_catalogue FORCE ROW LEVEL SECURITY;
REVOKE ALL ON ciceron.bulletin_matter_catalogue FROM PUBLIC, anon, authenticated;
GRANT SELECT ON ciceron.bulletin_matter_catalogue TO authenticated;
GRANT ALL ON ciceron.bulletin_matter_catalogue TO service_role;

DROP POLICY IF EXISTS bulletin_matter_catalogue_select ON ciceron.bulletin_matter_catalogue;
CREATE POLICY bulletin_matter_catalogue_select ON ciceron.bulletin_matter_catalogue
  FOR SELECT TO authenticated
  USING (firm_id IN (SELECT ciceron.firms_of_current_user()));

DROP TRIGGER IF EXISTS bulletin_matter_catalogue_set_updated_at ON ciceron.bulletin_matter_catalogue;
CREATE TRIGGER bulletin_matter_catalogue_set_updated_at
  BEFORE UPDATE ON ciceron.bulletin_matter_catalogue
  FOR EACH ROW EXECUTE FUNCTION ciceron.set_updated_at();

-- ---------------------------------------------------------------------------
-- Runs (receipts) — every attempt writes a row (rule 9c)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ciceron.bulletin_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL REFERENCES ciceron.firms(id) ON DELETE CASCADE,
  source_id uuid NOT NULL REFERENCES ciceron.bulletin_sources(id) ON DELETE RESTRICT,
  publication_date date NOT NULL,
  bulletin_number text,
  status text NOT NULL
    CHECK (status IN ('ok', 'failed', 'partial', 'manual')),
  failure_stage text
    CHECK (
      failure_stage IS NULL
      OR failure_stage IN ('fetch', 'parse', 'count_check', 'terms', 'disabled', 'manual_required')
    ),
  failure_message text,
  entries_parsed int NOT NULL DEFAULT 0 CHECK (entries_parsed >= 0),
  matters_searched int NOT NULL DEFAULT 0 CHECK (matters_searched >= 0),
  hits_exact int NOT NULL DEFAULT 0 CHECK (hits_exact >= 0),
  hits_possible int NOT NULL DEFAULT 0 CHECK (hits_possible >= 0),
  duration_ms int CHECK (duration_ms IS NULL OR duration_ms >= 0),
  parser_version text NOT NULL DEFAULT '0',
  source_url text,
  is_demo boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS bulletin_runs_firm_date_idx
  ON ciceron.bulletin_runs (firm_id, publication_date DESC, started_at DESC);

CREATE INDEX IF NOT EXISTS bulletin_runs_source_date_idx
  ON ciceron.bulletin_runs (source_id, publication_date DESC);

COMMENT ON TABLE ciceron.bulletin_runs IS
  'Bulletin run receipts (rule 9c). Failed/partial never presented as no updates.';
COMMENT ON COLUMN ciceron.bulletin_runs.status IS
  'ok | failed | partial | manual. manual = tier D/E or not enabled → human check task.';

ALTER TABLE ciceron.bulletin_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ciceron.bulletin_runs FORCE ROW LEVEL SECURITY;
REVOKE ALL ON ciceron.bulletin_runs FROM PUBLIC, anon, authenticated;
GRANT SELECT ON ciceron.bulletin_runs TO authenticated;
GRANT ALL ON ciceron.bulletin_runs TO service_role;

DROP POLICY IF EXISTS bulletin_runs_select ON ciceron.bulletin_runs;
CREATE POLICY bulletin_runs_select ON ciceron.bulletin_runs
  FOR SELECT TO authenticated
  USING (firm_id IN (SELECT ciceron.firms_of_current_user()));

-- ---------------------------------------------------------------------------
-- Entries kept only for hits / possible matches (rule 9d)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ciceron.bulletin_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL REFERENCES ciceron.firms(id) ON DELETE CASCADE,
  run_id uuid NOT NULL REFERENCES ciceron.bulletin_runs(id) ON DELETE CASCADE,
  source_id uuid NOT NULL REFERENCES ciceron.bulletin_sources(id) ON DELETE RESTRICT,
  publication_date date NOT NULL,
  court_name text,
  expediente_number text,
  party_names text,
  summary text,
  source_url text,
  raw_excerpt text,
  retain_until date NOT NULL,
  is_demo boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS bulletin_entries_run_idx
  ON ciceron.bulletin_entries (run_id);

CREATE INDEX IF NOT EXISTS bulletin_entries_retain_idx
  ON ciceron.bulletin_entries (retain_until);

COMMENT ON TABLE ciceron.bulletin_entries IS
  'Matched / possible-match bulletin rows only. Raw full bulletins are not retained (rule 9d).';

ALTER TABLE ciceron.bulletin_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE ciceron.bulletin_entries FORCE ROW LEVEL SECURITY;
REVOKE ALL ON ciceron.bulletin_entries FROM PUBLIC, anon, authenticated;
GRANT SELECT ON ciceron.bulletin_entries TO authenticated;
GRANT ALL ON ciceron.bulletin_entries TO service_role;

DROP POLICY IF EXISTS bulletin_entries_select ON ciceron.bulletin_entries;
CREATE POLICY bulletin_entries_select ON ciceron.bulletin_entries
  FOR SELECT TO authenticated
  USING (firm_id IN (SELECT ciceron.firms_of_current_user()));

-- ---------------------------------------------------------------------------
-- Hits (exact vs possible) with reason + review state
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ciceron.bulletin_hits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL REFERENCES ciceron.firms(id) ON DELETE CASCADE,
  run_id uuid NOT NULL REFERENCES ciceron.bulletin_runs(id) ON DELETE CASCADE,
  entry_id uuid NOT NULL REFERENCES ciceron.bulletin_entries(id) ON DELETE CASCADE,
  catalogue_id uuid REFERENCES ciceron.bulletin_matter_catalogue(id) ON DELETE SET NULL,
  matter_id uuid REFERENCES ciceron.matters(id) ON DELETE SET NULL,
  case_file_id uuid REFERENCES ciceron.case_files(id) ON DELETE SET NULL,
  match_kind text NOT NULL CHECK (match_kind IN ('exact', 'possible')),
  score numeric(6, 4) NOT NULL DEFAULT 0
    CHECK (score >= 0 AND score <= 1),
  reason text NOT NULL
    CHECK (char_length(reason) BETWEEN 1 AND 2000),
  review_state text NOT NULL DEFAULT 'pendiente'
    CHECK (review_state IN ('pendiente', 'en_revision', 'confirmado', 'descartado')),
  review_task_id uuid REFERENCES ciceron.review_tasks(id) ON DELETE SET NULL,
  is_demo boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS bulletin_hits_firm_date_idx
  ON ciceron.bulletin_hits (firm_id, created_at DESC);

CREATE INDEX IF NOT EXISTS bulletin_hits_run_idx
  ON ciceron.bulletin_hits (run_id);

CREATE INDEX IF NOT EXISTS bulletin_hits_matter_idx
  ON ciceron.bulletin_hits (matter_id)
  WHERE matter_id IS NOT NULL;

COMMENT ON TABLE ciceron.bulletin_hits IS
  'Bulletin matches. Informative, not a legal notification (rule 9d). Always paired with source link via entry.';
COMMENT ON COLUMN ciceron.bulletin_hits.match_kind IS
  'exact = expediente+court; possible = party-name fuzzy.';

ALTER TABLE ciceron.bulletin_hits ENABLE ROW LEVEL SECURITY;
ALTER TABLE ciceron.bulletin_hits FORCE ROW LEVEL SECURITY;
REVOKE ALL ON ciceron.bulletin_hits FROM PUBLIC, anon, authenticated;
GRANT SELECT ON ciceron.bulletin_hits TO authenticated;
GRANT ALL ON ciceron.bulletin_hits TO service_role;

DROP POLICY IF EXISTS bulletin_hits_select ON ciceron.bulletin_hits;
CREATE POLICY bulletin_hits_select ON ciceron.bulletin_hits
  FOR SELECT TO authenticated
  USING (firm_id IN (SELECT ciceron.firms_of_current_user()));

DROP TRIGGER IF EXISTS bulletin_hits_set_updated_at ON ciceron.bulletin_hits;
CREATE TRIGGER bulletin_hits_set_updated_at
  BEFORE UPDATE ON ciceron.bulletin_hits
  FOR EACH ROW EXECUTE FUNCTION ciceron.set_updated_at();

-- ---------------------------------------------------------------------------
-- Manual check tasks (tier D/E, disabled, or failed fallback)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ciceron.bulletin_manual_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL REFERENCES ciceron.firms(id) ON DELETE CASCADE,
  source_id uuid NOT NULL REFERENCES ciceron.bulletin_sources(id) ON DELETE RESTRICT,
  run_id uuid REFERENCES ciceron.bulletin_runs(id) ON DELETE SET NULL,
  check_date date NOT NULL,
  status text NOT NULL DEFAULT 'pendiente'
    CHECK (status IN ('pendiente', 'asignado', 'hecho', 'omitido')),
  source_url text NOT NULL,
  assigned_to uuid,
  assigned_by uuid,
  completed_by uuid,
  notes text,
  completed_at timestamptz,
  is_demo boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (firm_id, source_id, check_date)
);

CREATE INDEX IF NOT EXISTS bulletin_manual_checks_firm_date_idx
  ON ciceron.bulletin_manual_checks (firm_id, check_date DESC, status);

COMMENT ON TABLE ciceron.bulletin_manual_checks IS
  'Manual bulletin checks for disabled/D/E sources or failed runs past fallback time (rule 9c).';

ALTER TABLE ciceron.bulletin_manual_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE ciceron.bulletin_manual_checks FORCE ROW LEVEL SECURITY;
REVOKE ALL ON ciceron.bulletin_manual_checks FROM PUBLIC, anon, authenticated;
GRANT SELECT ON ciceron.bulletin_manual_checks TO authenticated;
GRANT ALL ON ciceron.bulletin_manual_checks TO service_role;

DROP POLICY IF EXISTS bulletin_manual_checks_select ON ciceron.bulletin_manual_checks;
CREATE POLICY bulletin_manual_checks_select ON ciceron.bulletin_manual_checks
  FOR SELECT TO authenticated
  USING (firm_id IN (SELECT ciceron.firms_of_current_user()));

DROP TRIGGER IF EXISTS bulletin_manual_checks_set_updated_at ON ciceron.bulletin_manual_checks;
CREATE TRIGGER bulletin_manual_checks_set_updated_at
  BEFORE UPDATE ON ciceron.bulletin_manual_checks
  FOR EACH ROW EXECUTE FUNCTION ciceron.set_updated_at();

-- ---------------------------------------------------------------------------
-- RPC: finish a bulletin run (writes receipt). service_role only.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION ciceron.record_bulletin_run(
  p_firm_id uuid,
  p_source_id uuid,
  p_publication_date date,
  p_status text,
  p_bulletin_number text DEFAULT NULL,
  p_failure_stage text DEFAULT NULL,
  p_failure_message text DEFAULT NULL,
  p_entries_parsed int DEFAULT 0,
  p_matters_searched int DEFAULT 0,
  p_hits_exact int DEFAULT 0,
  p_hits_possible int DEFAULT 0,
  p_duration_ms int DEFAULT NULL,
  p_parser_version text DEFAULT '0',
  p_source_url text DEFAULT NULL,
  p_is_demo boolean DEFAULT false,
  p_metadata jsonb DEFAULT '{}'::jsonb,
  p_started_at timestamptz DEFAULT now(),
  p_run_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ciceron
AS $$
DECLARE
  rid uuid;
BEGIN
  IF p_firm_id IS NULL OR p_source_id IS NULL OR p_publication_date IS NULL THEN
    RAISE EXCEPTION 'firm, source and publication_date required';
  END IF;
  IF p_status IS NULL OR p_status NOT IN ('ok', 'failed', 'partial', 'manual') THEN
    RAISE EXCEPTION 'invalid bulletin run status';
  END IF;

  rid := COALESCE(p_run_id, gen_random_uuid());

  INSERT INTO ciceron.bulletin_runs (
    id, firm_id, source_id, publication_date, bulletin_number, status,
    failure_stage, failure_message, entries_parsed, matters_searched,
    hits_exact, hits_possible, duration_ms, parser_version, source_url,
    is_demo, metadata, started_at, finished_at
  ) VALUES (
    rid, p_firm_id, p_source_id, p_publication_date, p_bulletin_number, p_status,
    p_failure_stage, p_failure_message,
    COALESCE(p_entries_parsed, 0), COALESCE(p_matters_searched, 0),
    COALESCE(p_hits_exact, 0), COALESCE(p_hits_possible, 0),
    p_duration_ms, COALESCE(p_parser_version, '0'), p_source_url,
    COALESCE(p_is_demo, false), COALESCE(p_metadata, '{}'::jsonb),
    COALESCE(p_started_at, now()), now()
  )
  ON CONFLICT (id) DO UPDATE SET
    status = EXCLUDED.status,
    failure_stage = EXCLUDED.failure_stage,
    failure_message = EXCLUDED.failure_message,
    entries_parsed = EXCLUDED.entries_parsed,
    matters_searched = EXCLUDED.matters_searched,
    hits_exact = EXCLUDED.hits_exact,
    hits_possible = EXCLUDED.hits_possible,
    duration_ms = EXCLUDED.duration_ms,
    parser_version = EXCLUDED.parser_version,
    source_url = EXCLUDED.source_url,
    metadata = EXCLUDED.metadata,
    finished_at = now();

  RETURN rid;
END;
$$;

COMMENT ON FUNCTION ciceron.record_bulletin_run IS
  'Service-role write of a bulletin run receipt (rule 9c).';

REVOKE ALL ON FUNCTION ciceron.record_bulletin_run(
  uuid, uuid, date, text, text, text, text, int, int, int, int, int, text, text, boolean, jsonb, timestamptz, uuid
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION ciceron.record_bulletin_run(
  uuid, uuid, date, text, text, text, text, int, int, int, int, int, text, text, boolean, jsonb, timestamptz, uuid
) TO service_role;

-- ---------------------------------------------------------------------------
-- RPC: persist a matched entry + hit
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION ciceron.record_bulletin_hit(
  p_firm_id uuid,
  p_run_id uuid,
  p_source_id uuid,
  p_publication_date date,
  p_match_kind text,
  p_score numeric,
  p_reason text,
  p_court_name text DEFAULT NULL,
  p_expediente_number text DEFAULT NULL,
  p_party_names text DEFAULT NULL,
  p_summary text DEFAULT NULL,
  p_source_url text DEFAULT NULL,
  p_raw_excerpt text DEFAULT NULL,
  p_catalogue_id uuid DEFAULT NULL,
  p_matter_id uuid DEFAULT NULL,
  p_case_file_id uuid DEFAULT NULL,
  p_retention_days int DEFAULT 14,
  p_is_demo boolean DEFAULT false
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ciceron
AS $$
DECLARE
  eid uuid;
  hid uuid;
  retain date;
BEGIN
  IF p_match_kind IS NULL OR p_match_kind NOT IN ('exact', 'possible') THEN
    RAISE EXCEPTION 'match_kind must be exact or possible';
  END IF;
  IF p_reason IS NULL OR char_length(trim(p_reason)) < 1 THEN
    RAISE EXCEPTION 'reason required';
  END IF;

  retain := p_publication_date + make_interval(days => GREATEST(COALESCE(p_retention_days, 14), 1));

  INSERT INTO ciceron.bulletin_entries (
    firm_id, run_id, source_id, publication_date, court_name, expediente_number,
    party_names, summary, source_url, raw_excerpt, retain_until, is_demo
  ) VALUES (
    p_firm_id, p_run_id, p_source_id, p_publication_date, p_court_name, p_expediente_number,
    p_party_names, p_summary, p_source_url, p_raw_excerpt, retain, COALESCE(p_is_demo, false)
  )
  RETURNING id INTO eid;

  INSERT INTO ciceron.bulletin_hits (
    firm_id, run_id, entry_id, catalogue_id, matter_id, case_file_id,
    match_kind, score, reason, is_demo
  ) VALUES (
    p_firm_id, p_run_id, eid, p_catalogue_id, p_matter_id, p_case_file_id,
    p_match_kind, COALESCE(p_score, 0), trim(p_reason), COALESCE(p_is_demo, false)
  )
  RETURNING id INTO hid;

  RETURN hid;
END;
$$;

COMMENT ON FUNCTION ciceron.record_bulletin_hit IS
  'Service-role write of a bulletin entry+hit (matched/possible only).';

REVOKE ALL ON FUNCTION ciceron.record_bulletin_hit(
  uuid, uuid, uuid, date, text, numeric, text, text, text, text, text, text, text, uuid, uuid, uuid, int, boolean
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION ciceron.record_bulletin_hit(
  uuid, uuid, uuid, date, text, numeric, text, text, text, text, text, text, text, uuid, uuid, uuid, int, boolean
) TO service_role;

-- ---------------------------------------------------------------------------
-- RPC: open or upsert a manual check task
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION ciceron.ensure_bulletin_manual_check(
  p_firm_id uuid,
  p_source_id uuid,
  p_check_date date,
  p_source_url text,
  p_run_id uuid DEFAULT NULL,
  p_is_demo boolean DEFAULT false
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ciceron
AS $$
DECLARE
  mid uuid;
BEGIN
  INSERT INTO ciceron.bulletin_manual_checks (
    firm_id, source_id, run_id, check_date, status, source_url, is_demo
  ) VALUES (
    p_firm_id, p_source_id, p_run_id, p_check_date, 'pendiente',
    p_source_url, COALESCE(p_is_demo, false)
  )
  ON CONFLICT (firm_id, source_id, check_date) DO UPDATE
    SET run_id = COALESCE(EXCLUDED.run_id, ciceron.bulletin_manual_checks.run_id),
        source_url = EXCLUDED.source_url,
        updated_at = now()
  RETURNING id INTO mid;

  RETURN mid;
END;
$$;

REVOKE ALL ON FUNCTION ciceron.ensure_bulletin_manual_check(
  uuid, uuid, date, text, uuid, boolean
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION ciceron.ensure_bulletin_manual_check(
  uuid, uuid, date, text, uuid, boolean
) TO service_role;

-- ---------------------------------------------------------------------------
-- RPC: assign / complete manual checks (actor-aware; audits denials)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION ciceron.assign_bulletin_manual_check(
  p_firm_id uuid,
  p_check_id uuid,
  p_actor uuid,
  p_assignee uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ciceron
AS $$
DECLARE
  actor_role text;
BEGIN
  SELECT ms.role INTO actor_role
  FROM ciceron.memberships ms
  WHERE ms.firm_id = p_firm_id AND ms.user_id = p_actor;

  IF actor_role IS NULL OR actor_role NOT IN ('socio', 'asociado', 'admin') THEN
    PERFORM ciceron.write_audit_event(
      p_firm_id, p_actor, 'bulletin_manual_assign', 'bulletin_manual_checks', p_check_id,
      jsonb_build_object('assignee', p_assignee),
      'denied', 'rbac_role',
      'Solo socio, asociado o administrador puede asignar revisiones manuales de boletín.',
      jsonb_build_object('entity_type', 'bulletin_manual_checks', 'entity_id', p_check_id)
    );
    RETURN jsonb_build_object(
      'ok', false,
      'policy_id', 'rbac_role',
      'policy_reason', 'Solo socio, asociado o administrador puede asignar revisiones manuales de boletín.'
    );
  END IF;

  UPDATE ciceron.bulletin_manual_checks
  SET status = 'asignado',
      assigned_to = p_assignee,
      assigned_by = p_actor,
      updated_at = now()
  WHERE id = p_check_id AND firm_id = p_firm_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'policy_id', 'not_found', 'policy_reason', 'Revisión manual no encontrada.');
  END IF;

  PERFORM ciceron.write_audit_event(
    p_firm_id, p_actor, 'bulletin_manual_assign', 'bulletin_manual_checks', p_check_id,
    jsonb_build_object('assignee', p_assignee),
    'allowed', 'rbac_role', NULL,
    jsonb_build_object('entity_type', 'bulletin_manual_checks', 'entity_id', p_check_id)
  );

  RETURN jsonb_build_object('ok', true);
END;
$$;

REVOKE ALL ON FUNCTION ciceron.assign_bulletin_manual_check(uuid, uuid, uuid, uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION ciceron.assign_bulletin_manual_check(uuid, uuid, uuid, uuid)
  TO service_role;

CREATE OR REPLACE FUNCTION ciceron.complete_bulletin_manual_check(
  p_firm_id uuid,
  p_check_id uuid,
  p_actor uuid,
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ciceron
AS $$
DECLARE
  actor_role text;
  row_assignee uuid;
BEGIN
  SELECT ms.role INTO actor_role
  FROM ciceron.memberships ms
  WHERE ms.firm_id = p_firm_id AND ms.user_id = p_actor;

  SELECT assigned_to INTO row_assignee
  FROM ciceron.bulletin_manual_checks
  WHERE id = p_check_id AND firm_id = p_firm_id;

  IF row_assignee IS NULL AND (actor_role IS NULL OR actor_role NOT IN ('socio', 'asociado', 'admin', 'pasante')) THEN
    PERFORM ciceron.write_audit_event(
      p_firm_id, p_actor, 'bulletin_manual_complete', 'bulletin_manual_checks', p_check_id,
      '{}'::jsonb, 'denied', 'rbac_role',
      'No tiene permiso para marcar la revisión manual como hecha.',
      jsonb_build_object('entity_type', 'bulletin_manual_checks', 'entity_id', p_check_id)
    );
    RETURN jsonb_build_object(
      'ok', false,
      'policy_id', 'rbac_role',
      'policy_reason', 'No tiene permiso para marcar la revisión manual como hecha.'
    );
  END IF;

  IF row_assignee IS NOT NULL
     AND row_assignee <> p_actor
     AND (actor_role IS NULL OR actor_role NOT IN ('socio', 'asociado', 'admin')) THEN
    PERFORM ciceron.write_audit_event(
      p_firm_id, p_actor, 'bulletin_manual_complete', 'bulletin_manual_checks', p_check_id,
      jsonb_build_object('assigned_to', row_assignee),
      'denied', 'rbac_assignee',
      'Solo el asignado o un socio/asociado/admin puede marcar esta revisión como hecha.',
      jsonb_build_object('entity_type', 'bulletin_manual_checks', 'entity_id', p_check_id)
    );
    RETURN jsonb_build_object(
      'ok', false,
      'policy_id', 'rbac_assignee',
      'policy_reason', 'Solo el asignado o un socio/asociado/admin puede marcar esta revisión como hecha.'
    );
  END IF;

  UPDATE ciceron.bulletin_manual_checks
  SET status = 'hecho',
      completed_by = p_actor,
      completed_at = now(),
      notes = COALESCE(p_notes, notes),
      updated_at = now()
  WHERE id = p_check_id AND firm_id = p_firm_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'policy_id', 'not_found', 'policy_reason', 'Revisión manual no encontrada.');
  END IF;

  PERFORM ciceron.write_audit_event(
    p_firm_id, p_actor, 'bulletin_manual_complete', 'bulletin_manual_checks', p_check_id,
    jsonb_build_object('notes', p_notes),
    'allowed', 'rbac_role', NULL,
    jsonb_build_object('entity_type', 'bulletin_manual_checks', 'entity_id', p_check_id)
  );

  RETURN jsonb_build_object('ok', true);
END;
$$;

REVOKE ALL ON FUNCTION ciceron.complete_bulletin_manual_check(uuid, uuid, uuid, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION ciceron.complete_bulletin_manual_check(uuid, uuid, uuid, text)
  TO service_role;

-- ---------------------------------------------------------------------------
-- Seed registry rows (DISABLED). Keys align with REGISTRY.csv focus states.
-- verified_* left empty — a named person must fill before enabling (rule 9b).
-- ---------------------------------------------------------------------------
INSERT INTO ciceron.bulletin_sources (
  id, source_key, state_code, state_name, display_name, landing_url,
  branch_or_subject, publication_form, file_format, proposed_tier,
  needs_login, has_captcha, robots_ok, terms_ok, proposed_match_key,
  difficulty_note, enabled, adapter_key, is_demo
) VALUES
  (
    'b7000000-0000-4000-8000-000000000001'::uuid,
    'qro_lista_primera',
    'QRO',
    'Querétaro',
    'Lista de Acuerdos Primera Instancia — Querétaro',
    'https://www.poderjudicialqro.gob.mx/acuerdos/lista-de-acuerdos-primera-instancia.php',
    'civil/family/labour / first instance',
    'per-court query',
    'HTML',
    'B',
    false,
    false,
    true,
    false,
    'expediente + juzgado label',
    'Landing lists courts; adapter ships DISABLED pending named verifier + terms review (rule 9b).',
    false,
    'queretaro',
    false
  ),
  (
    'b7000000-0000-4000-8000-000000000002'::uuid,
    'jal_extractos_cjj',
    'JAL',
    'Jalisco',
    'Extractos / Boletín CJJ — Jalisco',
    'https://cjj.gob.mx/bulletin',
    'civil/family/labour / multi',
    'single daily file',
    'HTML',
    'A',
    false,
    false,
    true,
    false,
    'party name + expediente + juzgado',
    'Angular SPA; adapter ships DISABLED pending sample + terms review (rule 9b).',
    false,
    'jalisco',
    false
  ),
  (
    'b7000000-0000-4000-8000-000000000003'::uuid,
    'cdmx_boletin_pj',
    'CDMX',
    'Ciudad de México',
    'Boletín Judicial PJCDMX',
    'https://poderjudicialcdmx.gob.mx/consulta-boletin/',
    'civil/family/labour',
    'single daily file',
    'PDF',
    'A',
    false,
    false,
    false,
    false,
    'party name + expediente + court',
    'Cloudflare blocks many cloud IPs; demo uses fictional receipts only.',
    false,
    NULL,
    false
  ),
  (
    'b7000000-0000-4000-8000-000000000004'::uuid,
    'edomex_boletin',
    'MEX',
    'Estado de México',
    'Consulta del Boletín Judicial PJEDOMEX',
    'https://notificacion.pjedomex.gob.mx/',
    'multi',
    'not verified',
    'not verified',
    'not_verified',
    false,
    false,
    false,
    false,
    'not verified',
    'Unreachable from survey cloud IP; demo uses fictional lista-style receipts.',
    false,
    NULL,
    false
  ),
  (
    'b7000000-0000-4000-8000-000000000005'::uuid,
    'gto_lista_primera',
    'GTO',
    'Guanajuato',
    'Lista de Acuerdos — Primera Instancia Guanajuato',
    'https://www.poderjudicial-gto.gob.mx/modules.php?name=Acuerdos&file=primera_instancia',
    'civil/family/labour / first instance',
    'per-court query',
    'HTML',
    'D',
    false,
    true,
    true,
    false,
    'expediente + sala/juzgado',
    'Captcha / Turnstile — manual check only (rule 9b).',
    false,
    NULL,
    false
  ),
  (
    'b7000000-0000-4000-8000-000000000006'::uuid,
    'nl_boletin_pjenl',
    'NL',
    'Nuevo León',
    'Boletín Judicial PJENL',
    'https://www.pjenl.gob.mx/BoletinJudicial/',
    'multi',
    'per-court query',
    'PDF',
    'D',
    false,
    true,
    true,
    false,
    'expediente + juzgado',
    'Image captcha — manual check only (rule 9b).',
    false,
    NULL,
    false
  )
ON CONFLICT (source_key) DO UPDATE
  SET display_name = EXCLUDED.display_name,
      landing_url = EXCLUDED.landing_url,
      proposed_tier = EXCLUDED.proposed_tier,
      adapter_key = EXCLUDED.adapter_key,
      difficulty_note = EXCLUDED.difficulty_note,
      updated_at = now();
