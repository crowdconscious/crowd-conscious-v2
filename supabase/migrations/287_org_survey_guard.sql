-- 287_org_survey_guard: server-side anti-stuffing for /api/org/encuesta/[token].
-- NOT APPLIED. Apply before merging the code that uses it.
-- Anonymity: no IPs are stored. Keys are HMAC-SHA256 values computed in the app
-- with ORG_RESPONDENT_SECRET, so nothing here can be traced back to a person.
-- Idempotent. RLS enabled + forced, no policies, service_role only.

-- One-time survey nonces (issued signed when the survey page loads, consumed on submit).
CREATE TABLE IF NOT EXISTS public.org_survey_nonces (
  nonce_hash text PRIMARY KEY,
  reading_id uuid NOT NULL REFERENCES public.org_readings(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  used_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS org_survey_nonces_expires_idx ON public.org_survey_nonces (expires_at);

-- Fixed-window counters per HMAC(ip + survey token).
CREATE TABLE IF NOT EXISTS public.org_survey_rate (
  key_hash text NOT NULL,
  window_start timestamptz NOT NULL,
  hits int NOT NULL DEFAULT 0,
  PRIMARY KEY (key_hash, window_start)
);
CREATE INDEX IF NOT EXISTS org_survey_rate_window_idx ON public.org_survey_rate (window_start);

-- Atomic hit: returns true while the window is under the limit.
CREATE OR REPLACE FUNCTION public.org_survey_rate_hit(p_key text, p_window_seconds int, p_limit int)
RETURNS boolean
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  w timestamptz := to_timestamp(floor(extract(epoch FROM now()) / p_window_seconds) * p_window_seconds);
  n int;
BEGIN
  INSERT INTO public.org_survey_rate AS r (key_hash, window_start, hits)
  VALUES (p_key, w, 1)
  ON CONFLICT (key_hash, window_start) DO UPDATE SET hits = r.hits + 1
  RETURNING hits INTO n;
  IF random() < 0.01 THEN
    DELETE FROM public.org_survey_rate WHERE window_start < now() - interval '2 days';
    DELETE FROM public.org_survey_nonces WHERE expires_at < now() - interval '1 day';
  END IF;
  RETURN n <= p_limit;
END $$;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['org_survey_nonces','org_survey_rate'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
  END LOOP;
END $$;
REVOKE ALL ON FUNCTION public.org_survey_rate_hit(text, int, int) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.org_survey_rate_hit(text, int, int) TO service_role;
