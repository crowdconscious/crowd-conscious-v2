-- 307_ciceron_research.verify.sql
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='ciceron' AND c.relname='research_queries'
  ) THEN
    RAISE EXCEPTION 'FAIL: research_queries missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='ciceron' AND p.proname='search_chunks_as_actor'
  ) THEN
    RAISE EXCEPTION 'FAIL: search_chunks_as_actor missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM ciceron.prompt_versions WHERE purpose='research_answer' AND version_label='v1'
  ) THEN
    RAISE EXCEPTION 'FAIL: research_answer prompt missing';
  END IF;

  -- Definer not executable by anon
  IF HAS_FUNCTION_PRIVILEGE('anon', 'ciceron.search_chunks_as_actor(uuid, text, extensions.vector, uuid, uuid, int)', 'EXECUTE') THEN
    RAISE EXCEPTION 'FAIL: anon can execute search_chunks_as_actor';
  END IF;

  RAISE NOTICE 'OK: 307 research schema present';
END $$;
