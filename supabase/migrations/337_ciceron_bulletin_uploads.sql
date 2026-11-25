-- 337_ciceron_bulletin_uploads.sql
-- Additive: manual bulletin upload receipts + processing status.
-- Storage path: {firm_id}/boletines/uploads/{date}/{id}.{ext}
-- Existing ciceron storage policies already allow can_manage_firm INSERT
-- under that path layout — NO new storage.objects policies in this migration.
-- Do NOT apply to production from an agent — CTO applies and verifies.

-- ---------------------------------------------------------------------------
-- bulletin_uploads
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ciceron.bulletin_uploads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL REFERENCES ciceron.firms(id) ON DELETE CASCADE,
  source_id uuid REFERENCES ciceron.bulletin_sources(id) ON DELETE SET NULL,
  run_id uuid REFERENCES ciceron.bulletin_runs(id) ON DELETE SET NULL,
  state_code text NOT NULL
    CHECK (char_length(state_code) BETWEEN 2 AND 40),
  state_name text NOT NULL
    CHECK (char_length(state_name) BETWEEN 2 AND 80),
  publication_date date NOT NULL,
  uploaded_by uuid NOT NULL,
  mime text
    CHECK (
      mime IS NULL
      OR mime IN (
        'application/pdf',
        'image/jpeg',
        'image/png',
        'text/plain'
      )
    ),
  storage_path text
    CHECK (storage_path IS NULL OR char_length(storage_path) BETWEEN 8 AND 2000),
  pasted_text text
    CHECK (pasted_text IS NULL OR char_length(pasted_text) BETWEEN 1 AND 500000),
  status text NOT NULL DEFAULT 'received'
    CHECK (status IN (
      'received',
      'processing',
      'matched',
      'no_matches',
      'needs_review',
      'failed'
    )),
  entries_found int NOT NULL DEFAULT 0 CHECK (entries_found >= 0),
  hits_found int NOT NULL DEFAULT 0 CHECK (hits_found >= 0),
  parser_notes text
    CHECK (parser_notes IS NULL OR char_length(parser_notes) <= 4000),
  is_demo boolean NOT NULL DEFAULT false,
  retention_until date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT bulletin_uploads_payload_chk CHECK (
    storage_path IS NOT NULL OR pasted_text IS NOT NULL
  )
);

CREATE INDEX IF NOT EXISTS bulletin_uploads_firm_created_idx
  ON ciceron.bulletin_uploads (firm_id, created_at DESC);

CREATE INDEX IF NOT EXISTS bulletin_uploads_firm_state_date_idx
  ON ciceron.bulletin_uploads (firm_id, state_code, publication_date DESC);

CREATE INDEX IF NOT EXISTS bulletin_uploads_source_id_idx
  ON ciceron.bulletin_uploads (source_id);

CREATE INDEX IF NOT EXISTS bulletin_uploads_run_id_idx
  ON ciceron.bulletin_uploads (run_id);

COMMENT ON TABLE ciceron.bulletin_uploads IS
  'Manual bulletin uploads by firm lawyers. Text/txt may be auto-matched; PDF/images stay needs_review until OCR lands.';
COMMENT ON COLUMN ciceron.bulletin_uploads.retention_until IS
  'Raw paste/file retention; default from source retention_days or 30.';

ALTER TABLE ciceron.bulletin_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE ciceron.bulletin_uploads FORCE ROW LEVEL SECURITY;
REVOKE ALL ON ciceron.bulletin_uploads FROM PUBLIC, anon;
GRANT SELECT, INSERT ON ciceron.bulletin_uploads TO authenticated;
GRANT ALL ON ciceron.bulletin_uploads TO service_role;

DROP POLICY IF EXISTS bulletin_uploads_select ON ciceron.bulletin_uploads;
CREATE POLICY bulletin_uploads_select ON ciceron.bulletin_uploads
  FOR SELECT TO authenticated
  USING (firm_id IN (SELECT ciceron.firms_of_current_user()));

