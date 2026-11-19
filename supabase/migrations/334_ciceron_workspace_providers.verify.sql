BEGIN;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'ciceron' AND table_name = 'workspace_provider_settings'
  ) THEN
    RAISE EXCEPTION 'FAIL: workspace_provider_settings missing';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'ciceron' AND table_name = 'google_workspace_connections'
  ) THEN
    RAISE EXCEPTION 'FAIL: google_workspace_connections missing';
  END IF;
END $$;
ROLLBACK;
