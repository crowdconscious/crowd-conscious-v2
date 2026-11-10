-- 298_ciceron_foundation.sql
-- Cicéron legal module: pgvector, schema, grants, tables, indexes, updated_at triggers.
-- Idempotent where practical (IF NOT EXISTS / CREATE OR REPLACE). No seed data.
-- Apply on a Supabase preview branch before production.

-- ---------------------------------------------------------------------------
-- Extension and schema
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

CREATE SCHEMA IF NOT EXISTS ciceron;

COMMENT ON SCHEMA ciceron IS 'Cicéron legal intelligence — isolated from public civic tables.';

GRANT USAGE ON SCHEMA ciceron TO postgres, authenticated, service_role;
GRANT ALL ON SCHEMA ciceron TO service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA ciceron
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA ciceron
  GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA ciceron
  GRANT USAGE, SELECT ON SEQUENCES TO authenticated, service_role;

REVOKE ALL ON SCHEMA ciceron FROM anon;

-- ---------------------------------------------------------------------------
-- updated_at helper
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION ciceron.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION ciceron.set_updated_at() IS 'BEFORE UPDATE trigger: sets updated_at to now().';

-- ---------------------------------------------------------------------------
-- Tenancy
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ciceron.firms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 300),
  slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9][a-z0-9-]{0,62}$'),
  is_demo boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE ciceron.firms IS 'Law firm tenant root.';
COMMENT ON COLUMN ciceron.firms.is_demo IS 'Datos de demostración — fictional firm for the hosted demo.';

CREATE TABLE IF NOT EXISTS ciceron.memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL REFERENCES ciceron.firms(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('socio', 'asociado', 'pasante', 'admin')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (firm_id, user_id)
);

CREATE INDEX IF NOT EXISTS memberships_user_id_idx ON ciceron.memberships (user_id);
CREATE INDEX IF NOT EXISTS memberships_firm_id_idx ON ciceron.memberships (firm_id);

COMMENT ON TABLE ciceron.memberships IS 'Links auth.users to a firm with a desk role.';

CREATE TABLE IF NOT EXISTS ciceron.matter_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  matter_id uuid NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text CHECK (role IS NULL OR char_length(role) BETWEEN 1 AND 80),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (matter_id, user_id)
);

CREATE INDEX IF NOT EXISTS matter_members_user_id_idx ON ciceron.matter_members (user_id);

COMMENT ON TABLE ciceron.matter_members IS 'Optional per-matter staffing; required for pasante access to matter data.';

-- ---------------------------------------------------------------------------
-- Practice (clients, matters, parties, watch profiles)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ciceron.clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL REFERENCES ciceron.firms(id) ON DELETE CASCADE,
  display_name text NOT NULL CHECK (char_length(display_name) BETWEEN 1 AND 300),
  external_ref text,
  is_demo boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS clients_firm_id_idx ON ciceron.clients (firm_id, created_at DESC);

COMMENT ON COLUMN ciceron.clients.is_demo IS 'Datos de demostración — fictional client.';

CREATE TABLE IF NOT EXISTS ciceron.matters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL REFERENCES ciceron.firms(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES ciceron.clients(id) ON DELETE RESTRICT,
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 500),
  matter_ref text,
  status text NOT NULL DEFAULT 'activo' CHECK (status IN ('activo', 'cerrado', 'archivado')),
  is_demo boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS matters_firm_id_idx ON ciceron.matters (firm_id, created_at DESC);
CREATE INDEX IF NOT EXISTS matters_client_id_idx ON ciceron.matters (client_id);

COMMENT ON COLUMN ciceron.matters.is_demo IS 'Datos de demostración — fictional matter.';

ALTER TABLE ciceron.matter_members
  DROP CONSTRAINT IF EXISTS matter_members_matter_id_fkey;
ALTER TABLE ciceron.matter_members
  ADD CONSTRAINT matter_members_matter_id_fkey
  FOREIGN KEY (matter_id) REFERENCES ciceron.matters(id) ON DELETE CASCADE;

CREATE TABLE IF NOT EXISTS ciceron.parties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  matter_id uuid NOT NULL REFERENCES ciceron.matters(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 300),
  party_role text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS parties_matter_id_idx ON ciceron.parties (matter_id);

