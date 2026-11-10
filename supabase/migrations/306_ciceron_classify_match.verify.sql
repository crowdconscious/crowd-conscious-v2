-- 306_ciceron_classify_match.verify.sql
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='ciceron' AND table_name='dof_notes' AND column_name='classify_status'
  ) THEN
    RAISE EXCEPTION 'FAIL: classify_status missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='ciceron' AND table_name='classifications' AND column_name='payload'
  ) THEN
    RAISE EXCEPTION 'FAIL: classifications.payload missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM ciceron.prompt_versions WHERE purpose='dof_classify' AND version_label='v1'
  ) THEN
    RAISE EXCEPTION 'FAIL: dof_classify prompt_versions missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM ciceron.watch_profiles
    WHERE id='e1000000-0000-4000-8000-000000000001'::uuid
      AND 'CNBV' = ANY(authorities)
  ) THEN
    RAISE EXCEPTION 'FAIL: enriched Nexora watch profile missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='ciceron' AND c.relname='saved_views'
  ) THEN
    RAISE EXCEPTION 'FAIL: saved_views missing';
  END IF;

  RAISE NOTICE 'OK: 306 classify/match schema present';
END $$;
