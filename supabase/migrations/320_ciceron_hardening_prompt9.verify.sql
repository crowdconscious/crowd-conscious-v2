-- 320_ciceron_hardening_prompt9.verify.sql
-- Non-persistent: BEGIN … ROLLBACK.

BEGIN;

DO $$
DECLARE
  select_policies int;
  write_all int;
BEGIN
  -- authenticated must NOT execute set_actor
  IF has_function_privilege('authenticated', 'ciceron.set_actor(uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'FAIL: authenticated still has EXECUTE on set_actor';
  END IF;
  IF has_function_privilege('anon', 'ciceron.set_actor(uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'FAIL: anon still has EXECUTE on set_actor';
  END IF;
  IF NOT has_function_privilege('service_role', 'ciceron.set_actor(uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'FAIL: service_role lost EXECUTE on set_actor';
  END IF;

  -- Exactly one SELECT policy on firm_onboarding
  SELECT count(*) INTO select_policies
  FROM pg_policies
  WHERE schemaname = 'ciceron'
    AND tablename = 'firm_onboarding'
    AND cmd = 'SELECT';
  IF select_policies <> 1 THEN
    RAISE EXCEPTION 'FAIL: expected 1 SELECT policy on firm_onboarding, got %', select_policies;
  END IF;

  -- No FOR ALL write policy
  SELECT count(*) INTO write_all
  FROM pg_policies
  WHERE schemaname = 'ciceron'
    AND tablename = 'firm_onboarding'
    AND policyname = 'firm_onboarding_write';
  IF write_all <> 0 THEN
    RAISE EXCEPTION 'FAIL: firm_onboarding_write still exists';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'ciceron' AND tablename = 'firm_onboarding'
      AND policyname = 'firm_onboarding_insert' AND cmd = 'INSERT'
  ) THEN
    RAISE EXCEPTION 'FAIL: firm_onboarding_insert missing';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'ciceron' AND tablename = 'firm_onboarding'
      AND policyname = 'firm_onboarding_update' AND cmd = 'UPDATE'
  ) THEN
    RAISE EXCEPTION 'FAIL: firm_onboarding_update missing';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'ciceron' AND tablename = 'firm_onboarding'
      AND policyname = 'firm_onboarding_delete' AND cmd = 'DELETE'
  ) THEN
    RAISE EXCEPTION 'FAIL: firm_onboarding_delete missing';
  END IF;

  RAISE NOTICE 'OK: 320 hardening verified';
END $$;

ROLLBACK;
