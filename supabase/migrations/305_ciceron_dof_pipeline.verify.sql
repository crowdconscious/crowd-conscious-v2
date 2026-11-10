-- 305_ciceron_dof_pipeline.verify.sql
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'ciceron' AND table_name = 'dof_notes' AND column_name = 'ingest_status'
  ) THEN
    RAISE EXCEPTION 'FAIL: dof_notes.ingest_status missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'ciceron' AND table_name = 'connector_runs' AND column_name = 'target_date'
  ) THEN
    RAISE EXCEPTION 'FAIL: connector_runs.target_date missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM ciceron.sources WHERE source_key = 'dof_sidof'
  ) THEN
    RAISE EXCEPTION 'FAIL: dof_sidof source missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'ciceron' AND c.relname = 'source_incidents'
  ) THEN
    RAISE EXCEPTION 'FAIL: source_incidents missing';
  END IF;

  -- firm_id nullable
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'ciceron' AND table_name = 'connector_runs'
      AND column_name = 'firm_id' AND is_nullable = 'NO'
  ) THEN
    RAISE EXCEPTION 'FAIL: connector_runs.firm_id still NOT NULL';
  END IF;

  RAISE NOTICE 'OK: 305 DOF pipeline schema present';
END $$;
