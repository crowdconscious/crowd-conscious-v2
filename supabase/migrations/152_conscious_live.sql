-- ============================================================
-- 152: Conscious Live — live_events, prediction_markets columns,
--      RLS, Realtime publication
-- ============================================================

CREATE TABLE IF NOT EXISTS public.live_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  translations jsonb DEFAULT '{}'::jsonb,
  match_date timestamptz NOT NULL,
  youtube_url text,
  youtube_video_id text,
  status text DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'live', 'completed', 'cancelled')),
  viewer_count integer DEFAULT 0 NOT NULL,
  total_votes_cast integer DEFAULT 0 NOT NULL,
  total_fund_impact numeric DEFAULT 0,
  sponsor_name text,
  sponsor_logo_url text,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_live_events_match_date ON public.live_events(match_date);
CREATE INDEX IF NOT EXISTS idx_live_events_status ON public.live_events(status);

ALTER TABLE public.live_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view live events" ON public.live_events;
CREATE POLICY "Anyone can view live events" ON public.live_events
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage live events" ON public.live_events;
CREATE POLICY "Admins can manage live events" ON public.live_events
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Realtime: add tables idempotently
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'live_events'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.live_events;
  END IF;
END $$;

ALTER TABLE public.prediction_markets
  ADD COLUMN IF NOT EXISTS live_event_id uuid REFERENCES public.live_events(id),
  ADD COLUMN IF NOT EXISTS is_micro_market boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS sponsor_label text,
  ADD COLUMN IF NOT EXISTS expires_in_minutes integer;

CREATE INDEX IF NOT EXISTS idx_prediction_markets_live_event_id ON public.prediction_markets(live_event_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'market_votes'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.market_votes;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'market_outcomes'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.market_outcomes;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'prediction_markets'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.prediction_markets;
  END IF;
END $$;

COMMENT ON TABLE public.live_events IS 'Conscious Live: match/session metadata for real-time prediction events.';
COMMENT ON COLUMN public.prediction_markets.live_event_id IS 'When set, this market belongs to a Conscious Live event.';
COMMENT ON COLUMN public.prediction_markets.is_micro_market IS 'Short-lived in-match market (micro-market).';
COMMENT ON COLUMN public.prediction_markets.expires_in_minutes IS 'UI countdown / auto-close window for micro-markets.';
