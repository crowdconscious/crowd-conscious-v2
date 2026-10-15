-- 288: idempotency marker for the one-time "new Pulse" announce push.
-- Set atomically by notifyPulsePublished (lib/expo-push.ts) before sending;
-- the push-receipts cron backstop announces Pulses where it is still NULL
-- (published in the last 48h, not stand-only) — e.g. Pulses published via SQL.
ALTER TABLE public.prediction_markets
  ADD COLUMN IF NOT EXISTS publish_notified_at timestamptz;

COMMENT ON COLUMN public.prediction_markets.publish_notified_at IS
  'When the one-time publish announce push was claimed/sent. NULL = not yet announced.';

-- Backfill: treat every already-published market as announced so the
-- backstop never re-pushes old Pulses. EXCEPTION: Halzen Pulse 7ab2177a…
-- (published via SQL 2026-10-15, never announced) stays NULL so it is
-- announced exactly once (by the backstop after deploy, or a one-off run).
UPDATE public.prediction_markets
SET publish_notified_at = COALESCE(published_at, created_at)
WHERE is_draft = false
  AND publish_notified_at IS NULL
  AND id <> '7ab2177a-d727-494f-8b40-709ac9f58d97';

CREATE INDEX IF NOT EXISTS prediction_markets_publish_unnotified_idx
  ON public.prediction_markets (published_at)
  WHERE publish_notified_at IS NULL AND is_draft = false;
