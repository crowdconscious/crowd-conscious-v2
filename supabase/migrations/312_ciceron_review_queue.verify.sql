-- 312_ciceron_review_queue.verify.sql
-- Non-persistent: entire script runs in one transaction and ROLLBACKs.
-- FAIL paths RAISE EXCEPTION (abort). Success ends with ROLLBACK only.
-- Asserts denied audit rows are visible after decide_review returns ok:false
-- (denial is not rolled back by the RPC itself).

BEGIN;

DO $$
DECLARE
  n int;
  firm uuid := 'a1000000-0000-4000-8000-000000000001'::uuid;
  socio uuid := 'b1000000-0000-4000-8000-000000000001'::uuid;
  asociado uuid := 'b1000000-0000-4000-8000-000000000002'::uuid;
  pasante uuid := 'b1000000-0000-4000-8000-000000000003'::uuid;
  matter uuid := 'd1000000-0000-4000-8000-000000000001'::uuid;
  run_id uuid;
  out_id uuid;
  draft_id uuid;
  task_id uuid;
  decision_id uuid;
  delivery_id uuid;
  audit_count int;
  result jsonb;
BEGIN
  SELECT count(*) INTO n FROM information_schema.columns
  WHERE table_schema = 'ciceron' AND table_name = 'audit_events' AND column_name = 'outcome';
  IF n <> 1 THEN RAISE EXCEPTION 'FAIL: audit_events.outcome missing'; END IF;

  SELECT count(*) INTO n FROM information_schema.tables
  WHERE table_schema = 'ciceron' AND table_name = 'firm_settings';
  IF n <> 1 THEN RAISE EXCEPTION 'FAIL: firm_settings missing'; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace ns ON ns.oid = p.pronamespace
    WHERE ns.nspname = 'ciceron' AND p.proname = 'decide_review'
  ) THEN
    RAISE EXCEPTION 'FAIL: decide_review missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace ns ON ns.oid = p.pronamespace
    WHERE ns.nspname = 'ciceron' AND p.proname = 'create_delivery'
  ) THEN
    RAISE EXCEPTION 'FAIL: create_delivery missing';
  END IF;

  -- RPC-only table privileges for authenticated
  IF has_table_privilege('authenticated', 'ciceron.review_decisions', 'INSERT') THEN
    RAISE EXCEPTION 'FAIL: authenticated still has INSERT on review_decisions';
  END IF;
  IF has_table_privilege('authenticated', 'ciceron.deliveries', 'INSERT') THEN
    RAISE EXCEPTION 'FAIL: authenticated still has INSERT on deliveries';
  END IF;

  INSERT INTO ciceron.firm_settings (firm_id, four_eyes_output_types, email_allowlist)
  VALUES (firm, ARRAY['client_alert']::text[], '{}'::text[])
  ON CONFLICT (firm_id) DO UPDATE
    SET four_eyes_output_types = ARRAY['client_alert']::text[];

  INSERT INTO ciceron.ai_runs (id, purpose, model, firm_id, matter_id, user_id)
  VALUES (gen_random_uuid(), 'verify_review_queue', 'test-model', firm, matter, socio)
  RETURNING id INTO run_id;

  INSERT INTO ciceron.ai_outputs (id, ai_run_id, tier, status, body)
  VALUES (
    gen_random_uuid(), run_id, 2, 'en_revision',
    'Datos de demostración. Borrador de alerta para verificación.'
  )
  RETURNING id INTO out_id;

  INSERT INTO ciceron.drafts (id, matter_id, title, status)
  VALUES (gen_random_uuid(), matter, 'Verificación revisión', 'en_revision')
  RETURNING id INTO draft_id;

  INSERT INTO ciceron.draft_versions (
    draft_id, author_type, author_persona, body, ai_output_id, version_number
  ) VALUES (
    draft_id, 'model', NULL,
    'Datos de demostración. Borrador de alerta para verificación.',
    out_id, 1
  );

  INSERT INTO ciceron.review_tasks (
    id, matter_id, ai_output_id, assignee_persona, status,
    due_at, title, output_type, draft_id, is_demo
  ) VALUES (
    gen_random_uuid(), matter, out_id, socio, 'pendiente',
    now() + interval '1 day', 'Verificación revisión', 'client_notify', draft_id, true
  )
  RETURNING id INTO task_id;

  -- 1) Direct insert of tier-2 delivery without approved decision fails
  BEGIN
    INSERT INTO ciceron.deliveries (matter_id, ai_output_id, channel)
    VALUES (matter, out_id, 'email');
    RAISE EXCEPTION 'FAIL: tier 2 delivery inserted without review decision';
  EXCEPTION
    WHEN others THEN
      IF SQLERRM LIKE 'FAIL:%' THEN RAISE; END IF;
      IF SQLERRM LIKE '%tier 2 delivery%' THEN
        RAISE NOTICE 'OK: tier 2 delivery blocked without approval';
      ELSE
        RAISE EXCEPTION 'FAIL: unexpected direct-insert error: %', SQLERRM;
      END IF;
  END;

  -- 2) Pasante / outside-firm: structured role denial + audit row persists
  result := ciceron.decide_review(pasante, task_id, 'approved', NULL, NULL);
  IF COALESCE((result->>'ok')::boolean, true) THEN
    RAISE EXCEPTION 'FAIL: pasante was allowed to decide: %', result;
  END IF;
  IF result->>'policy_id' IS DISTINCT FROM 'role' THEN
    RAISE EXCEPTION 'FAIL: expected role policy_id for pasante, got %', result;
  END IF;
  SELECT count(*) INTO audit_count
  FROM ciceron.audit_events
  WHERE entity_id = task_id
    AND action = 'review_decide'
    AND outcome = 'denied'
    AND policy_id = 'role'
    AND user_id = pasante;
  IF audit_count < 1 THEN
    RAISE EXCEPTION 'FAIL: pasante role denial audit did not persist';
  END IF;
  RAISE NOTICE 'OK: pasante role denial returned jsonb and audit persisted';

  result := ciceron.decide_review(
    'b1000000-0000-4000-8000-000000000011'::uuid,
    task_id, 'approved', NULL, NULL
  );
  IF COALESCE((result->>'ok')::boolean, true) THEN
    RAISE EXCEPTION 'FAIL: outside-firm actor decided review: %', result;
  END IF;
  IF result->>'policy_id' IS DISTINCT FROM 'role' THEN
    RAISE EXCEPTION 'FAIL: expected role policy_id for outside actor, got %', result;
  END IF;
  SELECT count(*) INTO audit_count
  FROM ciceron.audit_events
  WHERE entity_id = task_id
    AND action = 'review_decide'
    AND outcome = 'denied'
    AND policy_id = 'role'
    AND user_id = 'b1000000-0000-4000-8000-000000000011'::uuid;
  IF audit_count < 1 THEN
    RAISE EXCEPTION 'FAIL: outside-firm role denial audit did not persist';
  END IF;
  RAISE NOTICE 'OK: outside actor role denial returned jsonb and audit persisted';

  result := ciceron.create_delivery(
    pasante, out_id, matter, 'email',
    'cliente@ejemplo.demo', 'Asunto denegado',
    'Cuerpo denegado.', true
  );
  IF COALESCE((result->>'ok')::boolean, true) THEN
    RAISE EXCEPTION 'FAIL: pasante was allowed to create delivery: %', result;
  END IF;
  IF result->>'policy_id' IS DISTINCT FROM 'role' THEN
    RAISE EXCEPTION 'FAIL: expected role policy_id for pasante delivery, got %', result;
  END IF;
  SELECT count(*) INTO audit_count
  FROM ciceron.audit_events
  WHERE entity_id = out_id
    AND action = 'delivery_create'
    AND outcome = 'denied'
    AND policy_id = 'role'
    AND user_id = pasante;
  IF audit_count < 1 THEN
    RAISE EXCEPTION 'FAIL: pasante delivery role denial audit did not persist';
  END IF;
  RAISE NOTICE 'OK: pasante delivery role denial returned jsonb and audit persisted';

  -- 2b) matter_member denials on save_review_edit / reassign_review (force gate)
  CREATE OR REPLACE FUNCTION ciceron.is_matter_member(p_matter_id uuid)
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path = ciceron, public
  AS $fn$ SELECT false $fn$;

  result := ciceron.save_review_edit(
    socio, task_id,
    'Datos de demostración. Edición denegada por matter_member.'
  );
  IF COALESCE((result->>'ok')::boolean, true) THEN
    RAISE EXCEPTION 'FAIL: save_review_edit allowed non-member: %', result;
  END IF;
  IF result->>'policy_id' IS DISTINCT FROM 'matter_member' THEN
    RAISE EXCEPTION 'FAIL: expected matter_member on save_review_edit, got %', result;
  END IF;
  SELECT count(*) INTO audit_count
  FROM ciceron.audit_events
  WHERE entity_id = task_id
    AND action = 'draft_edit'
    AND outcome = 'denied'
    AND policy_id = 'matter_member';
  IF audit_count < 1 THEN
    RAISE EXCEPTION 'FAIL: save_review_edit matter_member denial audit did not persist';
  END IF;
  RAISE NOTICE 'OK: save_review_edit matter_member denial audited';

  result := ciceron.reassign_review(socio, task_id, asociado);
  IF COALESCE((result->>'ok')::boolean, true) THEN
    RAISE EXCEPTION 'FAIL: reassign_review allowed non-member: %', result;
  END IF;
  IF result->>'policy_id' IS DISTINCT FROM 'matter_member' THEN
    RAISE EXCEPTION 'FAIL: expected matter_member on reassign_review, got %', result;
  END IF;
  SELECT count(*) INTO audit_count
  FROM ciceron.audit_events
  WHERE entity_id = task_id
    AND action = 'review_reassign'
    AND outcome = 'denied'
    AND policy_id = 'matter_member';
  IF audit_count < 1 THEN
    RAISE EXCEPTION 'FAIL: reassign_review matter_member denial audit did not persist';
  END IF;
  RAISE NOTICE 'OK: reassign_review matter_member denial audited';

  -- Restore is_matter_member (302 semantics); outer ROLLBACK also undoes this DDL
  CREATE OR REPLACE FUNCTION ciceron.is_matter_member(p_matter_id uuid)
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path = ciceron, public
  AS $fn$
    SELECT EXISTS (
      SELECT 1
      FROM ciceron.matters m
      JOIN ciceron.memberships ms
        ON ms.firm_id = m.firm_id AND ms.user_id = ciceron.current_actor_id()
      WHERE m.id = p_matter_id
        AND (
          ms.role IN ('socio', 'asociado', 'admin')
          OR EXISTS (
            SELECT 1
            FROM ciceron.matter_members mm
            WHERE mm.matter_id = m.id AND mm.user_id = ciceron.current_actor_id()
          )
        )
    );
  $fn$;

  -- 3) Four-eyes: editor cannot final-approve; denial audit must persist in-txn
  UPDATE ciceron.review_tasks SET output_type = 'client_alert' WHERE id = task_id;

  result := ciceron.save_review_edit(
    socio, task_id,
    'Datos de demostración. Texto editado por la socia (four-eyes).'
  );
  IF NOT COALESCE((result->>'ok')::boolean, false) THEN
    RAISE EXCEPTION 'FAIL: save_review_edit failed after membership restore: %', result;
  END IF;

  result := ciceron.decide_review(socio, task_id, 'approved', NULL, NULL);
  IF COALESCE((result->>'ok')::boolean, true) THEN
    RAISE EXCEPTION 'FAIL: four-eyes allowed editor to approve: %', result;
  END IF;
  IF result->>'policy_id' IS DISTINCT FROM 'four_eyes' THEN
    RAISE EXCEPTION 'FAIL: expected four_eyes policy_id, got %', result;
  END IF;

  SELECT count(*) INTO audit_count
  FROM ciceron.audit_events
  WHERE entity_id = task_id
    AND action = 'review_decide'
    AND outcome = 'denied'
    AND policy_id = 'four_eyes';
  IF audit_count < 1 THEN
    RAISE EXCEPTION 'FAIL: denied audit row did not persist after four-eyes denial';
  END IF;
  RAISE NOTICE 'OK: four-eyes denial returned jsonb and denied audit persisted';

  -- Asociado (non-editor) can approve
  result := ciceron.decide_review(asociado, task_id, 'approved', 'Visto bueno', NULL);
  IF NOT COALESCE((result->>'ok')::boolean, false) THEN
    RAISE EXCEPTION 'FAIL: asociado approve failed: %', result;
  END IF;
  decision_id := (result->>'id')::uuid;

  SELECT count(*) INTO audit_count
  FROM ciceron.audit_events
  WHERE entity_id = decision_id AND action = 'review_decision' AND outcome = 'allowed';
  IF audit_count <> 1 THEN
    RAISE EXCEPTION 'FAIL: expected exactly one audit event for decision, got %', audit_count;
  END IF;
  RAISE NOTICE 'OK: decision produced exactly one allowed audit event';

  result := ciceron.create_delivery(
    asociado, out_id, matter, 'email',
    'cliente@ejemplo.demo', 'Asunto de verificación',
    'Cuerpo simulado de verificación.', true
  );
  IF NOT COALESCE((result->>'ok')::boolean, false) THEN
    RAISE EXCEPTION 'FAIL: create_delivery failed: %', result;
  END IF;
  delivery_id := (result->>'id')::uuid;

  SELECT count(*) INTO n FROM ciceron.deliveries WHERE id = delivery_id AND is_simulated = true;
  IF n <> 1 THEN RAISE EXCEPTION 'FAIL: delivery not simulated by default'; END IF;
  RAISE NOTICE 'OK: create_delivery recorded simulated email';

  -- Duplicate delivery for same approved output: structured denial + audit
  result := ciceron.create_delivery(
    asociado, out_id, matter, 'email',
    'cliente@ejemplo.demo', 'Asunto duplicado',
    'Cuerpo duplicado.', true
  );
  IF COALESCE((result->>'ok')::boolean, true) THEN
    RAISE EXCEPTION 'FAIL: duplicate delivery was allowed: %', result;
  END IF;
  IF result->>'policy_id' IS DISTINCT FROM 'delivery_exists' THEN
    RAISE EXCEPTION 'FAIL: expected delivery_exists policy_id, got %', result;
  END IF;
  SELECT count(*) INTO audit_count
  FROM ciceron.audit_events
  WHERE entity_id = out_id
    AND action = 'delivery_create'
    AND outcome = 'denied'
    AND policy_id = 'delivery_exists';
  IF audit_count < 1 THEN
    RAISE EXCEPTION 'FAIL: delivery_exists denial audit did not persist';
  END IF;
  RAISE NOTICE 'OK: duplicate delivery denied with audit';

  -- Refuse already-decided
  BEGIN
    PERFORM ciceron.decide_review(asociado, task_id, 'approved', NULL, NULL);
    RAISE EXCEPTION 'FAIL: already-decided task accepted a second decision';
  EXCEPTION
    WHEN others THEN
      IF SQLERRM LIKE 'FAIL:%' THEN RAISE; END IF;
      IF SQLERRM LIKE '%already decided%' THEN
        RAISE NOTICE 'OK: refuse already-decided';
      ELSE
        RAISE EXCEPTION 'FAIL: unexpected already-decided error: %', SQLERRM;
      END IF;
  END;

  RAISE NOTICE 'OK: 312 review queue verify passed (will ROLLBACK)';
END $$;

ROLLBACK;