CREATE TABLE IF NOT EXISTS ciceron.watch_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES ciceron.clients(id) ON DELETE CASCADE,
  subject_areas text[] NOT NULL DEFAULT '{}'::text[],
  authorities text[] NOT NULL DEFAULT '{}'::text[],
  keywords text[] NOT NULL DEFAULT '{}'::text[],
  norms_of_interest text[] NOT NULL DEFAULT '{}'::text[],
  description text,
  embedding extensions.vector(1536),
  embedding_model text,
  is_demo boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS watch_profiles_client_id_idx ON ciceron.watch_profiles (client_id);

COMMENT ON TABLE ciceron.watch_profiles IS 'Client-specific DOF monitoring profile with optional semantic embedding.';
COMMENT ON COLUMN ciceron.watch_profiles.embedding IS 'OpenAI text-embedding-3-small (1536 dimensions).';
COMMENT ON COLUMN ciceron.watch_profiles.is_demo IS 'Datos de demostración — fictional watch profile.';

-- ---------------------------------------------------------------------------
-- Corpus (sources, documents, versions, chunks)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ciceron.sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_key text NOT NULL UNIQUE CHECK (char_length(source_key) BETWEEN 1 AND 120),
  display_name text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('dof', 'legislacion', 'jurisprudencia', 'interno', 'otro')),
  official_base_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE ciceron.sources IS 'Canonical ingest source registry (DOF, statutes, etc.).';

CREATE TABLE IF NOT EXISTS ciceron.documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  canonical_id text NOT NULL UNIQUE CHECK (char_length(canonical_id) BETWEEN 1 AND 200),
  doc_type text NOT NULL CHECK (char_length(doc_type) BETWEEN 1 AND 80),
  title text,
  official_url text,
  firm_id uuid REFERENCES ciceron.firms(id) ON DELETE CASCADE,
  source_id uuid REFERENCES ciceron.sources(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS documents_firm_id_idx ON ciceron.documents (firm_id) WHERE firm_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS documents_source_id_idx ON ciceron.documents (source_id);

COMMENT ON COLUMN ciceron.documents.firm_id IS 'NULL = shared official corpus readable by any firm member; non-null = firm-private upload.';

CREATE TABLE IF NOT EXISTS ciceron.document_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES ciceron.documents(id) ON DELETE CASCADE,
  valid_from date,
  valid_to date,
  content_hash text NOT NULL CHECK (char_length(content_hash) BETWEEN 8 AND 128),
  raw_storage_path text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (valid_to IS NULL OR valid_from IS NULL OR valid_to >= valid_from)
);

CREATE INDEX IF NOT EXISTS document_versions_document_id_idx
  ON ciceron.document_versions (document_id, created_at DESC);

CREATE TABLE IF NOT EXISTS ciceron.chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version_id uuid NOT NULL REFERENCES ciceron.document_versions(id) ON DELETE CASCADE,
  text text NOT NULL,
  search_tsv tsvector GENERATED ALWAYS AS (to_tsvector('spanish', coalesce(text, ''))) STORED,
  embedding extensions.vector(1536),
  embedding_model text,
  position int NOT NULL DEFAULT 0 CHECK (position >= 0),
  canonical_citation_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS chunks_version_id_position_idx ON ciceron.chunks (version_id, position);
