-- 313_ciceron_review_seed.verify.sql
-- Run after 313. Expect NOTICE; RAISE on failure.

DO $$
DECLARE
  n int;
BEGIN
  SELECT count(*) INTO n FROM ciceron.review_tasks
  WHERE is_demo = true
    AND id IN (
      'f1000000-0000-4000-8000-000000000141'::uuid,
      'f1000000-0000-4000-8000-000000000142'::uuid,
      'f1000000-0000-4000-8000-000000000143'::uuid,
      'f1000000-0000-4000-8000-000000000144'::uuid
    );
  IF n <> 4 THEN
    RAISE EXCEPTION 'FAIL: expected 4 demo review tasks, got %', n;
  END IF;

  -- Task 144 must not share ai_output / draft with four-eyes task 141
  SELECT count(*) INTO n FROM ciceron.review_tasks
  WHERE id = 'f1000000-0000-4000-8000-000000000144'::uuid
    AND ai_output_id = 'f1000000-0000-4000-8000-000000000114'::uuid
    AND draft_id = 'f1000000-0000-4000-8000-000000000124'::uuid
    AND output_type = 'client_notify';
  IF n <> 1 THEN
    RAISE EXCEPTION 'FAIL: task 144 must use its own client_notify output/draft';
  END IF;

  SELECT count(*) INTO n FROM ciceron.firm_settings
  WHERE firm_id = 'a1000000-0000-4000-8000-000000000001'::uuid
    AND 'client_alert' = ANY (four_eyes_output_types);
  IF n <> 1 THEN
    RAISE EXCEPTION 'FAIL: four_eyes client_alert not configured';
  END IF;

  SELECT count(*) INTO n FROM ciceron.draft_versions
  WHERE id = 'f1000000-0000-4000-8000-000000000134'::uuid
    AND author_type = 'human'
    AND author_persona = 'b1000000-0000-4000-8000-000000000001'::uuid;
  IF n <> 1 THEN
    RAISE EXCEPTION 'FAIL: four-eyes human edit seed missing';
  END IF;

  RAISE NOTICE 'OK: 313 review seed verify passed';
END $$;
