-- Migration 216 — Sponsor Pulse executive reports (per-market, agent-generated)
--
-- Per-Pulse executive report cache. Generated on resolution day by the
-- Sponsor Pulse Report agent (lib/agents/sponsor-pulse-report-agent.ts)
-- and surfaced inside the sponsor dashboard at
-- /dashboard/sponsor/[token]/report/[marketId].
--
-- This is DISTINCT from agent_content rows produced by the legacy monthly
-- `sponsor-report` agent, which summarises cross-market impact for a
-- whole sponsorship; that agent stays in place. UNIQUE(market_id) below
-- enforces "one executive report per Pulse" — re-runs UPDATE in place
-- via ON CONFLICT (market_id) DO UPDATE so admins can regenerate.
--
-- Storage convention: PDFs live at
--   sponsor-reports/{market_id}-{generated_at_unix}.pdf
-- in the existing public Supabase storage bucket `sponsor-reports`. The
-- bucket is provisioned by the dashboard manually (see runbook); not
-- created here because the storage migration system is separate.
--
-- Rollback: DROP TABLE IF EXISTS public.sponsor_pulse_reports CASCADE;

CREATE TABLE IF NOT EXISTS public.sponsor_pulse_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  market_id UUID NOT NULL REFERENCES public.prediction_markets(id) ON DELETE CASCADE,
  sponsor_account_id UUID REFERENCES public.sponsor_accounts(id) ON DELETE SET NULL,

  -- Agent outputs (Spanish narrative; English variants can be added later
  -- without a schema change by storing a translations jsonb column).
  executive_summary TEXT,
  conviction_analysis TEXT,
  next_steps JSONB DEFAULT '[]'::jsonb,
  /** Counts and aggregates snapshotted at generation time. Lets us render
      reports historically even if the underlying votes get updated.
      Shape: { totalVotes, registeredVotes, guestVotes, avgConfidence,
               outcomes: [{ id, label, votes, pct, avgConfidence }],
               votesByDay: [{ date, count }],
               topReasonings: [{ outcomeId, snippet, confidence }] } */
  snapshot_data JSONB DEFAULT '{}'::jsonb,

  -- Cost tracking (mirrors agent_runs columns for parity).
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  model TEXT,
  tokens_in INT DEFAULT 0,
  tokens_out INT DEFAULT 0,
  cost NUMERIC(10,6) DEFAULT 0,

  -- Distribution side-effects.
  pdf_path TEXT,
  pdf_generated_at TIMESTAMPTZ,
  email_sent_at TIMESTAMPTZ,

  CONSTRAINT sponsor_pulse_reports_unique_market UNIQUE (market_id)
);

CREATE INDEX IF NOT EXISTS idx_sponsor_pulse_reports_sponsor
  ON public.sponsor_pulse_reports(sponsor_account_id);

CREATE INDEX IF NOT EXISTS idx_sponsor_pulse_reports_generated_at
  ON public.sponsor_pulse_reports(generated_at DESC);

-- RLS: admin-only direct access. Sponsor consumption flows through
-- token-gated server routes that use the service role and validate the
-- access token — same pattern used by the rest of the sponsor dashboard.
ALTER TABLE public.sponsor_pulse_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sponsor_pulse_reports_admin_all ON public.sponsor_pulse_reports;
CREATE POLICY sponsor_pulse_reports_admin_all
  ON public.sponsor_pulse_reports
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.user_type = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.user_type = 'admin'
    )
  );

COMMENT ON TABLE public.sponsor_pulse_reports IS
  'Per-Pulse executive report cache (agent-generated). One row per market via UNIQUE(market_id). Sponsor reads happen through token-gated server routes; direct table access is admin-only via RLS.';
