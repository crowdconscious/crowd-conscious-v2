-- Rollback 329: drop backfill claim RPC/column and spend aggregate.

DROP FUNCTION IF EXISTS ciceron.claim_dof_backfill_notes(integer, boolean, integer);
DROP FUNCTION IF EXISTS ciceron.dof_backfill_spend_since(timestamptz);

DROP INDEX IF EXISTS ciceron.dof_notes_backfill_claim_until_idx;

ALTER TABLE ciceron.dof_notes
  DROP COLUMN IF EXISTS backfill_claim_until;
