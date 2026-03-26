-- ============================================================
-- 150: CRON_JOB_RUNS — scheduled job lifecycle (running → success/error)
-- ============================================================
-- Used by lib/cron-health.ts for Vercel cron observability and alerts.
-- Separate from agent_runs (AI token/cost logs).
-- ============================================================

CREATE TABLE IF NOT EXISTS public.cron_job_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('running', 'success', 'error')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER,
  error_message TEXT,
  summary TEXT
);

CREATE INDEX IF NOT EXISTS idx_cron_job_runs_job_name_started
  ON public.cron_job_runs (job_name, started_at DESC);

ALTER TABLE public.cron_job_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role can manage cron_job_runs" ON public.cron_job_runs;
CREATE POLICY "Service role can manage cron_job_runs" ON public.cron_job_runs
  FOR ALL USING (true) WITH CHECK (true);

COMMENT ON TABLE public.cron_job_runs IS 'Vercel cron execution logs (start/complete) for admin health dashboard';
