-- Verify 321: procurement column, creates edge type, display_title, match v2 prompt.
-- Non-persistent: BEGIN … ROLLBACK.

BEGIN;

DO $$
DECLARE
  n int;
  edge_ok boolean;
BEGIN
  SELECT count(*) INTO n
  FROM information_schema.columns
  WHERE table_schema = 'ciceron'
    AND table_name = 'watch_profiles'
    AND column_name = 'include_procurement';
  IF n <> 1 THEN
    RAISE EXCEPTION 'FAIL: watch_profiles.include_procurement missing';
  END IF;

  SELECT count(*) INTO n
  FROM information_schema.columns
  WHERE table_schema = 'ciceron'
    AND table_name = 'classifications'
    AND column_name = 'display_title';
  IF n <> 1 THEN
    RAISE EXCEPTION 'FAIL: classifications.display_title missing';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace nsp ON nsp.oid = t.relnamespace
    WHERE nsp.nspname = 'ciceron'
      AND t.relname = 'legal_edges'
      AND c.conname = 'legal_edges_edge_type_check'
      AND pg_get_constraintdef(c.oid) ILIKE '%creates%'
  ) INTO edge_ok;
  IF NOT edge_ok THEN
    RAISE EXCEPTION 'FAIL: legal_edges must allow creates';
  END IF;

  SELECT count(*) INTO n
  FROM ciceron.prompt_versions
  WHERE purpose = 'dof_match_relevance' AND version_label = 'v2';
  IF n < 1 THEN
    RAISE EXCEPTION 'FAIL: match relevance v2 prompt missing';
  END IF;

  SELECT count(*) INTO n
  FROM ciceron.prompt_versions
  WHERE purpose = 'dof_classify' AND version_label = 'v2';
  IF n < 1 THEN
    RAISE EXCEPTION 'FAIL: classify v2 prompt missing';
  END IF;

  -- Default must be false
  SELECT count(*) INTO n
  FROM information_schema.columns
  WHERE table_schema = 'ciceron'
    AND table_name = 'watch_profiles'
    AND column_name = 'include_procurement'
    AND column_default ILIKE '%false%';
  IF n <> 1 THEN
    RAISE EXCEPTION 'FAIL: include_procurement default is not false';
  END IF;

  RAISE NOTICE 'OK: 321 procurement / match v2 verified';
END $$;

ROLLBACK;
