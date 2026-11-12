-- 316_ciceron_events_rpc_only.verify.sql
-- Non-persistent: BEGIN … ROLLBACK.

BEGIN;

DO $$
BEGIN
  IF has_table_privilege('authenticated', 'ciceron.events', 'INSERT') THEN
    RAISE EXCEPTION 'FAIL: authenticated still has INSERT on ciceron.events';
  END IF;
  IF has_table_privilege('authenticated', 'ciceron.events', 'UPDATE') THEN
    RAISE EXCEPTION 'FAIL: authenticated still has UPDATE on ciceron.events';
  END IF;
  IF has_table_privilege('authenticated', 'ciceron.events', 'DELETE') THEN
    RAISE EXCEPTION 'FAIL: authenticated still has DELETE on ciceron.events';
  END IF;

  -- SELECT retained for firm members
  IF NOT has_table_privilege('authenticated', 'ciceron.events', 'SELECT') THEN
    RAISE EXCEPTION 'FAIL: authenticated lost SELECT on ciceron.events';
  END IF;

  -- Insert policy must be gone
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'ciceron'
      AND tablename = 'events'
      AND policyname = 'events_insert'
  ) THEN
    RAISE EXCEPTION 'FAIL: events_insert policy still exists';
  END IF;

  RAISE NOTICE 'OK: 316 events RPC-only verified';
END $$;

ROLLBACK;