CREATE INDEX IF NOT EXISTS chunks_search_tsv_gin_idx ON ciceron.chunks USING gin (search_tsv);
CREATE INDEX IF NOT EXISTS chunks_embedding_hnsw_idx
  ON ciceron.chunks USING hnsw (embedding extensions.vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

COMMENT ON TABLE ciceron.chunks IS 'Retrieval unit with Spanish FTS and pgvector embedding.';
COMMENT ON COLUMN ciceron.chunks.embedding IS 'OpenAI text-embedding-3-small (1536 dimensions).';

-- ---------------------------------------------------------------------------
-- Legal graph
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ciceron.legal_entities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL CHECK (kind IN ('norm', 'article', 'thesis', 'authority', 'court')),
  label text NOT NULL CHECK (char_length(label) BETWEEN 1 AND 500),
  external_ref text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS legal_entities_kind_idx ON ciceron.legal_entities (kind);

CREATE TABLE IF NOT EXISTS ciceron.legal_edges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_id uuid NOT NULL REFERENCES ciceron.legal_entities(id) ON DELETE CASCADE,
  to_id uuid NOT NULL REFERENCES ciceron.legal_entities(id) ON DELETE CASCADE,
  edge_type text NOT NULL CHECK (edge_type IN ('amends', 'repeals', 'cites', 'interprets')),
  source_document_id uuid REFERENCES ciceron.documents(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (from_id <> to_id)
);

CREATE INDEX IF NOT EXISTS legal_edges_from_id_idx ON ciceron.legal_edges (from_id);
CREATE INDEX IF NOT EXISTS legal_edges_to_id_idx ON ciceron.legal_edges (to_id);

-- ---------------------------------------------------------------------------
-- DOF monitoring
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ciceron.dof_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  note_code text NOT NULL UNIQUE CHECK (char_length(note_code) BETWEEN 1 AND 80),
  note_date date NOT NULL,
  edition text,
  section text,
  authority text,
  title text NOT NULL,
  document_id uuid REFERENCES ciceron.documents(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS dof_notes_note_date_idx ON ciceron.dof_notes (note_date DESC);

CREATE TABLE IF NOT EXISTS ciceron.classifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dof_note_id uuid REFERENCES ciceron.dof_notes(id) ON DELETE CASCADE,
  chunk_id uuid REFERENCES ciceron.chunks(id) ON DELETE SET NULL,
  labels text[] NOT NULL DEFAULT '{}'::text[],
  confidence numeric(5, 4) CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1)),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS classifications_dof_note_id_idx ON ciceron.classifications (dof_note_id);

CREATE TABLE IF NOT EXISTS ciceron.matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dof_note_id uuid NOT NULL REFERENCES ciceron.dof_notes(id) ON DELETE CASCADE,
  watch_profile_id uuid NOT NULL REFERENCES ciceron.watch_profiles(id) ON DELETE CASCADE,
  score numeric(6, 4) NOT NULL CHECK (score >= 0 AND score <= 1),
  reason text,
  suggested_action text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (dof_note_id, watch_profile_id)
);

CREATE INDEX IF NOT EXISTS matches_watch_profile_id_idx ON ciceron.matches (watch_profile_id);

CREATE TABLE IF NOT EXISTS ciceron.alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL REFERENCES ciceron.firms(id) ON DELETE CASCADE,
  match_id uuid REFERENCES ciceron.matches(id) ON DELETE SET NULL,
  matter_id uuid REFERENCES ciceron.matters(id) ON DELETE SET NULL,
  client_id uuid REFERENCES ciceron.clients(id) ON DELETE SET NULL,
  severity text NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'attention', 'urgent')),
  status text NOT NULL DEFAULT 'nuevo' CHECK (status IN ('nuevo', 'visto', 'archivado')),
  headline text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS alerts_firm_id_idx ON ciceron.alerts (firm_id, created_at DESC);

CREATE TABLE IF NOT EXISTS ciceron.digests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL REFERENCES ciceron.firms(id) ON DELETE CASCADE,
  digest_date date NOT NULL,
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (firm_id, digest_date)
);

-- ---------------------------------------------------------------------------
-- Court files and deadlines
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ciceron.case_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL REFERENCES ciceron.firms(id) ON DELETE CASCADE,
  matter_id uuid NOT NULL REFERENCES ciceron.matters(id) ON DELETE CASCADE,
  is_sample boolean NOT NULL DEFAULT false,
  court_name text,
  file_number text,
  connector_kind text CHECK (connector_kind IS NULL OR connector_kind IN ('sample', 'manual', 'public_lookup')),
  status text NOT NULL DEFAULT 'activo' CHECK (status IN ('activo', 'cerrado')),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS case_files_matter_id_idx ON ciceron.case_files (matter_id);
CREATE INDEX IF NOT EXISTS case_files_firm_id_idx ON ciceron.case_files (firm_id);

COMMENT ON COLUMN ciceron.case_files.is_sample IS 'Datos de demostración — fictional court file, not a live judiciary login.';

