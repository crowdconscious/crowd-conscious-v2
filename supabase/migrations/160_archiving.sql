-- 160: Soft-archive resolved/old markets, agent content, and processed inbox rows

ALTER TABLE public.prediction_markets
  ADD COLUMN IF NOT EXISTS archived_at timestamptz;

ALTER TABLE public.agent_content
  ADD COLUMN IF NOT EXISTS archived_at timestamptz;

ALTER TABLE public.conscious_inbox
  ADD COLUMN IF NOT EXISTS archived_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_prediction_markets_archived_at ON public.prediction_markets (archived_at);
CREATE INDEX IF NOT EXISTS idx_agent_content_archived_at ON public.agent_content (archived_at);
CREATE INDEX IF NOT EXISTS idx_conscious_inbox_archived_at ON public.conscious_inbox (archived_at);

COMMENT ON COLUMN public.prediction_markets.archived_at IS 'Set by cron or admin; excluded from default listings.';
COMMENT ON COLUMN public.agent_content.archived_at IS 'Set by cron or admin; excluded from default listings.';
COMMENT ON COLUMN public.conscious_inbox.archived_at IS 'Set by cron or admin; excluded from default listings.';
