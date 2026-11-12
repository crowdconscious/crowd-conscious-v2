-- Rollback 321 — drops only objects introduced by 321.
-- Leaves v2 prompt_versions rows in place: ai_runs / classifications may still
-- reference them. Re-adding the old edge_type check requires clearing 'creates'.

ALTER TABLE ciceron.watch_profiles
  DROP COLUMN IF EXISTS include_procurement;

ALTER TABLE ciceron.classifications
  DROP COLUMN IF EXISTS display_title;

-- Must delete creates-edges before restoring the narrower check constraint.
DELETE FROM ciceron.legal_edges
WHERE edge_type = 'creates';

ALTER TABLE ciceron.legal_edges
  DROP CONSTRAINT IF EXISTS legal_edges_edge_type_check;

ALTER TABLE ciceron.legal_edges
  ADD CONSTRAINT legal_edges_edge_type_check
  CHECK (edge_type IN ('amends', 'repeals', 'cites', 'interprets'));

-- Intentionally NOT deleting dof_classify/dof_match_relevance v2 prompt rows
-- (or nulling prompt_version_id on ai_runs / classifications that used them).
