-- ============================================================
-- 135: AGENT_RUNS - Track AI agent execution and errors
-- ============================================================
-- Purpose: Table for logging agent runs (CEO digest, content creator, etc.)
-- Used by lib/agents/config.ts logAgentRun()
-- ============================================================

CREATE TABLE IF NOT EXISTS public.agent_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('success', 'error', 'skipped')),
  duration_ms INTEGER NOT NULL,
  tokens_input INTEGER NOT NULL DEFAULT 0,
  tokens_output INTEGER NOT NULL DEFAULT 0,
  cost_estimate DECIMAL(12, 8) NOT NULL DEFAULT 0,
  error_message TEXT,
  summary JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_runs_agent_name ON public.agent_runs(agent_name);
CREATE INDEX IF NOT EXISTS idx_agent_runs_created_at ON public.agent_runs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_runs_status ON public.agent_runs(status);

-- Service role bypasses RLS; allow anon/authenticated to read for admin dashboard
ALTER TABLE public.agent_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role can manage agent_runs" ON public.agent_runs;
CREATE POLICY "Service role can manage agent_runs" ON public.agent_runs
  FOR ALL USING (true) WITH CHECK (true);

COMMENT ON TABLE public.agent_runs IS 'Agent execution logs for CEO digest, content creator, news monitor, inbox curator';
