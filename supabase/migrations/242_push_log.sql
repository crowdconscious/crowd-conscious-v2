-- Migration 242 — push_log
--
-- Delivery visibility for Expo pushes (audit item P4). Every send through
-- lib/expo-push.ts inserts one row per device message with the Expo ticket
-- id; the push-receipts cron (app/api/cron/push-receipts) fetches receipts
-- ~15 min later and flips status to ok/error. Without this, APNs credential
-- failures are invisible (tickets succeed, receipts carry the real error).
--
-- No FK to push_tokens: token rows are pruned on DeviceNotRegistered and we
-- want the log to survive the prune. user_id has no FK for the same reason
-- (logs are operational data, not user data — service-role access only).

CREATE TABLE IF NOT EXISTS public.push_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  push_token_id uuid,
  expo_ticket_id text,
  title text NOT NULL,
  body text NOT NULL,
  -- payload.data.type ('pulse_resolved', 'signal_milestone', …) for triage
  data_type text,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'ok', 'error')),
  error_detail text,
  created_at timestamptz NOT NULL DEFAULT now(),
  -- when the receipts cron last resolved this row
  checked_at timestamptz
);

-- The receipts cron only scans pending rows; partial index keeps it cheap.
CREATE INDEX IF NOT EXISTS idx_push_log_pending
  ON public.push_log (created_at)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_push_log_user
  ON public.push_log (user_id, created_at DESC);

-- Service-role only: RLS on with no policies blocks anon/authenticated.
ALTER TABLE public.push_log ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.push_log IS
  'One row per Expo push message sent via lib/expo-push.ts. status pending until the push-receipts cron fetches the Expo receipt (ok/error). Service-role only.';
