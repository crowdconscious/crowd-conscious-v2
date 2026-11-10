-- 306_ciceron_classify_match.rollback.sql (branch / non-prod only)
DROP POLICY IF EXISTS saved_views_write ON ciceron.saved_views;
DROP POLICY IF EXISTS saved_views_select ON ciceron.saved_views;
DROP TABLE IF EXISTS ciceron.saved_views;

DROP INDEX IF EXISTS ciceron.classifications_dof_note_uidx;
DROP INDEX IF EXISTS ciceron.dof_notes_classify_status_idx;
DROP INDEX IF EXISTS ciceron.dof_notes_match_status_idx;

ALTER TABLE ciceron.dof_notes
  DROP COLUMN IF EXISTS classify_status,
  DROP COLUMN IF EXISTS match_status;

ALTER TABLE ciceron.matches
  DROP COLUMN IF EXISTS supporting_chunk_ids,
  DROP COLUMN IF EXISTS candidate_score,
  DROP COLUMN IF EXISTS vector_used,
  DROP COLUMN IF EXISTS feedback,
  DROP COLUMN IF EXISTS feedback_reason,
  DROP COLUMN IF EXISTS feedback_at,
  DROP COLUMN IF EXISTS ai_run_id;

ALTER TABLE ciceron.classifications
  DROP COLUMN IF EXISTS document_type,
  DROP COLUMN IF EXISTS authority,
  DROP COLUMN IF EXISTS summary,
  DROP COLUMN IF EXISTS entry_into_force,
  DROP COLUMN IF EXISTS compliance_deadlines,
  DROP COLUMN IF EXISTS payload,
  DROP COLUMN IF EXISTS prompt_version_id,
  DROP COLUMN IF EXISTS ai_run_id;

DELETE FROM ciceron.prompt_versions
WHERE purpose IN ('dof_classify', 'dof_match_relevance', 'dof_client_alert_draft')
  AND version_label = 'v1';
