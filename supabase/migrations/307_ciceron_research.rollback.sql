-- 307_ciceron_research.rollback.sql (branch / non-prod only)
REVOKE ALL ON FUNCTION ciceron.search_chunks_as_actor(uuid, text, extensions.vector, uuid, uuid, int) FROM PUBLIC, anon, authenticated, service_role;
DROP FUNCTION IF EXISTS ciceron.search_chunks_as_actor(uuid, text, extensions.vector, uuid, uuid, int);

DROP POLICY IF EXISTS research_queries_update ON ciceron.research_queries;
DROP POLICY IF EXISTS research_queries_insert ON ciceron.research_queries;
DROP POLICY IF EXISTS research_queries_select ON ciceron.research_queries;
DROP TABLE IF EXISTS ciceron.research_queries;

DROP POLICY IF EXISTS firm_ai_budgets_select ON ciceron.firm_ai_budgets;
DROP TABLE IF EXISTS ciceron.firm_ai_budgets;

DELETE FROM ciceron.prompt_versions
WHERE purpose IN ('research_rewrite', 'research_answer') AND version_label = 'v1';
