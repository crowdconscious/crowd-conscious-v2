BEGIN;

DO $$
DECLARE
  n int;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'ciceron' AND table_name = 'morning_email_preferences'
  ) THEN
    RAISE EXCEPTION 'FAIL: morning_email_preferences missing';
  END IF;

  SELECT count(*) INTO n
  FROM pg_policies
  WHERE schemaname = 'ciceron' AND tablename = 'morning_email_preferences';
  IF n < 1 THEN
    RAISE EXCEPTION 'FAIL: expected RLS policy on morning_email_preferences';
  END IF;
END $$;

ROLLBACK;
