-- Phase 3 — civic reputation (UX overhaul §3.6 / §5 Phase 3)
--
-- PRIVATE ledger: own profile only. Per alcaldía + domain.
-- NEVER award for opinion-vote volume, option chosen, or confidence.
-- Forecast accuracy stays in separate tables/UI — not mixed here.
--
-- Allowed reasons:
--   signal_cosign_stage_50 / signal_cosign_stage_200
--     — co-sign on a señal that reaches a stage
--   signal_author_cosigned
--     — published señal that others co-sign (author, once)
--   signal_author_stage_50 / signal_author_stage_200
--     — author when their señal reaches a stage
--   location_evaluated
--     — evaluating a Conscious Location (once per market; not option/conf)
--   neighbour_participated
--     — neighbour who then participates (referral attribution)
--   sustained_presence
--     — sustained civic presence over time (monthly)
--
-- RLS: enabled, SELECT own only; writes via SECURITY DEFINER RPC.
-- LEADERBOARD_ENABLED stays false — no public ranking of these totals.

-- =============================================================================
-- 1. Events ledger (append-only)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.civic_reputation_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  domain text NOT NULL
    CHECK (domain IN (
      'agua',
      'espacio_publico',
      'residuos',
      'desarrollo_urbano'
    )),
  alcaldia text NOT NULL,
  reason text NOT NULL
    CHECK (reason IN (
      'signal_cosign_stage_50',
      'signal_cosign_stage_200',
      'signal_author_cosigned',
      'signal_author_stage_50',
      'signal_author_stage_200',
      'location_evaluated',
      'neighbour_participated',
      'sustained_presence'
    )),
  points integer NOT NULL CHECK (points > 0 AND points <= 100),
  object_type text
    CHECK (
      object_type IS NULL
      OR object_type IN ('signal', 'location', 'referral', 'presence')
    ),
  object_id uuid,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.civic_reputation_events IS
  'Phase 3 civic reputation ledger. Private (own profile). Never stores opinion-vote volume/option/confidence awards. Forecast accuracy is separate.';

