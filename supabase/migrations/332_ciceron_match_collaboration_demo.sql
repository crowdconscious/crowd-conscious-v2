-- 332: Demo seed for match assignments + comments (additive / upsert only).
-- FLAG FOR PR REVIEW: demo-only. Does NOT replace reset_demo_firm (would modify
-- an existing function — forbidden without owner approval). Demo rows are sticky
-- across reset until a follow-up replaces that RPC.
-- Seed nothing in production beyond the demo firm (is_demo = true).
-- Note: PL/pgSQL variable must not be named match_id — it collides with the
-- column in ON CONFLICT (match_id, assignee_actor).

DO $$
DECLARE
  firm uuid := 'a1000000-0000-4000-8000-000000000001'::uuid;
  socio uuid := 'b1000000-0000-4000-8000-000000000001'::uuid;
  asociado uuid := 'b1000000-0000-4000-8000-000000000002'::uuid;
  pasante uuid := 'b1000000-0000-4000-8000-000000000003'::uuid;
  matter_ok uuid := 'd1000000-0000-4000-8000-000000000001'::uuid;
  v_match_id uuid;
  assign_id uuid := 'e3310000-0000-4000-8000-000000000001'::uuid;
  comment_id uuid := 'e3310000-0000-4000-8000-000000000011'::uuid;
BEGIN
  SELECT mt.id INTO v_match_id
  FROM ciceron.matches mt
  JOIN ciceron.watch_profiles wp ON wp.id = mt.watch_profile_id
  WHERE wp.client_id = 'c1000000-0000-4000-8000-000000000001'::uuid
  ORDER BY mt.created_at DESC
  LIMIT 1;

  IF v_match_id IS NULL THEN
    RAISE NOTICE '332: no nexora matches — skipping demo collab seed';
    RETURN;
  END IF;

  INSERT INTO ciceron.match_assignments (
    id, firm_id, match_id, matter_id, assignee_actor, assigned_by_actor,
    due_at, status, is_demo
  ) VALUES (
    assign_id, firm, v_match_id, matter_ok, asociado, socio,
    (CURRENT_DATE + 3), 'pendiente', true
  )
  ON CONFLICT (id) DO UPDATE SET
    match_id = EXCLUDED.match_id,
    matter_id = EXCLUDED.matter_id,
    assignee_actor = EXCLUDED.assignee_actor,
    assigned_by_actor = EXCLUDED.assigned_by_actor,
    due_at = EXCLUDED.due_at,
    status = EXCLUDED.status,
    is_demo = true,
    updated_at = now();

  -- Also satisfy UNIQUE(match_id, assignee_actor) if id differs
  INSERT INTO ciceron.match_assignments (
    firm_id, match_id, matter_id, assignee_actor, assigned_by_actor,
    due_at, status, is_demo
  ) VALUES (
    firm, v_match_id, matter_ok, pasante, socio,
    (CURRENT_DATE + 5), 'en_curso', true
  )
  ON CONFLICT (match_id, assignee_actor) DO UPDATE SET
    status = EXCLUDED.status,
    due_at = EXCLUDED.due_at,
    is_demo = true,
    updated_at = now();

  INSERT INTO ciceron.match_comments (
    id, firm_id, match_id, matter_id, author_actor, body, mentions, is_demo
  ) VALUES (
    comment_id, firm, v_match_id, matter_ok, socio,
    'Priorizar esta coincidencia. @Asociado Martín Herrera revise el plazo.',
    ARRAY[asociado], true
  )
  ON CONFLICT (id) DO UPDATE SET
    body = EXCLUDED.body,
    mentions = EXCLUDED.mentions,
    deleted_at = NULL,
    is_demo = true;
END $$;
