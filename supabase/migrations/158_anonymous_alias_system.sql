-- ============================================================
-- 158: Anonymous alias participants + alias-based market votes
-- ============================================================

CREATE TABLE IF NOT EXISTS public.anonymous_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL UNIQUE,
  alias text NOT NULL,
  avatar_emoji text DEFAULT '🎯',
  created_at timestamptz DEFAULT now() NOT NULL,
  last_active_at timestamptz DEFAULT now() NOT NULL,
  total_votes integer NOT NULL DEFAULT 0,
  total_xp integer NOT NULL DEFAULT 0,
  converted_to_user_id uuid REFERENCES public.profiles(id),
  ip_hash text
);

CREATE INDEX IF NOT EXISTS idx_anonymous_participants_session ON public.anonymous_participants(session_id);

ALTER TABLE public.anonymous_participants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read anonymous participants" ON public.anonymous_participants;
CREATE POLICY "Anyone can read anonymous participants"
  ON public.anonymous_participants FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can create anonymous participants" ON public.anonymous_participants;
CREATE POLICY "Anyone can create anonymous participants"
  ON public.anonymous_participants FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can update anonymous participants" ON public.anonymous_participants;
CREATE POLICY "Anyone can update anonymous participants"
  ON public.anonymous_participants FOR UPDATE USING (true);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'anonymous_participants'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.anonymous_participants;
  END IF;
END $$;

