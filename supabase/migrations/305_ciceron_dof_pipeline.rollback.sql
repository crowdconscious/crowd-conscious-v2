-- 305_ciceron_dof_pipeline.rollback.sql (branch / non-prod only)
DROP POLICY IF EXISTS source_incidents_select ON ciceron.source_incidents;
DROP TABLE IF EXISTS ciceron.source_incidents;

DROP INDEX IF EXISTS ciceron.chunks_version_citation_uidx;
DROP INDEX IF EXISTS ciceron.chunks_version_position_uidx;
DROP INDEX IF EXISTS ciceron.dof_notes_ingest_status_idx;
DROP INDEX IF EXISTS ciceron.connector_runs_kind_started_idx;
DROP INDEX IF EXISTS ciceron.connector_runs_target_date_idx;

ALTER TABLE ciceron.dof_notes
  DROP COLUMN IF EXISTS ingest_status,
  DROP COLUMN IF EXISTS edition_kind,
  DROP COLUMN IF EXISTS content_hash,
  DROP COLUMN IF EXISTS raw_storage_path,
  DROP COLUMN IF EXISTS last_error,
  DROP COLUMN IF EXISTS ready_at;

ALTER TABLE ciceron.connector_runs
  DROP COLUMN IF EXISTS target_date,
  DROP COLUMN IF EXISTS cursor,
  DROP COLUMN IF EXISTS attempt;

-- Re-tighten firm_id only if no NULL rows remain
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM ciceron.connector_runs WHERE firm_id IS NULL) THEN
    ALTER TABLE ciceron.connector_runs ALTER COLUMN firm_id SET NOT NULL;
  END IF;
END $$;

DELETE FROM ciceron.sources WHERE source_key = 'dof_sidof';
