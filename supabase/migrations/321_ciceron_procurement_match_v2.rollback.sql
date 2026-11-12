-- Rollback 321 — drops only objects introduced by 321.

ALTER TABLE ciceron.watch_profiles
  DROP COLUMN IF EXISTS include_procurement;

ALTER TABLE ciceron.classifications
  DROP COLUMN IF EXISTS display_title;

ALTER TABLE ciceron.legal_edges
  DROP CONSTRAINT IF EXISTS legal_edges_edge_type_check;

ALTER TABLE ciceron.legal_edges
  ADD CONSTRAINT legal_edges_edge_type_check
  CHECK (edge_type IN ('amends', 'repeals', 'cites', 'interprets'));

DELETE FROM ciceron.prompt_versions
WHERE id IN (
  'e4000000-0000-4000-8000-000000000021'::uuid,
  'e4000000-0000-4000-8000-000000000023'::uuid
)
OR (purpose = 'dof_match_relevance' AND version_label = 'v2')
OR (purpose = 'dof_classify' AND version_label = 'v2');
