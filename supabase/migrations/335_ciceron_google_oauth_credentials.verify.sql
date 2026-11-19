BEGIN;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'ciceron' AND table_name = 'google_oauth_credentials'
  ) THEN
    RAISE EXCEPTION 'FAIL: google_oauth_credentials missing';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM information_schema.role_table_grants
    WHERE table_schema = 'ciceron'
      AND table_name = 'google_oauth_credentials'
      AND grantee = 'authenticated'
  ) THEN
    RAISE EXCEPTION 'FAIL: authenticated must not have grants on google_oauth_credentials';
  END IF;
END $$;
ROLLBACK;
