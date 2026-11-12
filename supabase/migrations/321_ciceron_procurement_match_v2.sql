-- 321_ciceron_procurement_match_v2.sql
-- Pre-demo GROUP C (Matching quality):
--   - watch_profiles.include_procurement (DEFAULT false)
--   - classifications.display_title
--   - legal_edges.edge_type includes 'creates'
--   - prompt_versions: dof_match_relevance v2 (+ classify v2 for display_title)
-- Additive. Agents do NOT apply to production.

-- Procurement opt-in on watch profiles (off by default)
ALTER TABLE ciceron.watch_profiles
  ADD COLUMN IF NOT EXISTS include_procurement boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN ciceron.watch_profiles.include_procurement IS
  'When true, procurement/tender notices (licitación, convocatoria, fallo, contratacion_publica) may match this profile and appear under Contratación pública. Default false excludes them from regulatory matching.';

-- Descriptive title produced at classification when SIDOF title is a REF stub
ALTER TABLE ciceron.classifications
  ADD COLUMN IF NOT EXISTS display_title text;

COMMENT ON COLUMN ciceron.classifications.display_title IS
  'Short descriptive title for UI when dof_notes.title is weak (e.g. Aviso REF:…).';

-- Allow 'creates' on legal_edges (classification extracts creates|amends|repeals)
ALTER TABLE ciceron.legal_edges
  DROP CONSTRAINT IF EXISTS legal_edges_edge_type_check;

ALTER TABLE ciceron.legal_edges
  ADD CONSTRAINT legal_edges_edge_type_check
  CHECK (edge_type IN ('creates', 'amends', 'repeals', 'cites', 'interprets'));

-- Prompt versions (seed UUIDs use e4 hex prefix)
INSERT INTO ciceron.prompt_versions (id, purpose, version_label, template, model_hint)
VALUES
  (
    'e4000000-0000-4000-8000-000000000021'::uuid,
    'dof_match_relevance',
    'v2',
    'Match requires a concrete link between what the note regulates and the client activity/norms. Shared authority or generic keyword is not enough. Reason must name that link.',
    'claude-haiku-4-5-20251001'
  ),
  (
    'e4000000-0000-4000-8000-000000000023'::uuid,
    'dof_classify',
    'v2',
    'Classify with display_title for weak SIDOF titles; document_type includes licitacion/fallo/contratacion_publica; extract norms for legal_edges (creates/amends/repeals).',
    'claude-haiku-4-5-20251001'
  )
ON CONFLICT (purpose, version_label) DO UPDATE
  SET template = EXCLUDED.template,
      model_hint = EXCLUDED.model_hint;
