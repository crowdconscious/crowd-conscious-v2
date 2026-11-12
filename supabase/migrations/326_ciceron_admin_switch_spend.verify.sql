-- Verify 326: admin switch gated by invite; spend aggregate exists.
BEGIN;

DO $$
DECLARE
  firm uuid := 'a1000000-0000-4000-8000-000000000001';
  admin_persona uuid := 'b1000000-0000-4000-8000-000000000004';
  socio_persona uuid := 'b1000000-0000-4000-8000-000000000001';
  admin_invite uuid := 'e4000000-0000-4000-8000-000000000328';
  prospect_invite uuid;
  token_admin text := encode(sha256(convert_to('e4-admin-switch-a', 'UTF8')), 'hex');
  token_prospect text := encode(sha256(convert_to('e4-admin-switch-p', 'UTF8')), 'hex');
  res jsonb;
  spend numeric;
BEGIN
  -- Seed has no admin invite (public codes are socio/pasante). Insert one in this txn.
  INSERT INTO ciceron.invite_codes (
    id, code_hash, pepper_version, prospect_label, firm_id, default_persona_id,
    expires_at, max_uses, use_count, is_active, is_demo
  ) VALUES (
    admin_invite,
    encode(sha256(convert_to('e4-admin-invite-verify', 'UTF8')), 'hex'),
    2,
    'Verify admin mint (rolled back)',
    firm,
    admin_persona,
    now() + interval '1 hour',
    1,
    0,
    true,
    true
  );

  SELECT id INTO prospect_invite
  FROM ciceron.invite_codes
  WHERE firm_id = firm
    AND default_persona_id IS DISTINCT FROM admin_persona
    AND is_demo = true
  ORDER BY created_at ASC NULLS LAST
  LIMIT 1;

  IF prospect_invite IS NULL THEN
    RAISE EXCEPTION '326 verify: need a prospect demo invite';
  END IF;

  INSERT INTO ciceron.demo_sessions (
    id, invite_code_id, firm_id, persona_id, token_hash, expires_at
  ) VALUES (
    'e4000000-0000-4000-8000-000000000326',
    admin_invite,
    firm,
    socio_persona,
    token_admin,
    now() + interval '1 hour'
  );

  res := ciceron.switch_demo_persona(token_admin, admin_persona);
  IF COALESCE((res->>'ok')::boolean, false) IS NOT TRUE THEN
    RAISE EXCEPTION '326 verify: admin-mint session should switch back to admin: %', res;
  END IF;

  INSERT INTO ciceron.demo_sessions (
    id, invite_code_id, firm_id, persona_id, token_hash, expires_at
  ) VALUES (
    'e4000000-0000-4000-8000-000000000327',
    prospect_invite,
    firm,
    socio_persona,
    token_prospect,
    now() + interval '1 hour'
  );

  res := ciceron.switch_demo_persona(token_prospect, admin_persona);
  IF COALESCE((res->>'ok')::boolean, true) IS TRUE THEN
    RAISE EXCEPTION '326 verify: prospect session must not switch to admin: %', res;
  END IF;
  IF COALESCE(res->>'policy_id', '') <> 'persona_switch_admin' THEN
    RAISE EXCEPTION '326 verify: expected persona_switch_admin, got %', res;
  END IF;

  spend := ciceron.dof_spend_since(now() - interval '1 day');
  IF spend IS NULL OR spend < 0 THEN
    RAISE EXCEPTION '326 verify: dof_spend_since returned %', spend;
  END IF;
END $$;

ROLLBACK;
