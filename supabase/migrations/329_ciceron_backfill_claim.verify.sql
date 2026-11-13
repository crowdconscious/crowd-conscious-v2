-- Verify 329: claim column + RPCs exist and are callable by service_role shape.

DO $$
DECLARE
  spend numeric;
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'ciceron'
      AND table_name = 'dof_notes'
      AND column_name = 'backfill_claim_until'
  ) THEN
    RAISE EXCEPTION '329 verify: backfill_claim_until missing';
  END IF;

  spend := ciceron.dof_backfill_spend_since(now() - interval '1 day');
  IF spend IS NULL OR spend < 0 THEN
    RAISE EXCEPTION '329 verify: dof_backfill_spend_since returned %', spend;
  END IF;

  -- Empty claim must succeed (may return zero rows).
  PERFORM * FROM ciceron.claim_dof_backfill_notes(1, false, 60);
END;
$$;
