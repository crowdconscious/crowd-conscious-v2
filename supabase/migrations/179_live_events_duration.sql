-- Configurable live window: duration_minutes, started_at, ends_at for auto-end

ALTER TABLE public.live_events
  ADD COLUMN IF NOT EXISTS duration_minutes integer NOT NULL DEFAULT 120;

ALTER TABLE public.live_events
  ADD COLUMN IF NOT EXISTS started_at timestamptz;

ALTER TABLE public.live_events
  ADD COLUMN IF NOT EXISTS ends_at timestamptz;

COMMENT ON COLUMN public.live_events.duration_minutes IS 'Planned live window in minutes; 0 = no auto-end (manual only). Applied when status becomes live.';
COMMENT ON COLUMN public.live_events.started_at IS 'When the event went live.';
COMMENT ON COLUMN public.live_events.ends_at IS 'When the event auto-completes; NULL = no scheduled end.';

-- Sensible defaults by type (existing rows)
UPDATE public.live_events SET duration_minutes = 100 WHERE event_type = 'soccer_match';
UPDATE public.live_events SET duration_minutes = 120 WHERE event_type IN ('product_launch', 'community_event');
UPDATE public.live_events SET duration_minutes = 180
WHERE event_type IN ('government_conference', 'entertainment', 'custom');
