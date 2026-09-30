-- 270_reclaim_stale_simulation_autorun_jobs.sql
-- One-shot + idempotent recovery for jobs stuck in `running` after PR #31.
--
-- Prod symptom (Sep 29 2026): two backfill jobs sat in `running` attempt 1/3
-- with no completion for 4+ hours, filling SIM_AUTORUN_MAX_CONCURRENT and
-- freezing the queue. Root cause: claim-then-start left orphans with
-- simulation_run_id IS NULL when the Vercel function timed out; the poller
-- only looked at running rows WITH a run id, and there was no stale reclaim.
--
-- Application code now reclaims on every cron tick. This migration unblocks
-- currently-stuck rows immediately when the owner pastes it into Supabase.
--
-- Safe to re-run: only touches status='running' rows that match the stale
-- predicates below. Does not delete history; increments attempts and writes
-- last_error so the admin table shows why.

-- ---------------------------------------------------------------------------
-- 1. Orphans: running with no simulation_run_id for > 3 minutes
--    (or never stamped started_at). Requeue with backoff if attempts remain.
-- ---------------------------------------------------------------------------

UPDATE simulation_autorun_jobs
SET
  attempts = attempts + 1,
  status = CASE
    WHEN attempts + 1 >= max_attempts THEN 'failed'
    ELSE 'queued'
  END,
  simulation_run_id = NULL,
  started_at = NULL,
  completed_at = CASE
    WHEN attempts + 1 >= max_attempts THEN now()
    ELSE completed_at
  END,
  last_error = left(
    CASE
      WHEN attempts + 1 >= max_attempts THEN
        'stale reclaim (migration 270): running without simulation_run_id — max attempts exhausted'
      ELSE
        'stale reclaim (migration 270): running without simulation_run_id'
    END,
    2000
  ),
  next_attempt_at = CASE
    WHEN attempts + 1 >= max_attempts THEN next_attempt_at
    ELSE now() + interval '60 seconds'
  END,
  updated_at = now()
WHERE status = 'running'
  AND simulation_run_id IS NULL
  AND (
    started_at IS NULL
    OR started_at < now() - interval '3 minutes'
  );

-- ---------------------------------------------------------------------------
-- 2. Stale with a run id: running > 25 minutes without completing.
--    Requeue (clears run id so a fresh startRun can proceed) or fail.
-- ---------------------------------------------------------------------------

UPDATE simulation_autorun_jobs
SET
  attempts = attempts + 1,
  status = CASE
    WHEN attempts + 1 >= max_attempts THEN 'failed'
    ELSE 'queued'
  END,
  simulation_run_id = NULL,
  started_at = NULL,
  completed_at = CASE
    WHEN attempts + 1 >= max_attempts THEN now()
    ELSE completed_at
  END,
  last_error = left(
    CASE
      WHEN attempts + 1 >= max_attempts THEN
        'stale reclaim (migration 270): running >25m — max attempts exhausted'
      ELSE
        'stale reclaim (migration 270): running >25m without completing'
    END,
    2000
  ),
  next_attempt_at = CASE
    WHEN attempts + 1 >= max_attempts THEN next_attempt_at
    ELSE now() + interval '60 seconds'
  END,
  updated_at = now()
WHERE status = 'running'
  AND simulation_run_id IS NOT NULL
  AND (
    started_at IS NULL
    OR started_at < now() - interval '25 minutes'
  );
