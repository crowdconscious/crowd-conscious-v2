-- Verify 327_ciceron_boletines.sql
DO $$
DECLARE
  n int;
  rid uuid;
  hid uuid;
  mid uuid;
  firm uuid := 'a1000000-0000-4000-8000-000000000001'::uuid;
  src uuid := 'b7000000-0000-4000-8000-000000000001'::uuid;
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

  -- cleanup verify rows
  DELETE FROM ciceron.bulletin_hits WHERE id = hid;
  DELETE FROM ciceron.bulletin_entries WHERE run_id = rid;
  DELETE FROM ciceron.bulletin_manual_checks WHERE id = mid;
  DELETE FROM ciceron.bulletin_runs WHERE id = rid;

  RAISE NOTICE 'PASS: 327_ciceron_boletines';
END $$;
