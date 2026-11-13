-- Verify 327_ciceron_boletines.sql
DO $$
DECLARE
  n int;
  rid uuid;
  hid uuid;
  mid uuid;
  firm uuid := 'a1000000-0000-4000-8000-000000000001'::uuid;
  src uuid := 'b7000000-0000-4000-8000-000000000001'::uuid;
  other_firm uuid := 'a1000000-0000-4000-8000-000000000099'::uuid;
  outsider uuid := 'c1000000-0000-4000-8000-000000000099'::uuid;
  assign_res jsonb;
  blanked jsonb;
BEGIN
  SELECT count(*) INTO n FROM ciceron.bulletin_sources WHERE source_key IN (
    'qro_lista_primera', 'jal_extractos_cjj', 'cdmx_boletin_pj',
    'edomex_boletin', 'gto_lista_primera', 'nl_boletin_pjenl'
  );
  IF n < 6 THEN
    RAISE EXCEPTION 'FAIL: expected >=6 seeded bulletin_sources, got %', n;
  END IF;

  IF EXISTS (SELECT 1 FROM ciceron.bulletin_sources WHERE enabled = true) THEN
    RAISE EXCEPTION 'FAIL: all seeded sources must ship enabled=false';
  END IF;

  -- Covering indexes for unindexed FKs / firm lookups
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'ciceron' AND indexname = 'bulletin_entries_firm_id_idx'
  ) THEN
    RAISE EXCEPTION 'FAIL: missing bulletin_entries_firm_id_idx';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'ciceron' AND indexname = 'bulletin_entries_source_id_idx'
  ) THEN
    RAISE EXCEPTION 'FAIL: missing bulletin_entries_source_id_idx';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'ciceron' AND indexname = 'bulletin_hits_entry_id_idx'
  ) THEN
    RAISE EXCEPTION 'FAIL: missing bulletin_hits_entry_id_idx';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'ciceron' AND indexname = 'bulletin_hits_catalogue_id_idx'
  ) THEN
    RAISE EXCEPTION 'FAIL: missing bulletin_hits_catalogue_id_idx';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'ciceron' AND indexname = 'bulletin_hits_case_file_id_idx'
  ) THEN
    RAISE EXCEPTION 'FAIL: missing bulletin_hits_case_file_id_idx';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'ciceron' AND indexname = 'bulletin_hits_review_task_id_idx'
  ) THEN
    RAISE EXCEPTION 'FAIL: missing bulletin_hits_review_task_id_idx';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'ciceron' AND indexname = 'bulletin_hits_matter_id_idx'
  ) THEN
    RAISE EXCEPTION 'FAIL: missing bulletin_hits_matter_id_idx';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'ciceron' AND indexname = 'bulletin_manual_checks_run_id_idx'
  ) THEN
    RAISE EXCEPTION 'FAIL: missing bulletin_manual_checks_run_id_idx';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'ciceron' AND indexname = 'bulletin_manual_checks_source_id_idx'
  ) THEN
    RAISE EXCEPTION 'FAIL: missing bulletin_manual_checks_source_id_idx';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'ciceron' AND indexname = 'bulletin_matter_catalogue_case_file_id_idx'
  ) THEN
    RAISE EXCEPTION 'FAIL: missing bulletin_matter_catalogue_case_file_id_idx';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'ciceron' AND indexname = 'bulletin_matter_catalogue_firm_id_idx'
  ) THEN
    RAISE EXCEPTION 'FAIL: missing bulletin_matter_catalogue_firm_id_idx';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'ciceron' AND indexname = 'bulletin_matter_catalogue_matter_id_idx'
  ) THEN
    RAISE EXCEPTION 'FAIL: missing bulletin_matter_catalogue_matter_id_idx';
  END IF;

  -- RLS: authenticated has SELECT only
  IF EXISTS (
    SELECT 1 FROM information_schema.role_table_grants
    WHERE table_schema = 'ciceron'
      AND table_name = 'bulletin_runs'
      AND grantee = 'authenticated'
      AND privilege_type IN ('INSERT', 'UPDATE', 'DELETE')
  ) THEN
    RAISE EXCEPTION 'FAIL: authenticated must not write bulletin_runs';
  END IF;

  rid := ciceron.record_bulletin_run(
    firm, src, CURRENT_DATE, 'manual',
    NULL, 'manual_required', 'verify dry',
    0, 0, 0, 0, 1, 'verify', 'https://example.test', true
  );
  IF rid IS NULL THEN
    RAISE EXCEPTION 'FAIL: record_bulletin_run returned null';
  END IF;

  -- Firm mismatch on hit must fail
  BEGIN
    PERFORM ciceron.record_bulletin_hit(
      other_firm, rid, src, CURRENT_DATE, 'exact', 1.0,
      'should fail firm mismatch',
      'Juzgado Primero Civil', '123/2026', 'Parte Demo',
      'Acuerdo', 'https://example.test', 'excerpt',
      NULL, NULL, NULL, 14, true
    );
    RAISE EXCEPTION 'FAIL: record_bulletin_hit should reject firm mismatch';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM NOT LIKE '%run firm_id does not match%' THEN
        RAISE;
      END IF;
  END;

  hid := ciceron.record_bulletin_hit(
    firm, rid, src, CURRENT_DATE, 'exact', 1.0,
    'verify exact expediente+court',
    'Juzgado Primero Civil', '123/2026', 'Parte Demo, S.A. de C.V.',
    'Acuerdo de demostración', 'https://example.test', 'excerpt',
    NULL, NULL, NULL, 14, true
  );
  IF hid IS NULL THEN
    RAISE EXCEPTION 'FAIL: record_bulletin_hit returned null';
  END IF;

  mid := ciceron.ensure_bulletin_manual_check(
    firm, src, CURRENT_DATE, 'https://example.test', rid, true
  );
  IF mid IS NULL THEN
    RAISE EXCEPTION 'FAIL: ensure_bulletin_manual_check returned null';
  END IF;

  -- Assignee must be firm member (actor = firm socio)
  assign_res := ciceron.assign_bulletin_manual_check(
    firm, mid, 'b1000000-0000-4000-8000-000000000001'::uuid, outsider
  );
  IF COALESCE((assign_res->>'ok')::boolean, true) THEN
    RAISE EXCEPTION 'FAIL: assign_bulletin_manual_check should deny non-member assignee';
  END IF;
  IF assign_res->>'policy_id' IS DISTINCT FROM 'rbac_assignee_firm' THEN
    RAISE EXCEPTION 'FAIL: expected rbac_assignee_firm, got %', assign_res->>'policy_id';
  END IF;

  -- Retention blanks excerpt; does not delete hit
  UPDATE ciceron.bulletin_entries
  SET retain_until = CURRENT_DATE - 1
  WHERE run_id = rid;

  blanked := ciceron.purge_bulletin_entry_excerpts(CURRENT_DATE, 100);
  IF COALESCE((blanked->>'blanked')::int, 0) < 1 THEN
    RAISE EXCEPTION 'FAIL: purge_bulletin_entry_excerpts should blank at least one excerpt';
  END IF;
  IF EXISTS (
    SELECT 1 FROM ciceron.bulletin_entries
    WHERE run_id = rid AND raw_excerpt IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'FAIL: raw_excerpt should be blanked after purge';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM ciceron.bulletin_hits WHERE id = hid) THEN
    RAISE EXCEPTION 'FAIL: purge must not delete hits';
  END IF;

  -- cleanup verify rows (hits before entries: ON DELETE RESTRICT)
  DELETE FROM ciceron.bulletin_hits WHERE id = hid;
  DELETE FROM ciceron.bulletin_entries WHERE run_id = rid;
  DELETE FROM ciceron.bulletin_manual_checks WHERE id = mid;
  DELETE FROM ciceron.bulletin_runs WHERE id = rid;

  RAISE NOTICE 'PASS: 327_ciceron_boletines';
END $$;
