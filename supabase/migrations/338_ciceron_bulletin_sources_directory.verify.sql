-- Verify 338 directory seed
BEGIN;
DO $$
DECLARE
  n int;
BEGIN
  SELECT count(DISTINCT state_code) INTO n
  FROM ciceron.bulletin_sources
  WHERE state_code NOT IN ('DOF', 'SCJN', 'FED');
  IF n < 32 THEN
    RAISE EXCEPTION 'FAIL: expected >=32 distinct state_codes, got %', n;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM ciceron.bulletin_sources
    WHERE source_key = 'edomex_boletin' AND needs_login = true
  ) THEN
    RAISE EXCEPTION 'FAIL: edomex must need firm login';
  END IF;

  IF EXISTS (SELECT 1 FROM ciceron.bulletin_sources WHERE enabled = true) THEN
    RAISE EXCEPTION 'FAIL: directory sources must remain enabled=false';
  END IF;

  RAISE NOTICE 'PASS: 338_ciceron_bulletin_sources_directory';
END;
$$;
ROLLBACK;