CREATE TABLE IF NOT EXISTS ciceron.case_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_file_id uuid NOT NULL REFERENCES ciceron.case_files(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  occurred_at timestamptz NOT NULL,
  summary text,
  raw_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS case_events_case_file_id_idx ON ciceron.case_events (case_file_id, occurred_at DESC);

CREATE TABLE IF NOT EXISTS ciceron.deadlines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  matter_id uuid NOT NULL REFERENCES ciceron.matters(id) ON DELETE CASCADE,
  case_file_id uuid REFERENCES ciceron.case_files(id) ON DELETE SET NULL,
  due_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'propuesto' CHECK (status IN ('propuesto', 'confirmado', 'descartado')),
  basis_text text,
  confirmed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  proposed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS deadlines_matter_id_due_idx ON ciceron.deadlines (matter_id, due_at);

CREATE TABLE IF NOT EXISTS ciceron.connector_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL REFERENCES ciceron.firms(id) ON DELETE CASCADE,
  connector_kind text NOT NULL,
  status text NOT NULL CHECK (status IN ('running', 'succeeded', 'failed', 'partial')),
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  error_message text,
  stats jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS connector_runs_firm_id_idx ON ciceron.connector_runs (firm_id, started_at DESC);

CREATE TABLE IF NOT EXISTS ciceron.non_working_days (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  calendar_date date NOT NULL,
  jurisdiction text NOT NULL DEFAULT 'MX' CHECK (char_length(jurisdiction) BETWEEN 2 AND 32),
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (jurisdiction, calendar_date)
);

COMMENT ON TABLE ciceron.non_working_days IS 'Judicial / fiscal non-working days for deadline math.';

-- ---------------------------------------------------------------------------
-- AI runs and outputs
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ciceron.prompt_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purpose text NOT NULL CHECK (char_length(purpose) BETWEEN 1 AND 120),
  version_label text NOT NULL,
  template text NOT NULL,
  model_hint text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (purpose, version_label)
);

CREATE TABLE IF NOT EXISTS ciceron.ai_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purpose text NOT NULL,
  model text NOT NULL,
  prompt_version_id uuid REFERENCES ciceron.prompt_versions(id) ON DELETE SET NULL,
  input_tokens int CHECK (input_tokens IS NULL OR input_tokens >= 0),
  output_tokens int CHECK (output_tokens IS NULL OR output_tokens >= 0),
  cost_estimate_usd numeric(12, 6),
  latency_ms int CHECK (latency_ms IS NULL OR latency_ms >= 0),
  retrieved_chunk_ids uuid[] NOT NULL DEFAULT '{}'::uuid[],
  firm_id uuid REFERENCES ciceron.firms(id) ON DELETE SET NULL,
  matter_id uuid REFERENCES ciceron.matters(id) ON DELETE SET NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ai_runs_firm_id_idx ON ciceron.ai_runs (firm_id, created_at DESC);
CREATE INDEX IF NOT EXISTS ai_runs_matter_id_idx ON ciceron.ai_runs (matter_id, created_at DESC);

CREATE TABLE IF NOT EXISTS ciceron.ai_outputs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ai_run_id uuid NOT NULL REFERENCES ciceron.ai_runs(id) ON DELETE CASCADE,
  tier int NOT NULL CHECK (tier BETWEEN 0 AND 3),
  status text NOT NULL DEFAULT 'borrador'
    CHECK (status IN ('borrador', 'en_revision', 'aprobado', 'corregido', 'rechazado', 'entregado')),
  body text,
  structured jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ai_outputs_ai_run_id_idx ON ciceron.ai_outputs (ai_run_id);

COMMENT ON COLUMN ciceron.ai_outputs.tier IS '0=internal alert, 1=draft research, 2=client-facing (review gate), 3=forbidden automation.';

CREATE TABLE IF NOT EXISTS ciceron.output_citations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ai_output_id uuid NOT NULL REFERENCES ciceron.ai_outputs(id) ON DELETE CASCADE,
  chunk_id uuid NOT NULL REFERENCES ciceron.chunks(id) ON DELETE RESTRICT,
  citation_label text,
  span_start int,
  span_end int,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS output_citations_ai_output_id_idx ON ciceron.output_citations (ai_output_id);

-- ---------------------------------------------------------------------------
-- Human oversight
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ciceron.review_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  matter_id uuid NOT NULL REFERENCES ciceron.matters(id) ON DELETE CASCADE,
  ai_output_id uuid REFERENCES ciceron.ai_outputs(id) ON DELETE SET NULL,
  assignee_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pendiente' CHECK (status IN ('pendiente', 'en_curso', 'cerrado')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS review_tasks_matter_id_idx ON ciceron.review_tasks (matter_id, created_at DESC);

