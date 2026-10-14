-- 286_org_portal: Organizaciones client portal (orgs, seats, readings,
-- anonymous responses). RLS is on with no policies: only service_role
-- (server routes that check membership first) reads or writes. Respondents
-- are identified only by an anonymous hash; no personal data is stored.
-- Idempotent: safe to re-run (IF NOT EXISTS / CREATE OR REPLACE). RLS enabled AND forced.

CREATE TABLE IF NOT EXISTS public.orgs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9][a-z0-9-]{1,62}$'),
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 200),
  locale text NOT NULL DEFAULT 'es' CHECK (locale IN ('es','en')),
  plan text NOT NULL DEFAULT 'pilot' CHECK (plan IN ('pilot','anual','continua')),
  -- Sello is earned automatically while billing is active AND a closed reading is public.
  billing_status text NOT NULL DEFAULT 'active' CHECK (billing_status IN ('active','inactive')),
  sello_contracted boolean NOT NULL DEFAULT false,
  -- Per-client field rules (admin-set). Defaults: no extension; early close allowed (preliminary under 30).
  max_extension_days int NOT NULL DEFAULT 0 CHECK (max_extension_days BETWEEN 0 AND 60),
  allow_early_close boolean NOT NULL DEFAULT true,
  seat_limit int NOT NULL DEFAULT 10 CHECK (seat_limit BETWEEN 1 AND 50),
  source_request_id uuid UNIQUE REFERENCES public.org_pilot_requests(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.org_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  email text NOT NULL CHECK (email = lower(email) AND char_length(email) BETWEEN 3 AND 320),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  role text NOT NULL CHECK (role IN ('owner','viewer')),
  invited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  invited_at timestamptz NOT NULL DEFAULT now(),
  accepted_at timestamptz,
  UNIQUE (org_id, email)
);
CREATE INDEX IF NOT EXISTS org_members_user_idx ON public.org_members (user_id);
CREATE INDEX IF NOT EXISTS org_members_email_idx ON public.org_members (email);

CREATE TABLE IF NOT EXISTS public.org_readings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  title_es text NOT NULL, title_en text NOT NULL,
  period_es text NOT NULL, period_en text NOT NULL,
  product text NOT NULL DEFAULT 'pilot' CHECK (product IN ('pilot','annual','continuous')),
  status text NOT NULL DEFAULT 'design' CHECK (status IN ('design','field','closed')),
  visibility text NOT NULL DEFAULT 'private' CHECK (visibility IN ('private','public')),
  visibility_locked_at timestamptz,
  field_opens timestamptz,
  field_closes timestamptz,
  extended_days int NOT NULL DEFAULT 0 CHECK (extended_days >= 0),
  closed_at timestamptz,
  closed_early boolean NOT NULL DEFAULT false,
  -- The client distributes one survey link; the token only identifies the reading.
  survey_token text NOT NULL UNIQUE DEFAULT encode(extensions.gen_random_bytes(18), 'hex'),
  -- Optional, as declared by the client (people they sent the link to), for response rate.
  invited int CHECK (invited IS NULL OR invited >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (status = 'design' OR visibility_locked_at IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS org_readings_org_idx ON public.org_readings (org_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.org_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reading_id uuid NOT NULL REFERENCES public.org_readings(id) ON DELETE CASCADE,
  position int NOT NULL CHECK (position >= 1),
  text_es text NOT NULL, text_en text NOT NULL,
  -- Every headline names its question: «De su X% <phrase>, Y% lo dijo con firmeza».
  headline_phrase_es text NOT NULL, headline_phrase_en text NOT NULL,
  UNIQUE (reading_id, position)
);

CREATE TABLE IF NOT EXISTS public.org_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reading_id uuid NOT NULL REFERENCES public.org_readings(id) ON DELETE CASCADE,
  -- HMAC of an anonymous browser cookie; dedupes without identifying anyone.
  respondent_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (reading_id, respondent_hash)
);

CREATE TABLE IF NOT EXISTS public.org_answers (
  response_id uuid NOT NULL REFERENCES public.org_responses(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES public.org_questions(id) ON DELETE CASCADE,
  answer boolean NOT NULL,
  certainty smallint NOT NULL CHECK (certainty BETWEEN 1 AND 10),
  reason text CHECK (reason IS NULL OR char_length(reason) <= 1000),
  PRIMARY KEY (response_id, question_id)
);
CREATE INDEX IF NOT EXISTS org_answers_question_idx ON public.org_answers (question_id);

CREATE TABLE IF NOT EXISTS public.org_reading_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  reading_id uuid NOT NULL REFERENCES public.org_readings(id) ON DELETE CASCADE,
  actor_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL CHECK (action IN ('visibility_set','field_opened','extended','closed_early','closed','member_invited','member_removed')),
  detail jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS org_reading_events_reading_idx ON public.org_reading_events (reading_id, created_at);

-- Aggregates: histogram per question (certainty 1..10 x yes/no). Service role only.
CREATE OR REPLACE FUNCTION public.org_question_histograms(p_reading_id uuid)
RETURNS TABLE (question_id uuid, answer boolean, certainty smallint, n bigint)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  SELECT a.question_id, a.answer, a.certainty, count(*)
  FROM public.org_answers a JOIN public.org_questions q ON q.id = a.question_id
  WHERE q.reading_id = p_reading_id
  GROUP BY 1, 2, 3
$$;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['orgs','org_members','org_readings','org_questions','org_responses','org_answers','org_reading_events'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
  END LOOP;
END $$;
GRANT USAGE ON SEQUENCE public.org_reading_events_id_seq TO service_role;
REVOKE ALL ON FUNCTION public.org_question_histograms(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON SEQUENCE public.org_reading_events_id_seq FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.org_question_histograms(uuid) TO service_role;
