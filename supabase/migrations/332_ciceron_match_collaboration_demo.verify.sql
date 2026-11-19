-- Verify 332 demo seed (ROLLBACK)
BEGIN;

DO $$
DECLARE
  n int;
BEGIN
  SELECT count(*) INTO n
  FROM ciceron.match_assignments
  WHERE is_demo = true
    AND firm_id = 'a1000000-0000-4000-8000-000000000001'::uuid;
  IF n < 1 THEN
    RAISE NOTICE 'WARN: no demo match_assignments (may skip if no matches)';
  END IF;

  SELECT count(*) INTO n
  FROM ciceron.match_comments
  WHERE is_demo = true
    AND firm_id = 'a1000000-0000-4000-8000-000000000001'::uuid;
  IF n < 1 THEN
    RAISE NOTICE 'WARN: no demo match_comments (may skip if no matches)';
  END IF;
END $$;

ROLLBACK;
