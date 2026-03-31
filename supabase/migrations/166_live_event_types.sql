-- Live event taxonomy + suggested questions (JSON: { "es": [...], "en": [...] })

ALTER TABLE public.live_events
  ADD COLUMN IF NOT EXISTS event_type text NOT NULL DEFAULT 'soccer_match'
    CHECK (
      event_type IN (
        'soccer_match',
        'product_launch',
        'government_conference',
        'entertainment',
        'community_event',
        'custom'
      )
    ),
  ADD COLUMN IF NOT EXISTS event_subtype text,
  ADD COLUMN IF NOT EXISTS suggested_questions jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.live_events.event_type IS 'Conscious Live template: soccer_match, product_launch, etc.';
COMMENT ON COLUMN public.live_events.event_subtype IS 'Optional subtype label or freeform context.';
COMMENT ON COLUMN public.live_events.suggested_questions IS 'Stored suggestion lists per locale, e.g. {"es":[],"en":[]}';