CREATE INDEX IF NOT EXISTS idx_civic_rep_events_user_created
  ON public.civic_reputation_events (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_civic_rep_events_user_alcaldia_domain
  ON public.civic_reputation_events (user_id, alcaldia, domain);

-- Idempotent awards: one row per (user, reason, object) when object is set.
CREATE UNIQUE INDEX IF NOT EXISTS uq_civic_rep_user_reason_object
  ON public.civic_reputation_events (user_id, reason, object_id)
  WHERE object_id IS NOT NULL;

-- Sustained presence: at most one award per user per calendar month (UTC).
CREATE UNIQUE INDEX IF NOT EXISTS uq_civic_rep_sustained_presence_month
  ON public.civic_reputation_events (
    user_id,
    ((created_at AT TIME ZONE 'UTC')::date)
  )
  WHERE reason = 'sustained_presence';

-- Narrow the sustained-presence unique to year-month via expression on
-- truncated month start (replace day-level index above).
DROP INDEX IF EXISTS uq_civic_rep_sustained_presence_month;
CREATE UNIQUE INDEX IF NOT EXISTS uq_civic_rep_sustained_presence_month
  ON public.civic_reputation_events (
    user_id,
    (date_trunc('month', created_at AT TIME ZONE 'UTC'))
  )
  WHERE reason = 'sustained_presence';

-- =============================================================================
-- 2. Totals (materialized per user × alcaldía × domain)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.civic_reputation_totals (
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  alcaldia text NOT NULL,
  domain text NOT NULL
    CHECK (domain IN (
      'agua',
      'espacio_publico',
      'residuos',
      'desarrollo_urbano'
    )),
  points integer NOT NULL DEFAULT 0 CHECK (points >= 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, alcaldia, domain)
);

COMMENT ON TABLE public.civic_reputation_totals IS
  'Aggregated civic reputation per user × alcaldía × domain. Private read (own rows). Not a public leaderboard.';

CREATE INDEX IF NOT EXISTS idx_civic_rep_totals_user
  ON public.civic_reputation_totals (user_id);

-- =============================================================================
-- 3. RLS — SELECT own; no anon/authenticated INSERT/UPDATE/DELETE
-- =============================================================================

ALTER TABLE public.civic_reputation_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.civic_reputation_totals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS civic_reputation_events_select_own ON public.civic_reputation_events;
CREATE POLICY civic_reputation_events_select_own
  ON public.civic_reputation_events
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS civic_reputation_totals_select_own ON public.civic_reputation_totals;
CREATE POLICY civic_reputation_totals_select_own
  ON public.civic_reputation_totals
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- =============================================================================
-- 4. award_civic_reputation — SECURITY DEFINER, service-role / trusted callers
-- =============================================================================

CREATE OR REPLACE FUNCTION public.award_civic_reputation(
  p_user_id uuid,
  p_domain text,
  p_alcaldia text,
  p_reason text,
  p_points integer,
  p_object_type text DEFAULT NULL,
  p_object_id uuid DEFAULT NULL,
  p_meta jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inserted public.civic_reputation_events%ROWTYPE;
BEGIN
  -- Hard deny: never accept opinion-vote reasons even if CHECK drifts.
  IF p_reason IN (
    'prediction_vote',
    'prediction_correct',
    'vote',
    'confidence',
    'option_chosen',
    'vote_volume'
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'forbidden_reason',
      'reason', p_reason
    );
  END IF;

  IF p_user_id IS NULL
     OR p_domain IS NULL
     OR p_alcaldia IS NULL
     OR length(trim(p_alcaldia)) = 0
     OR p_reason IS NULL
     OR p_points IS NULL
     OR p_points <= 0
     OR p_points > 100
  THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_args');
  END IF;

  IF p_domain NOT IN (
    'agua', 'espacio_publico', 'residuos', 'desarrollo_urbano'
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_domain');
  END IF;

  IF p_reason NOT IN (
    'signal_cosign_stage_50',
    'signal_cosign_stage_200',
    'signal_author_cosigned',
    'signal_author_stage_50',
    'signal_author_stage_200',
    'location_evaluated',
    'neighbour_participated',
    'sustained_presence'
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_reason');
  END IF;

  INSERT INTO public.civic_reputation_events (
    user_id, domain, alcaldia, reason, points,
    object_type, object_id, meta
  )
  VALUES (
    p_user_id,
    p_domain,
    trim(p_alcaldia),
    p_reason,
    p_points,
    p_object_type,
    p_object_id,
    COALESCE(p_meta, '{}'::jsonb)
  )
  ON CONFLICT DO NOTHING
  RETURNING * INTO v_inserted;

  IF v_inserted.id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'already_awarded',
      'reason', p_reason,
      'object_id', p_object_id
    );
  END IF;

  INSERT INTO public.civic_reputation_totals AS t (
    user_id, alcaldia, domain, points, updated_at
  )
  VALUES (
    p_user_id, trim(p_alcaldia), p_domain, p_points, now()
  )
  ON CONFLICT (user_id, alcaldia, domain) DO UPDATE
  SET
    points = t.points + EXCLUDED.points,
    updated_at = now();

  RETURN jsonb_build_object(
    'success', true,
    'event_id', v_inserted.id,
    'points', p_points,
    'domain', p_domain,
    'alcaldia', trim(p_alcaldia),
    'reason', p_reason
  );
END;
$$;

COMMENT ON FUNCTION public.award_civic_reputation IS
  'Phase 3: award civic reputation for allowed civic actions only. Idempotent on (user, reason, object_id). Never awards opinion-vote volume/option/confidence.';

REVOKE ALL ON FUNCTION public.award_civic_reputation(
  uuid, text, text, text, integer, text, uuid, jsonb
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.award_civic_reputation(
  uuid, text, text, text, integer, text, uuid, jsonb
) TO service_role;
-- Authenticated may execute so user-context admin paths that already trust
-- the server can call it; the function still only inserts for the given
-- p_user_id and never reads request body. App code uses createAdminClient.
GRANT EXECUTE ON FUNCTION public.award_civic_reputation(
  uuid, text, text, text, integer, text, uuid, jsonb
) TO authenticated;

-- =============================================================================
-- 5. get_my_civic_reputation — convenience read for own profile
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_my_civic_reputation()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_totals jsonb;
  v_total integer;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'unauthenticated');
  END IF;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'alcaldia', alcaldia,
      'domain', domain,
      'points', points,
      'updated_at', updated_at
    )
    ORDER BY points DESC, alcaldia, domain
  ), '[]'::jsonb)
  INTO v_totals
  FROM public.civic_reputation_totals
  WHERE user_id = v_uid;

  SELECT COALESCE(SUM(points), 0)::integer
  INTO v_total
  FROM public.civic_reputation_totals
  WHERE user_id = v_uid;

  RETURN jsonb_build_object(
    'success', true,
    'total_points', v_total,
    'breakdown', v_totals
  );
END;
$$;

COMMENT ON FUNCTION public.get_my_civic_reputation IS
  'Returns the authenticated user''s private civic reputation breakdown. Never exposes other users.';

REVOKE ALL ON FUNCTION public.get_my_civic_reputation() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_civic_reputation() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_civic_reputation() TO service_role;
