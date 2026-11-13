-- 329: Overlap-safe claim lease for serverless DOF classify/match backfill.
-- Additive. Does not change daily DOF ingestion or CICERON_INGESTION_ENABLED.
-- Apply before setting CICERON_BACKFILL_ENABLED=true.

ALTER TABLE ciceron.dof_notes
  ADD COLUMN IF NOT EXISTS backfill_claim_until timestamptz;

COMMENT ON COLUMN ciceron.dof_notes.backfill_claim_until IS
  'Lease until which a backfill worker owns this note; NULL = free. Expired leases are reclaimable.';

CREATE INDEX IF NOT EXISTS dof_notes_backfill_claim_until_idx
  ON ciceron.dof_notes (backfill_claim_until)
  WHERE backfill_claim_until IS NOT NULL;

-- Aggregate classify+match spend since a timestamp (US$60 backfill cap).
-- Narrower than dof_spend_since (which includes all dof_* + watch_profile_embed).
CREATE OR REPLACE FUNCTION ciceron.dof_backfill_spend_since(p_since timestamptz)
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ciceron
AS $$
  SELECT COALESCE(SUM(cost_estimate_usd), 0)::numeric
  FROM ciceron.ai_runs
  WHERE created_at >= p_since
    AND purpose IN ('dof_classify', 'dof_match_relevance');
$$;

REVOKE ALL ON FUNCTION ciceron.dof_backfill_spend_since(timestamptz)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION ciceron.dof_backfill_spend_since(timestamptz)
  TO service_role;

-- Atomically claim up to p_limit pending notes (FOR UPDATE SKIP LOCKED).
CREATE OR REPLACE FUNCTION ciceron.claim_dof_backfill_notes(
  p_limit integer,
  p_retry_failed boolean DEFAULT false,
  p_lease_seconds integer DEFAULT 600
)
RETURNS TABLE (
  id uuid,
  note_date date,
  classify_status text,
  match_status text,
  backfill_claim_until timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ciceron
AS $$
DECLARE
  lim integer := GREATEST(1, LEAST(COALESCE(p_limit, 6), 50));
  lease interval := make_interval(secs => GREATEST(30, LEAST(COALESCE(p_lease_seconds, 600), 3600)));
BEGIN
  RETURN QUERY
  WITH candidates AS (
    SELECT n.id
    FROM ciceron.dof_notes n
    WHERE n.ingest_status IN ('ready', 'embedding_pending')
      AND (
        CASE
          WHEN p_retry_failed THEN (
            n.classify_status IN ('pending', 'failed')
            OR n.match_status IN ('pending', 'failed')
          )
          ELSE (
            n.classify_status = 'pending'
            OR n.match_status = 'pending'
          )
        END
      )
      AND (n.backfill_claim_until IS NULL OR n.backfill_claim_until < now())
    ORDER BY n.note_date ASC
    FOR UPDATE OF n SKIP LOCKED
    LIMIT lim
  )
  UPDATE ciceron.dof_notes n
  SET backfill_claim_until = now() + lease
  FROM candidates c
  WHERE n.id = c.id
  RETURNING
    n.id,
    n.note_date,
    n.classify_status,
    n.match_status,
    n.backfill_claim_until;
END;
$$;

REVOKE ALL ON FUNCTION ciceron.claim_dof_backfill_notes(integer, boolean, integer)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION ciceron.claim_dof_backfill_notes(integer, boolean, integer)
  TO service_role;