CREATE TABLE IF NOT EXISTS ciceron.review_decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_task_id uuid REFERENCES ciceron.review_tasks(id) ON DELETE SET NULL,
  matter_id uuid NOT NULL REFERENCES ciceron.matters(id) ON DELETE CASCADE,
  ai_output_id uuid REFERENCES ciceron.ai_outputs(id) ON DELETE SET NULL,
  decision text NOT NULL CHECK (decision IN ('approved', 'corrected', 'rejected', 'returned')),
  decided_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS review_decisions_matter_id_idx ON ciceron.review_decisions (matter_id, created_at DESC);
CREATE INDEX IF NOT EXISTS review_decisions_ai_output_id_idx ON ciceron.review_decisions (ai_output_id);

CREATE TABLE IF NOT EXISTS ciceron.deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  matter_id uuid NOT NULL REFERENCES ciceron.matters(id) ON DELETE CASCADE,
  ai_output_id uuid NOT NULL REFERENCES ciceron.ai_outputs(id) ON DELETE RESTRICT,
  channel text,
  delivered_at timestamptz NOT NULL DEFAULT now(),
  delivered_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS deliveries_matter_id_idx ON ciceron.deliveries (matter_id, delivered_at DESC);

CREATE TABLE IF NOT EXISTS ciceron.audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL REFERENCES ciceron.firms(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS audit_events_firm_id_idx ON ciceron.audit_events (firm_id, created_at DESC);

COMMENT ON TABLE ciceron.audit_events IS 'Append-only audit trail for views, approvals, deliveries, and exports.';

-- ---------------------------------------------------------------------------
-- Drafting
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ciceron.drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  matter_id uuid NOT NULL REFERENCES ciceron.matters(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 300),
  status text NOT NULL DEFAULT 'borrador' CHECK (status IN ('borrador', 'en_revision', 'cerrado')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS drafts_matter_id_idx ON ciceron.drafts (matter_id);

CREATE TABLE IF NOT EXISTS ciceron.draft_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  draft_id uuid NOT NULL REFERENCES ciceron.drafts(id) ON DELETE CASCADE,
  author_type text NOT NULL CHECK (author_type IN ('human', 'model')),
  author_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  body text NOT NULL,
  ai_output_id uuid REFERENCES ciceron.ai_outputs(id) ON DELETE SET NULL,
  version_number int NOT NULL DEFAULT 1 CHECK (version_number >= 1),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (draft_id, version_number)
);

CREATE TABLE IF NOT EXISTS ciceron.comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  draft_id uuid NOT NULL REFERENCES ciceron.drafts(id) ON DELETE CASCADE,
  draft_version_id uuid REFERENCES ciceron.draft_versions(id) ON DELETE SET NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 8000),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS comments_draft_id_idx ON ciceron.comments (draft_id, created_at);

CREATE TABLE IF NOT EXISTS ciceron.assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  matter_id uuid NOT NULL REFERENCES ciceron.matters(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assignment_role text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (matter_id, user_id)
);

-- ---------------------------------------------------------------------------
-- Product analytics
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ciceron.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 120),
  firm_id uuid REFERENCES ciceron.firms(id) ON DELETE SET NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  properties jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS events_firm_id_occurred_idx ON ciceron.events (firm_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS events_name_occurred_idx ON ciceron.events (name, occurred_at DESC);

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'firms', 'memberships', 'clients', 'matters', 'watch_profiles',
    'documents', 'dof_notes', 'alerts', 'case_files', 'deadlines',
    'ai_outputs', 'review_tasks', 'drafts'
  ] LOOP
  EXECUTE format($sql$
    DROP TRIGGER IF EXISTS set_updated_at ON ciceron.%I;
    CREATE TRIGGER set_updated_at
      BEFORE UPDATE ON ciceron.%I
      FOR EACH ROW EXECUTE FUNCTION ciceron.set_updated_at();
  $sql$, t, t);
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- Table grants (RLS applied in 299)
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'firms', 'memberships', 'matter_members', 'clients', 'matters', 'parties',
    'watch_profiles', 'sources', 'documents', 'document_versions', 'chunks',
    'legal_entities', 'legal_edges', 'dof_notes', 'classifications', 'matches',
    'alerts', 'digests', 'case_files', 'case_events', 'deadlines',
    'connector_runs', 'non_working_days', 'prompt_versions', 'ai_runs',
    'ai_outputs', 'output_citations', 'review_tasks', 'review_decisions',
    'deliveries', 'audit_events', 'drafts', 'draft_versions', 'comments',
    'assignments', 'events'
  ] LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON ciceron.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON ciceron.%I TO service_role', t);
  END LOOP;
END $$;