DROP POLICY IF EXISTS bulletin_uploads_insert ON ciceron.bulletin_uploads;
CREATE POLICY bulletin_uploads_insert ON ciceron.bulletin_uploads
  FOR INSERT TO authenticated
  WITH CHECK (
    firm_id IN (SELECT ciceron.firms_of_current_user())
    AND ciceron.can_manage_firm(firm_id)
    AND uploaded_by = ciceron.current_actor_id()
  );

DROP TRIGGER IF EXISTS bulletin_uploads_set_updated_at ON ciceron.bulletin_uploads;
CREATE TRIGGER bulletin_uploads_set_updated_at
  BEFORE UPDATE ON ciceron.bulletin_uploads
  FOR EACH ROW EXECUTE FUNCTION ciceron.set_updated_at();

-- ---------------------------------------------------------------------------
-- RPC: create upload row (service_role; app processes text matching after)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION ciceron.create_bulletin_upload(
  p_firm_id uuid,
  p_actor uuid,
  p_state_code text,
  p_state_name text,
  p_publication_date date,
  p_source_id uuid DEFAULT NULL,
  p_mime text DEFAULT NULL,
  p_storage_path text DEFAULT NULL,
  p_pasted_text text DEFAULT NULL,
  p_status text DEFAULT 'received',
  p_entries_found int DEFAULT 0,
  p_hits_found int DEFAULT 0,
  p_parser_notes text DEFAULT NULL,
  p_run_id uuid DEFAULT NULL,
  p_is_demo boolean DEFAULT false,
  p_retention_days int DEFAULT NULL,
  p_upload_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ciceron
AS $$
DECLARE
  actor_role text;
  firm_is_demo boolean;
  src_retention int;
  retain_days int;
  rid uuid;
  uid uuid;
  st text;
BEGIN
  SELECT ms.role INTO actor_role
  FROM ciceron.memberships ms
  WHERE ms.firm_id = p_firm_id AND ms.user_id = p_actor;

  IF actor_role IS NULL OR actor_role NOT IN ('socio', 'asociado', 'admin') THEN
    PERFORM ciceron.write_audit_event(
      p_firm_id, p_actor, 'bulletin_upload_create', 'bulletin_uploads', NULL,
      jsonb_build_object('state_code', p_state_code),
      'denied', 'rbac_role',
      'Solo socio, asociado o administrador puede subir boletines.',
      jsonb_build_object('entity_type', 'bulletin_uploads')
    );
    RETURN jsonb_build_object(
      'ok', false,
      'policy_id', 'rbac_role',
      'policy_reason', 'Solo socio, asociado o administrador puede subir boletines.'
    );
  END IF;

  IF p_storage_path IS NULL AND (p_pasted_text IS NULL OR char_length(trim(p_pasted_text)) < 1) THEN
    RETURN jsonb_build_object(
      'ok', false,
      'policy_id', 'missing_payload',
      'policy_reason', 'Adjunte un archivo o pegue el texto del boletín.'
    );
  END IF;

  st := COALESCE(NULLIF(trim(p_status), ''), 'received');
  IF st NOT IN ('received', 'processing', 'matched', 'no_matches', 'needs_review', 'failed') THEN
    RETURN jsonb_build_object(
      'ok', false,
      'policy_id', 'invalid_status',
      'policy_reason', 'Estado de carga no válido.'
    );
  END IF;

  SELECT f.is_demo INTO firm_is_demo FROM ciceron.firms f WHERE f.id = p_firm_id;

  src_retention := NULL;
  IF p_source_id IS NOT NULL THEN
    SELECT retention_days INTO src_retention
    FROM ciceron.bulletin_sources
    WHERE id = p_source_id;
  END IF;

  retain_days := GREATEST(COALESCE(p_retention_days, src_retention, 30), 1);
  uid := COALESCE(p_upload_id, gen_random_uuid());

  INSERT INTO ciceron.bulletin_uploads (
    id, firm_id, source_id, run_id, state_code, state_name, publication_date,
    uploaded_by, mime, storage_path, pasted_text, status,
    entries_found, hits_found, parser_notes, is_demo, retention_until
  ) VALUES (
    uid,
    p_firm_id,
    p_source_id,
    p_run_id,
    upper(trim(p_state_code)),
    trim(p_state_name),
    p_publication_date,
    p_actor,
    p_mime,
    p_storage_path,
    NULLIF(trim(p_pasted_text), ''),
    st,
    GREATEST(COALESCE(p_entries_found, 0), 0),
    GREATEST(COALESCE(p_hits_found, 0), 0),
    NULLIF(trim(p_parser_notes), ''),
    COALESCE(p_is_demo, firm_is_demo, false),
    p_publication_date + make_interval(days => retain_days)
  )
  RETURNING id INTO rid;

  PERFORM ciceron.write_audit_event(
    p_firm_id, p_actor, 'bulletin_upload_create', 'bulletin_uploads', rid,
    jsonb_build_object(
      'state_code', upper(trim(p_state_code)),
      'status', st,
      'has_file', p_storage_path IS NOT NULL,
      'has_text', p_pasted_text IS NOT NULL
    ),
    'allowed', 'rbac_role', NULL,
    jsonb_build_object('entity_type', 'bulletin_uploads', 'entity_id', rid)
  );

  RETURN jsonb_build_object('ok', true, 'id', rid);
END;
$$;

COMMENT ON FUNCTION ciceron.create_bulletin_upload IS
  'Service-role create of a manual bulletin upload row (socio/asociado/admin).';

REVOKE ALL ON FUNCTION ciceron.create_bulletin_upload(
  uuid, uuid, text, text, date, uuid, text, text, text, text, int, int, text, uuid, boolean, int, uuid
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION ciceron.create_bulletin_upload(
  uuid, uuid, text, text, date, uuid, text, text, text, text, int, int, text, uuid, boolean, int, uuid
) TO service_role;

-- ---------------------------------------------------------------------------
-- RPC: update upload after processing (link run, counts, status)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION ciceron.finalize_bulletin_upload(
  p_firm_id uuid,
  p_upload_id uuid,
  p_actor uuid,
  p_status text,
  p_entries_found int DEFAULT 0,
  p_hits_found int DEFAULT 0,
  p_parser_notes text DEFAULT NULL,
  p_run_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ciceron
AS $$
DECLARE
  actor_role text;
  st text;
BEGIN
  SELECT ms.role INTO actor_role
  FROM ciceron.memberships ms
  WHERE ms.firm_id = p_firm_id AND ms.user_id = p_actor;

  IF actor_role IS NULL OR actor_role NOT IN ('socio', 'asociado', 'admin') THEN
    RETURN jsonb_build_object(
      'ok', false,
      'policy_id', 'rbac_role',
      'policy_reason', 'Solo socio, asociado o administrador puede actualizar una carga.'
    );
  END IF;

  st := trim(p_status);
  IF st NOT IN ('received', 'processing', 'matched', 'no_matches', 'needs_review', 'failed') THEN
    RETURN jsonb_build_object(
      'ok', false,
      'policy_id', 'invalid_status',
      'policy_reason', 'Estado de carga no válido.'
    );
  END IF;

  UPDATE ciceron.bulletin_uploads
  SET status = st,
      entries_found = GREATEST(COALESCE(p_entries_found, 0), 0),
      hits_found = GREATEST(COALESCE(p_hits_found, 0), 0),
      parser_notes = COALESCE(NULLIF(trim(p_parser_notes), ''), parser_notes),
      run_id = COALESCE(p_run_id, run_id),
      updated_at = now()
  WHERE id = p_upload_id AND firm_id = p_firm_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'ok', false,
      'policy_id', 'not_found',
      'policy_reason', 'Carga no encontrada.'
    );
  END IF;

  RETURN jsonb_build_object('ok', true, 'id', p_upload_id);
END;
$$;

REVOKE ALL ON FUNCTION ciceron.finalize_bulletin_upload(
  uuid, uuid, uuid, text, int, int, text, uuid
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION ciceron.finalize_bulletin_upload(
  uuid, uuid, uuid, text, int, int, text, uuid
) TO service_role;
