-- 322_ciceron_alert_review_demo.verify.sql
-- Non-persistent: BEGIN … ROLLBACK.

BEGIN;

DO $$
DECLARE
  n int;
  res jsonb;
  firm uuid := 'a1000000-0000-4000-8000-000000000001'::uuid;
  admin uuid := 'b1000000-0000-4000-8000-000000000004'::uuid;
  asociado uuid := 'b1000000-0000-4000-8000-000000000002'::uuid;
  human_ver uuid := 'f1000000-0000-4000-8000-000000000134'::uuid;
  task uuid := 'f1000000-0000-4000-8000-000000000141'::uuid;
  author uuid;
  status_text text;
  fn text;
BEGIN
  SELECT author_persona INTO author
  FROM ciceron.draft_versions
  WHERE id = human_ver AND author_type = 'human';

  IF author IS DISTINCT FROM asociado THEN
    RAISE EXCEPTION 'FAIL: guided draft author_persona should be Asociado (b100…002), got %', author;
  END IF;

  fn := pg_get_functiondef('ciceron.reset_demo_firm(uuid,uuid)'::regprocedure);
  IF fn IS NULL OR position('is_simulated' IN fn) = 0 THEN
    RAISE EXCEPTION 'FAIL: reset_demo_firm must remove simulated deliveries';
  END IF;
  IF position('tasks_reopened' IN fn) = 0 AND position('en_curso' IN fn) = 0 THEN
    RAISE EXCEPTION 'FAIL: reset_demo_firm must reopen review tasks';
  END IF;

  UPDATE ciceron.review_tasks
  SET status = 'cerrado', updated_at = now()
  WHERE id = task;

  res := ciceron.reset_demo_firm(firm, admin);
  IF COALESCE(res->>'ok', 'false') <> 'true' THEN
    RAISE EXCEPTION 'FAIL: reset_demo_firm: %', res;
  END IF;

  SELECT rt.status INTO status_text
  FROM ciceron.review_tasks rt
  WHERE rt.id = task;

  IF status_text IS DISTINCT FROM 'en_curso' THEN
    RAISE EXCEPTION 'FAIL: guided review task expected en_curso after reset, got %', status_text;
  END IF;

  SELECT author_persona INTO author
  FROM ciceron.draft_versions
  WHERE id = human_ver;
  IF author IS DISTINCT FROM asociado THEN
    RAISE EXCEPTION 'FAIL: reset must keep Asociado as human draft editor';
  END IF;

  SELECT count(*) INTO n
  FROM ciceron.deliveries d
  JOIN ciceron.matters m ON m.id = d.matter_id
  WHERE m.firm_id = firm
    AND d.is_simulated = true;
  IF n <> 0 THEN
    RAISE EXCEPTION 'FAIL: simulated deliveries remain after reset (% )', n;
  END IF;

  RAISE NOTICE 'OK: 322 alert review demo verify passed';
END $$;

ROLLBACK;
