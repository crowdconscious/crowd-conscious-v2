-- 296: email suppression list (hard bounces + spam complaints from Resend webhooks).
-- Additive only. Service-role access only (RLS on, no policies).
CREATE TABLE IF NOT EXISTS public.email_suppressions (
  email text PRIMARY KEY CHECK (email = lower(btrim(email))),
  reason text NOT NULL CHECK (reason IN ('hard_bounce', 'complaint')),
  detail text,
  last_event_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.email_suppressions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.email_suppressions FROM anon, authenticated;

COMMENT ON TABLE public.email_suppressions IS
  'Addresses bulk mail must skip (Resend email.bounced permanent / email.complained). Written by /api/webhooks/resend.';