-- market_votes: allow NULL user_id for alias rows
ALTER TABLE public.market_votes ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE public.market_votes
  ADD COLUMN IF NOT EXISTS anonymous_participant_id uuid REFERENCES public.anonymous_participants(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS session_id text;

CREATE UNIQUE INDEX IF NOT EXISTS market_votes_market_anon_participant_uniq
  ON public.market_votes (market_id, anonymous_participant_id)
  WHERE anonymous_participant_id IS NOT NULL;

COMMENT ON COLUMN public.market_votes.anonymous_participant_id IS 'Conscious Live / Pulse anonymous alias vote row; user_id NULL.';

-- XP + engagement counters for anonymous participants (per vote)
CREATE OR REPLACE FUNCTION public.increment_anonymous_xp(
  p_participant_id uuid,
  p_xp_amount integer
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.anonymous_participants
  SET total_votes = total_votes + 1,
      total_xp = total_xp + GREATEST(0, p_xp_amount),
      last_active_at = now()
  WHERE id = p_participant_id;
$$;

REVOKE ALL ON FUNCTION public.increment_anonymous_xp(uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_anonymous_xp(uuid, integer) TO service_role;

-- Alias-based anonymous vote: same probability path as execute_live_anonymous_market_vote, stores xp on vote row
CREATE OR REPLACE FUNCTION public.execute_alias_anonymous_market_vote(
  p_participant_id uuid,
  p_market_id uuid,
  p_outcome_id uuid,
  p_confidence integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_market public.prediction_markets%ROWTYPE;
  v_outcome public.market_outcomes%ROWTYPE;
  v_existing public.market_votes%ROWTYPE;
  v_participant public.anonymous_participants%ROWTYPE;
  v_vote_id uuid;
  v_outcome_rec RECORD;
  v_total_weight numeric;
  v_xp integer;
  v_session text;
BEGIN
  SELECT * INTO v_participant FROM public.anonymous_participants
  WHERE id = p_participant_id AND converted_to_user_id IS NULL;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid anonymous participant');
  END IF;
  v_session := v_participant.session_id;

  SELECT * INTO v_market FROM public.prediction_markets WHERE id = p_market_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Market not found');
  END IF;
  IF v_market.status NOT IN ('active', 'trading') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Market is not active');
  END IF;

  IF v_market.live_event_id IS NULL
     AND COALESCE(v_market.is_micro_market, false) = false
     AND COALESCE(v_market.is_pulse, false) = false THEN
    RETURN jsonb_build_object('success', false, 'error', 'Sign in to vote on this market');
  END IF;

  SELECT * INTO v_outcome FROM public.market_outcomes
  WHERE id = p_outcome_id AND market_id = p_market_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid outcome for this market');
  END IF;

  IF p_confidence < 1 OR p_confidence > 10 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Confidence must be 1-10');
  END IF;

  SELECT * INTO v_existing FROM public.market_votes
  WHERE market_id = p_market_id AND anonymous_participant_id = p_participant_id;
  IF FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'already_voted', true,
      'error', 'already_voted'
    );
  END IF;

  v_xp := GREATEST(5, ROUND(p_confidence * 1.5)::integer);

  INSERT INTO public.market_votes (
    market_id, outcome_id, user_id, confidence, xp_earned, is_anonymous,
    anonymous_participant_id, session_id
  )
  VALUES (
    p_market_id, p_outcome_id, NULL, p_confidence, v_xp, true,
    p_participant_id, v_session
  )
  RETURNING id INTO v_vote_id;

  PERFORM public.increment_anonymous_xp(p_participant_id, v_xp);

  UPDATE public.market_outcomes
  SET vote_count = vote_count + 1,
      total_confidence = total_confidence + p_confidence
  WHERE id = p_outcome_id;

  UPDATE public.prediction_markets
  SET total_votes = COALESCE(total_votes, 0) + 1,
      engagement_count = COALESCE(engagement_count, 0) + 1,
      updated_at = now()
  WHERE id = p_market_id;

  SELECT SUM(total_confidence) INTO v_total_weight
  FROM public.market_outcomes WHERE market_id = p_market_id;

  IF v_total_weight > 0 THEN
    FOR v_outcome_rec IN
      SELECT id, total_confidence FROM public.market_outcomes WHERE market_id = p_market_id
    LOOP
      UPDATE public.market_outcomes
      SET probability = v_outcome_rec.total_confidence::numeric / v_total_weight
      WHERE id = v_outcome_rec.id;
    END LOOP;
  END IF;

  IF COALESCE(v_market.market_type, 'binary') = 'binary' THEN
    UPDATE public.prediction_markets
    SET current_probability = COALESCE((
      SELECT probability * 100 FROM public.market_outcomes
      WHERE market_id = p_market_id AND LOWER(label) IN ('yes', 'sí', 'si')
      LIMIT 1
    ), 50)
    WHERE id = p_market_id;
  ELSE
    UPDATE public.prediction_markets
    SET current_probability = COALESCE((
      SELECT MAX(probability) * 100 FROM public.market_outcomes WHERE market_id = p_market_id
    ), 50)
    WHERE id = p_market_id;
  END IF;

  INSERT INTO public.prediction_market_history (market_id, probability, volume_24h, trade_count)
  VALUES (p_market_id,
    (SELECT probability * 100 FROM public.market_outcomes WHERE id = p_outcome_id),
    0,
    (SELECT total_votes FROM public.prediction_markets WHERE id = p_market_id));

  RETURN jsonb_build_object(
    'success', true,
    'vote_id', v_vote_id,
    'xp_earned', v_xp,
    'is_anonymous', true,
    'outcome_label', v_outcome.label,
    'new_probability', (SELECT probability FROM public.market_outcomes WHERE id = p_outcome_id),
    'confidence', p_confidence
  );
END;
$$;

REVOKE ALL ON FUNCTION public.execute_alias_anonymous_market_vote(uuid, uuid, uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.execute_alias_anonymous_market_vote(uuid, uuid, uuid, integer) TO service_role;

CREATE OR REPLACE FUNCTION public.convert_anonymous_to_user(
  p_session_id text,
  p_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_participant public.anonymous_participants%ROWTYPE;
  v_transferred_xp integer;
BEGIN
  SELECT * INTO v_participant
  FROM public.anonymous_participants
  WHERE session_id = p_session_id
    AND converted_to_user_id IS NULL;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'reason', 'No anonymous session found');
  END IF;

  UPDATE public.anonymous_participants
  SET converted_to_user_id = p_user_id
  WHERE id = v_participant.id;

  UPDATE public.market_votes
  SET user_id = p_user_id,
      anonymous_participant_id = NULL,
      session_id = NULL,
      is_anonymous = false
  WHERE anonymous_participant_id = v_participant.id
    AND user_id IS NULL;

  v_transferred_xp := GREATEST(0, v_participant.total_xp);

  IF v_transferred_xp > 0 THEN
    INSERT INTO public.user_xp (user_id, total_xp, current_tier, tier_progress, xp_to_next_tier)
    VALUES (p_user_id, v_transferred_xp, 1, 0.0, 500)
    ON CONFLICT (user_id) DO UPDATE
    SET total_xp = public.user_xp.total_xp + v_transferred_xp, updated_at = now();

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'leaderboards') THEN
      INSERT INTO public.leaderboards (user_id, total_xp, tier)
      SELECT p_user_id, ux.total_xp, ux.current_tier
      FROM public.user_xp ux WHERE ux.user_id = p_user_id
      ON CONFLICT (user_id) DO UPDATE
      SET total_xp = EXCLUDED.total_xp, tier = EXCLUDED.tier, updated_at = now();
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'transferred_votes', v_participant.total_votes,
    'transferred_xp', v_transferred_xp,
    'alias', v_participant.alias
  );
END;
$$;

REVOKE ALL ON FUNCTION public.convert_anonymous_to_user(text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.convert_anonymous_to_user(text, uuid) TO service_role;
