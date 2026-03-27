-- ============================================================
-- 154: Conscious Live ↔ Conscious Fund impact + completion snapshot
-- ============================================================

-- Atomic increment for sponsored micro-market votes (called from API with service role)
CREATE OR REPLACE FUNCTION public.increment_live_event_fund_impact(p_live_event_id uuid, p_delta numeric)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_delta IS NULL OR p_delta <= 0 THEN
    RETURN;
  END IF;
  UPDATE public.live_events
  SET
    total_fund_impact = COALESCE(total_fund_impact, 0) + p_delta,
    updated_at = now()
  WHERE id = p_live_event_id;
END;
$$;

REVOKE ALL ON FUNCTION public.increment_live_event_fund_impact(uuid, numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_live_event_fund_impact(uuid, numeric) TO service_role;

-- Email idempotency + completion logging
ALTER TABLE public.live_events
  ADD COLUMN IF NOT EXISTS reminder_1h_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS results_email_sent_at timestamptz;

COMMENT ON COLUMN public.live_events.reminder_1h_sent_at IS 'Set when "match in 1 hour" broadcast email was sent.';
COMMENT ON COLUMN public.live_events.results_email_sent_at IS 'Set when post-match summary emails were sent.';

CREATE TABLE IF NOT EXISTS public.live_event_fund_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  live_event_id uuid NOT NULL REFERENCES public.live_events(id) ON DELETE CASCADE,
  cause_id uuid REFERENCES public.fund_causes(id) ON DELETE SET NULL,
  cause_name text,
  total_impact_usd numeric NOT NULL DEFAULT 0,
  total_votes_cast integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT live_event_fund_snapshots_one_per_event UNIQUE (live_event_id)
);

CREATE INDEX IF NOT EXISTS idx_live_event_fund_snapshots_event ON public.live_event_fund_snapshots (live_event_id);

ALTER TABLE public.live_event_fund_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view live event fund snapshots" ON public.live_event_fund_snapshots;
CREATE POLICY "Anyone can view live event fund snapshots" ON public.live_event_fund_snapshots
  FOR SELECT USING (true);

COMMENT ON TABLE public.live_event_fund_snapshots IS 'One row per live event: fund impact attributed to leading Conscious Fund cause at completion.';
