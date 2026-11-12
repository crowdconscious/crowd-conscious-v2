-- 317_ciceron_demo_invites.verify.sql
-- Non-persistent: BEGIN … ROLLBACK. Raises on wrong state.

BEGIN;

DO $$
DECLARE
  n int;
  redeem jsonb;
  resolved jsonb;
  switched jsonb;
  token_hash text := repeat('a', 64);
  demo_hash text := '3e88bb2a453f689e314810c301bbf790a09d5ee1afb4e0e0147dd0727c2b7f78';
  pasante_hash text := 'b68b3f391c07312e458cb97345b4dd4e180f77cc823f069f5c17a4acbe70938e';
BEGIN
  SELECT count(*) INTO n FROM information_schema.tables
  WHERE table_schema = 'ciceron' AND table_name = 'invite_codes';
  IF n <> 1 THEN RAISE EXCEPTION 'FAIL: invite_codes missing'; END IF;

  SELECT count(*) INTO n FROM information_schema.columns
  WHERE table_schema = 'ciceron' AND table_name = 'invite_codes'
    AND column_name = 'pepper_version';
  IF n <> 1 THEN RAISE EXCEPTION 'FAIL: invite_codes.pepper_version missing'; END IF;

  SELECT count(*) INTO n FROM information_schema.tables
  WHERE table_schema = 'ciceron' AND table_name = 'demo_sessions';
  IF n <> 1 THEN RAISE EXCEPTION 'FAIL: demo_sessions missing'; END IF;

  SELECT count(*) INTO n FROM information_schema.tables
  WHERE table_schema = 'ciceron' AND table_name = 'guided_story_progress';
  IF n <> 1 THEN RAISE EXCEPTION 'FAIL: guided_story_progress missing'; END IF;

  -- Exactly the two intentionally public seeded invites
  SELECT count(*) INTO n FROM ciceron.invite_codes
  WHERE id IN (
    'e3000000-0000-4000-8000-000000000001'::uuid,
    'e3000000-0000-4000-8000-000000000002'::uuid
  )
    AND code_hash IN (demo_hash, pasante_hash)
    AND pepper_version = 1
    AND is_active;
  IF n <> 2 THEN
    RAISE EXCEPTION 'FAIL: public demo invite seeds missing or wrong (got %)', n;
  END IF;

  SELECT count(*) INTO n FROM ciceron.invite_codes
  WHERE id IN (
    'e3000000-0000-4000-8000-000000000001'::uuid,
    'e3000000-0000-4000-8000-000000000002'::uuid
  );
  IF n <> 2 THEN
    RAISE EXCEPTION 'FAIL: expected exactly two public seed invite ids (got %)', n;
  END IF;

  -- No admin (or other non-public) default persona seeded as invite
  IF EXISTS (
    SELECT 1 FROM ciceron.invite_codes ic
    JOIN ciceron.demo_personas dp ON dp.id = ic.default_persona_id
    WHERE dp.role = 'admin'
  ) THEN
    RAISE EXCEPTION 'FAIL: admin invite must not be seeded';
  END IF;

  IF NOT has_function_privilege(
    'service_role',
    'ciceron.redeem_invite(text, text, text, int)',
    'EXECUTE'
  ) THEN
    RAISE EXCEPTION 'FAIL: service_role cannot EXECUTE redeem_invite';
  END IF;

  IF has_function_privilege(
    'authenticated',
    'ciceron.redeem_invite(text, text, text, int)',
    'EXECUTE'
  ) THEN
    RAISE EXCEPTION 'FAIL: authenticated can EXECUTE redeem_invite';
  END IF;

  -- Redeem public socio seed
  redeem := ciceron.redeem_invite(demo_hash, token_hash, NULL, 24);
  IF COALESCE(redeem->>'ok', 'false') <> 'true' THEN
    RAISE EXCEPTION 'FAIL: redeem_invite demo failed: %', redeem;
  END IF;

  resolved := ciceron.resolve_demo_session(token_hash);
  IF COALESCE(resolved->>'ok', 'false') <> 'true' THEN
    RAISE EXCEPTION 'FAIL: resolve_demo_session failed: %', resolved;
  END IF;
  IF resolved->>'role' <> 'socio' THEN
    RAISE EXCEPTION 'FAIL: expected socio role, got %', resolved->>'role';
  END IF;

  -- Switch to pasante persona
  switched := ciceron.switch_demo_persona(
    token_hash,
    'b1000000-0000-4000-8000-000000000003'::uuid
  );
  IF COALESCE(switched->>'ok', 'false') <> 'true' THEN
    RAISE EXCEPTION 'FAIL: switch_demo_persona failed: %', switched;
  END IF;
  IF switched->>'role' <> 'pasante' THEN
    RAISE EXCEPTION 'FAIL: switch expected pasante';
  END IF;

  -- Redeem public pasante seed
  redeem := ciceron.redeem_invite(pasante_hash, repeat('d', 64), NULL, 24);
  IF COALESCE(redeem->>'ok', 'false') <> 'true' THEN
    RAISE EXCEPTION 'FAIL: redeem_invite pasante failed: %', redeem;
  END IF;
  IF redeem->>'role' <> 'pasante' THEN
    RAISE EXCEPTION 'FAIL: pasante redeem role, got %', redeem->>'role';
  END IF;

  -- Invalid hash denied
  redeem := ciceron.redeem_invite(repeat('0', 64), repeat('b', 64), NULL, 24);
  IF COALESCE(redeem->>'ok', 'true') <> 'false' THEN
    RAISE EXCEPTION 'FAIL: invalid invite should be denied';
  END IF;

  -- RLS forced
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace ns ON ns.oid = c.relnamespace
    WHERE ns.nspname = 'ciceron' AND c.relname = 'invite_codes'
      AND c.relrowsecurity AND c.relforcerowsecurity
  ) THEN
    RAISE EXCEPTION 'FAIL: invite_codes RLS not forced';
  END IF;

  RAISE NOTICE 'OK: 317 demo invites verified';
END $$;

ROLLBACK;
