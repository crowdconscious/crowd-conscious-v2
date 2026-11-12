-- 313_ciceron_review_seed.verify.sql
-- Run after 313. Expect NOTICE; RAISE on failure.

DO $$
DECLARE
  n int;
BEGIN
  SELECT count(*) INTO n FROM ciceron.review_tasks
  WHERE is_demo = true
    AND id IN (
      'g1000000-0000-4000-8000-000000000041'::uuid,
      'g1000000-0000-4000-8000-000000000042'::uuid,
      'g1000000-0000-4000-8000-000000000043'::uuid,
      'g1000000-0000-4000-8000-000000000044'::uuid
    );
  IF n <> 4 THEN
    RAISE EXCEPTION 'FAIL: expected 4 demo review tasks, got %', n;
  END IF;

  SELECT count(*) INTO n FROM ciceron.firm_settings
  WHERE firm_id = 'a1000000-0000-4000-8000-000000000001'::uuid
    AND 'client_alert' = ANY (four_eyes_output_types);
  IF n <> 1 THEN
    RAISE EXCEPTION 'FAIL: four_eyes client_alert not configured';
  END IF;

  SELECT count(*) INTO n FROM ciceron.draft_versions
  WHERE id = 'g1000000-0000-4000-8000-000000000034'::uuid
    AND author_type = 'human'
    AND author_persona = 'b1000000-0000-4000-8000-000000000001'::uuid;
  IF n <> 1 THEN
    RAISE EXCEPTION 'FAIL: four-eyes human edit seed missing';
  END IF;

  RAISE NOTICE 'OK: 313 review seed verify passed';
END $$;
