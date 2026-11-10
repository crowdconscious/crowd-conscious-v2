-- 305_ciceron_dof_pipeline.sql
-- Additive schema for DOF / SIDOF ingestion (Prompt 3).
-- Depends on 298–304. Do not edit applied migrations.

-- Shared corpus connector runs (DOF is not firm-scoped)
ALTER TABLE ciceron.connector_runs
  ALTER COLUMN firm_id DROP NOT NULL;

COMMENT ON COLUMN ciceron.connector_runs.firm_id IS
  'Firm scope for court connectors; NULL for shared corpus runs (e.g. SIDOF/DOF).';

ALTER TABLE ciceron.connector_runs
  ADD COLUMN IF NOT EXISTS target_date date,
  ADD COLUMN IF NOT EXISTS cursor jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS attempt int NOT NULL DEFAULT 1 CHECK (attempt >= 1);

CREATE INDEX IF NOT EXISTS connector_runs_kind_started_idx
  ON ciceron.connector_runs (connector_kind, started_at DESC);

CREATE INDEX IF NOT EXISTS connector_runs_target_date_idx
  ON ciceron.connector_runs (connector_kind, target_date DESC)
  WHERE target_date IS NOT NULL;

-- Ingest lifecycle on dof_notes
ALTER TABLE ciceron.dof_notes
  ADD COLUMN IF NOT EXISTS ingest_status text NOT NULL DEFAULT 'listed'
    CHECK (ingest_status IN (
      'listed',
      'fetched',
      'normalised',
      'chunked',
      'embedding_pending',
      'ready',
      'failed',
      'skipped'
    )),
  ADD COLUMN IF NOT EXISTS edition_kind text
    CHECK (edition_kind IS NULL OR edition_kind IN ('matutina', 'vespertina', 'extraordinaria')),
  ADD COLUMN IF NOT EXISTS content_hash text,
  ADD COLUMN IF NOT EXISTS raw_storage_path text,
  ADD COLUMN IF NOT EXISTS last_error text,
  ADD COLUMN IF NOT EXISTS ready_at timestamptz;

-- Empty SIDOF titles are common on list rows; allow placeholder then update from detail
ALTER TABLE ciceron.dof_notes ALTER COLUMN title DROP NOT NULL;
ALTER TABLE ciceron.dof_notes ALTER COLUMN title SET DEFAULT '';

CREATE INDEX IF NOT EXISTS dof_notes_ingest_status_idx
  ON ciceron.dof_notes (ingest_status, note_date DESC);

-- Idempotent chunk upserts by citation within a version
CREATE UNIQUE INDEX IF NOT EXISTS chunks_version_citation_uidx
  ON ciceron.chunks (version_id, canonical_citation_id)
  WHERE canonical_citation_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS chunks_version_position_uidx
  ON ciceron.chunks (version_id, position);

-- Seed DOF source registry
INSERT INTO ciceron.sources (source_key, display_name, kind, official_base_url)
VALUES (
  'dof_sidof',
  'Diario Oficial de la Federación (SIDOF)',
  'dof',
  'https://sidofqa.segob.gob.mx/dof/sidof'
)
ON CONFLICT (source_key) DO UPDATE
  SET display_name = EXCLUDED.display_name,
      official_base_url = EXCLUDED.official_base_url;

-- Health incidents for zero-note days / consecutive failures
CREATE TABLE IF NOT EXISTS ciceron.source_incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_key text NOT NULL REFERENCES ciceron.sources(source_key) ON DELETE CASCADE,
  incident_date date NOT NULL,
  kind text NOT NULL CHECK (kind IN ('zero_notes', 'consecutive_failures', 'other')),
  severity text NOT NULL DEFAULT 'warning' CHECK (severity IN ('info', 'warning', 'critical')),
  message text NOT NULL,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source_key, incident_date, kind)
);

CREATE INDEX IF NOT EXISTS source_incidents_open_idx
  ON ciceron.source_incidents (source_key, incident_date DESC)
  WHERE resolved_at IS NULL;

ALTER TABLE ciceron.source_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE ciceron.source_incidents FORCE ROW LEVEL SECURITY;
REVOKE ALL ON ciceron.source_incidents FROM anon, authenticated;
GRANT SELECT ON ciceron.source_incidents TO authenticated;
GRANT ALL ON ciceron.source_incidents TO service_role;

DROP POLICY IF EXISTS source_incidents_select ON ciceron.source_incidents;
CREATE POLICY source_incidents_select ON ciceron.source_incidents
  FOR SELECT TO authenticated
  USING (ciceron.is_ciceron_member());

COMMENT ON TABLE ciceron.source_incidents IS
  'DOF/source health incidents (zero notes on a business day, consecutive failed runs).';

COMMENT ON COLUMN ciceron.dof_notes.ingest_status IS
  'Pipeline state: listed→fetched→…→ready (or embedding_pending until back-fill).';
