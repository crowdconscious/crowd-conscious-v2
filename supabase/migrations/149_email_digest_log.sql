-- Track which market was highlighted per user per email send (dedupe / cooldown).

CREATE TABLE IF NOT EXISTS public.email_digest_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  market_id uuid NOT NULL REFERENCES public.prediction_markets(id) ON DELETE CASCADE,
  sent_at timestamptz NOT NULL DEFAULT now(),
  email_type text NOT NULL DEFAULT 'daily_digest'
);

CREATE INDEX IF NOT EXISTS idx_email_digest_user ON public.email_digest_log(user_id, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_digest_market ON public.email_digest_log(market_id, user_id);
CREATE INDEX IF NOT EXISTS idx_email_digest_user_market_sent ON public.email_digest_log(user_id, market_id, sent_at DESC);

COMMENT ON TABLE public.email_digest_log IS 'Markets sent to users in digest/reengagement emails; used for 14-day per-market cooldown.';

-- Inserts only from server routes using service role (not exposed to PostgREST anon/auth).
