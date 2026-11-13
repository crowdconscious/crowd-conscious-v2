-- Verify 329: claim column + RPCs exist. Read-only (no real claims).

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

  IF NOT EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'ciceron'
      AND p.proname = 'dof_backfill_spend_since'
  ) THEN
    RAISE EXCEPTION '329 verify: dof_backfill_spend_since missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'ciceron'
      AND p.proname = 'claim_dof_backfill_notes'
  ) THEN
    RAISE EXCEPTION '329 verify: claim_dof_backfill_notes missing';
  END IF;

  spend := ciceron.dof_backfill_spend_since(now() - interval '1 day');
  IF spend IS NULL OR spend < 0 THEN
    RAISE EXCEPTION '329 verify: dof_backfill_spend_since returned %', spend;
  END IF;
END;
$$;
