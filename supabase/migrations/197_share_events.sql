-- Migration 197 — Share event tracking
--
-- Captures every outbound share (WhatsApp, native share sheet, clipboard
-- copy, story download) so the weekly CEO digest can report share → vote
-- attribution and validate whether sharing moves the needle.
--
-- Privacy: stores hashed identifiers only. user_id is the auth user when
-- the sharer is logged in; anonymous_participant_id links to the anon
-- alias record when present (already hashed cookie → uuid mapping).
-- We do NOT store IP or UA — Vercel access logs already capture those
-- at the edge and we don't want a second copy under our control.

CREATE TABLE IF NOT EXISTS public.share_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Target: exactly one of market_id / location_id / other_type + other_id
  -- must be non-null. Enforced by CHECK below.
  market_id uuid REFERENCES public.prediction_markets(id) ON DELETE CASCADE,
  location_id uuid REFERENCES public.conscious_locations(id) ON DELETE CASCADE,
  other_type text,
  other_id text,

  -- Channel: 'whatsapp', 'native_share', 'clipboard', 'twitter',
  -- 'facebook', 'story_download', or 'other' for forward-compat.
  channel text NOT NULL
    CHECK (channel IN (
      'whatsapp', 'native_share', 'clipboard', 'twitter',
      'facebook', 'story_download', 'other'
    )),

  -- Optional surface/context for funnel analysis ('post_vote',
  -- 'market_card', 'location_card', 'share_menu', 'celebration_modal', ...)
  surface text,

  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  anonymous_participant_id uuid REFERENCES public.anonymous_participants(id) ON DELETE SET NULL,

  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT share_events_target_present CHECK (
    market_id IS NOT NULL
    OR location_id IS NOT NULL
    OR (other_type IS NOT NULL AND other_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_share_events_market
  ON public.share_events (market_id, created_at DESC)
  WHERE market_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_share_events_location
  ON public.share_events (location_id, created_at DESC)
  WHERE location_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_share_events_created_at
  ON public.share_events (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_share_events_channel
  ON public.share_events (channel, created_at DESC);

ALTER TABLE public.share_events ENABLE ROW LEVEL SECURITY;

-- Writes go through the service role (API route handler). No client-side
-- direct inserts — we want the server to attach auth/anon identity
-- itself so the client can't spoof it.

DROP POLICY IF EXISTS "share_events service role all" ON public.share_events;
CREATE POLICY "share_events service role all"
  ON public.share_events
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Admins may read for analytics. Uses the is_admin() SECURITY DEFINER
-- helper defined in migration 136 so RLS doesn't need to query profiles.
DROP POLICY IF EXISTS "share_events admin read" ON public.share_events;
CREATE POLICY "share_events admin read"
  ON public.share_events
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

COMMENT ON TABLE public.share_events IS
  'Per-share analytics: channel + target + identity. Fed to CEO digest weekly for share → vote attribution.';
