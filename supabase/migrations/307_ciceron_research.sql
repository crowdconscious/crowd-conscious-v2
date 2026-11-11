-- 307_ciceron_research.sql
-- Prompt 5: research history + actor-scoped search helper for service role.
-- Additive. Do not edit applied migrations.

CREATE TABLE IF NOT EXISTS ciceron.research_queries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL REFERENCES ciceron.firms(id) ON DELETE CASCADE,
  matter_id uuid REFERENCES ciceron.matters(id) ON DELETE SET NULL,
  user_id uuid,
  question text NOT NULL CHECK (char_length(question) BETWEEN 1 AND 4000),
  ai_output_id uuid REFERENCES ciceron.ai_outputs(id) ON DELETE SET NULL,
  ai_run_id uuid REFERENCES ciceron.ai_runs(id) ON DELETE SET NULL,
  retrieved_chunk_ids uuid[] NOT NULL DEFAULT '{}'::uuid[],
  coverage_note text,
  degraded boolean NOT NULL DEFAULT false,
  feedback text CHECK (feedback IS NULL OR feedback IN ('useful', 'incorrect', 'incomplete')),
  feedback_comment text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS research_queries_firm_id_idx
  ON ciceron.research_queries (firm_id, created_at DESC);
CREATE INDEX IF NOT EXISTS research_queries_matter_id_idx
  ON ciceron.research_queries (matter_id, created_at DESC)
  WHERE matter_id IS NOT NULL;

ALTER TABLE ciceron.research_queries ENABLE ROW LEVEL SECURITY;
ALTER TABLE ciceron.research_queries FORCE ROW LEVEL SECURITY;
REVOKE ALL ON ciceron.research_queries FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE ON ciceron.research_queries TO authenticated;
GRANT ALL ON ciceron.research_queries TO service_role;

DROP POLICY IF EXISTS research_queries_select ON ciceron.research_queries;
CREATE POLICY research_queries_select ON ciceron.research_queries
  FOR SELECT TO authenticated
  USING (firm_id IN (SELECT ciceron.firms_of_current_user()));

DROP POLICY IF EXISTS research_queries_insert ON ciceron.research_queries;
CREATE POLICY research_queries_insert ON ciceron.research_queries
  FOR INSERT TO authenticated
  WITH CHECK (
    firm_id IN (SELECT ciceron.firms_of_current_user())
    AND (user_id IS NULL OR user_id = ciceron.current_actor_id())
  );

DROP POLICY IF EXISTS research_queries_update ON ciceron.research_queries;
CREATE POLICY research_queries_update ON ciceron.research_queries
  FOR UPDATE TO authenticated
  USING (
    firm_id IN (SELECT ciceron.firms_of_current_user())
    AND (user_id IS NULL OR user_id = ciceron.current_actor_id())
  )
  WITH CHECK (
    firm_id IN (SELECT ciceron.firms_of_current_user())
    AND (user_id IS NULL OR user_id = ciceron.current_actor_id())
  );

COMMENT ON TABLE ciceron.research_queries IS
  'Investigación history per firm/matter; tier-1 answers linked via ai_output_id.';

-- Firm monthly research budget (USD). Demo default from env override in app.
CREATE TABLE IF NOT EXISTS ciceron.firm_ai_budgets (
  firm_id uuid PRIMARY KEY REFERENCES ciceron.firms(id) ON DELETE CASCADE,
  monthly_budget_usd numeric(12, 4) NOT NULL DEFAULT 50,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE ciceron.firm_ai_budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ciceron.firm_ai_budgets FORCE ROW LEVEL SECURITY;
REVOKE ALL ON ciceron.firm_ai_budgets FROM PUBLIC, anon;
GRANT SELECT ON ciceron.firm_ai_budgets TO authenticated;
GRANT ALL ON ciceron.firm_ai_budgets TO service_role;

DROP POLICY IF EXISTS firm_ai_budgets_select ON ciceron.firm_ai_budgets;
CREATE POLICY firm_ai_budgets_select ON ciceron.firm_ai_budgets
  FOR SELECT TO authenticated
  USING (firm_id IN (SELECT ciceron.firms_of_current_user()));

INSERT INTO ciceron.firm_ai_budgets (firm_id, monthly_budget_usd)
VALUES ('a1000000-0000-4000-8000-000000000001'::uuid, 50)
ON CONFLICT (firm_id) DO NOTHING;

-- Single-transaction search as a demo/service actor (set_config is txn-local)
CREATE OR REPLACE FUNCTION ciceron.search_chunks_as_actor(
  p_actor uuid,
  query_text text,
  query_embedding extensions.vector(1536),
  p_firm_id uuid,
  p_matter_id uuid DEFAULT NULL,
  p_limit int DEFAULT 20
)
RETURNS TABLE (
  chunk_id uuid,
  document_id uuid,
  chunk_text text,
  fused_score double precision,
  fts_rank double precision,
  vector_distance double precision
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ciceron, public, extensions
AS $$
BEGIN
  PERFORM ciceron.set_actor(p_actor);
  RETURN QUERY
  SELECT *
  FROM ciceron.search_chunks(query_text, query_embedding, p_firm_id, p_matter_id, p_limit);
END;
$$;

REVOKE ALL ON FUNCTION ciceron.search_chunks_as_actor(uuid, text, extensions.vector, uuid, uuid, int)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION ciceron.search_chunks_as_actor(uuid, text, extensions.vector, uuid, uuid, int)
  TO service_role;

COMMENT ON FUNCTION ciceron.search_chunks_as_actor IS
  'Service-role helper: set_actor + search_chunks in one transaction. REVOKE from PUBLIC/anon.';

INSERT INTO ciceron.prompt_versions (purpose, version_label, template, model_hint)
VALUES
  (
    'research_rewrite',
    'v1',
    'Rewrite user legal question into Spanish search queries; JSON only; no tools.',
    'claude-haiku-4-5-20251001'
  ),
  (
    'research_answer',
    'v1',
    'Answer only from numbered passages with chunk ids; formal MX Spanish; cite every legal/fact sentence.',
    'claude-sonnet-5'
  )
ON CONFLICT (purpose, version_label) DO UPDATE
  SET template = EXCLUDED.template, model_hint = EXCLUDED.model_hint;
