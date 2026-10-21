-- 297: "Avísame" subscriptions — early voters ask to be pushed once a Pulse
-- reaches PARTICIPATION_REVEAL_THRESHOLD (25, lib/display/participation.ts).
-- Additive only. Users may insert/select/delete their own rows; no user UPDATE
-- (notified_at is written by the service-role cron /api/cron/pulse-reveal-notify).
CREATE TABLE IF NOT EXISTS public.pulse_reveal_subscriptions (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  market_id uuid NOT NULL REFERENCES public.prediction_markets(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  notified_at timestamptz,
  PRIMARY KEY (user_id, market_id)
);

CREATE INDEX IF NOT EXISTS pulse_reveal_subscriptions_pending_idx
  ON public.pulse_reveal_subscriptions (market_id)
  WHERE notified_at IS NULL;

ALTER TABLE public.pulse_reveal_subscriptions ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.pulse_reveal_subscriptions FROM anon, authenticated;
GRANT SELECT, DELETE ON public.pulse_reveal_subscriptions TO authenticated;
GRANT INSERT (user_id, market_id) ON public.pulse_reveal_subscriptions TO authenticated;

CREATE POLICY pulse_reveal_subscriptions_select_own
  ON public.pulse_reveal_subscriptions FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY pulse_reveal_subscriptions_insert_own
  ON public.pulse_reveal_subscriptions FOR INSERT TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY pulse_reveal_subscriptions_delete_own
  ON public.pulse_reveal_subscriptions FOR DELETE TO authenticated
  USING (user_id = (select auth.uid()));

COMMENT ON TABLE public.pulse_reveal_subscriptions IS
  'Avísame: notify user once Pulse total_votes >= 25 or it closes. notified_at set by cron pulse-reveal-notify.';
