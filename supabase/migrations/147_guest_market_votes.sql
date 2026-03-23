-- Guest / anonymous votes stored in market_votes with synthetic user_id (browser UUID).
-- is_anonymous = true, xp_earned = 0, no XP tables updated until claim after signup.

ALTER TABLE public.market_votes
  ADD COLUMN IF NOT EXISTS is_anonymous boolean NOT NULL DEFAULT false;

-- Guest IDs are not auth.users; drop FK so arbitrary UUIDs are allowed.
ALTER TABLE public.market_votes DROP CONSTRAINT IF EXISTS market_votes_user_id_fkey;

COMMENT ON COLUMN public.market_votes.is_anonymous IS 'True for browser guest votes (user_id is synthetic UUID). False after claim or for normal users.';

-- ============================================================================
-- Anonymous vote: same market math as execute_market_vote, no XP / leaderboard
-- ============================================================================
CREATE OR REPLACE FUNCTION public.execute_anonymous_market_vote(
  p_guest_id uuid,
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
  v_vote_id uuid;
  v_outcome_rec RECORD;
  v_total_weight numeric;
  v_outcome_count integer;
  v_total_votes integer;
BEGIN
  SELECT * INTO v_market FROM public.prediction_markets WHERE id = p_market_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Market not found');
  END IF;
  IF v_market.status NOT IN ('active', 'trading') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Market is not active');
  END IF;

  SELECT * INTO v_outcome FROM public.market_outcomes
  WHERE id = p_outcome_id AND market_id = p_market_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid outcome for this market');
  END IF;

  SELECT * INTO v_existing FROM public.market_votes
  WHERE market_id = p_market_id AND user_id = p_guest_id;
  IF FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'You already voted on this market');
  END IF;

  IF p_confidence < 1 OR p_confidence > 10 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Confidence must be 1-10');
  END IF;

  SELECT COUNT(*) INTO v_outcome_count FROM public.market_outcomes WHERE market_id = p_market_id;

  INSERT INTO public.market_votes (market_id, outcome_id, user_id, confidence, xp_earned, is_anonymous)
  VALUES (p_market_id, p_outcome_id, p_guest_id, p_confidence, 0, true)
  RETURNING id INTO v_vote_id;

  UPDATE public.market_outcomes
  SET vote_count = vote_count + 1,
      total_confidence = total_confidence + p_confidence
  WHERE id = p_outcome_id;

  UPDATE public.prediction_markets
  SET total_votes = COALESCE(total_votes, 0) + 1,
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

  SELECT total_votes INTO v_total_votes FROM public.prediction_markets WHERE id = p_market_id;

  RETURN jsonb_build_object(
    'success', true,
    'vote_id', v_vote_id,
    'xp_earned', 0,
    'outcome_label', v_outcome.label,
    'new_probability', (SELECT probability FROM public.market_outcomes WHERE id = p_outcome_id),
    'confidence', p_confidence,
    'total_votes', COALESCE(v_total_votes, 0)
  );
END;
$$;

-- ============================================================================
-- After signup: re-attribute guest row to real user and award XP once
-- ============================================================================
CREATE OR REPLACE FUNCTION public.claim_guest_market_vote(
  p_guest_id uuid,
  p_new_user_id uuid,
  p_market_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_vote public.market_votes%ROWTYPE;
  v_market public.prediction_markets%ROWTYPE;
  v_outcome public.market_outcomes%ROWTYPE;
  v_other uuid;
  v_xp integer;
  v_outcome_count integer;
BEGIN
  SELECT * INTO v_vote FROM public.market_votes
  WHERE user_id = p_guest_id AND market_id = p_market_id AND is_anonymous = true;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'No guest vote to claim');
  END IF;

  SELECT id INTO v_other FROM public.market_votes
  WHERE market_id = p_market_id AND user_id = p_new_user_id AND id <> v_vote.id;
  IF FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Account already has a vote on this market');
  END IF;

  SELECT * INTO v_market FROM public.prediction_markets WHERE id = p_market_id;
  SELECT * INTO v_outcome FROM public.market_outcomes WHERE id = v_vote.outcome_id;

  SELECT COUNT(*) INTO v_outcome_count FROM public.market_outcomes WHERE market_id = p_market_id;

  IF v_outcome_count <= 2 THEN
    v_xp := 5 + (v_vote.confidence - 1);
  ELSE
    v_xp := 10 + GREATEST(0, LEAST(15, ROUND((1 - COALESCE(v_outcome.probability, 0.5)) * 15)::integer));
  END IF;

  UPDATE public.market_votes
  SET user_id = p_new_user_id,
      is_anonymous = false,
      xp_earned = v_xp
  WHERE id = v_vote.id;

  INSERT INTO public.xp_transactions (user_id, amount, action_type, action_id, description)
  VALUES (p_new_user_id, v_xp, 'prediction_vote', v_vote.id,
    'Predicted: ' || LEFT(v_outcome.label, 30) || ' on ' || LEFT(v_market.title, 40));

  INSERT INTO public.user_xp (user_id, total_xp, current_tier, tier_progress, xp_to_next_tier)
  VALUES (p_new_user_id, v_xp, 1, 0.0, 500)
  ON CONFLICT (user_id) DO UPDATE
  SET total_xp = public.user_xp.total_xp + v_xp, updated_at = now();

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'leaderboards') THEN
    INSERT INTO public.leaderboards (user_id, total_xp, tier)
    SELECT p_new_user_id, ux.total_xp, ux.current_tier
    FROM public.user_xp ux WHERE ux.user_id = p_new_user_id
    ON CONFLICT (user_id) DO UPDATE
    SET total_xp = EXCLUDED.total_xp, tier = EXCLUDED.tier, updated_at = now();
  END IF;

  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid WHERE n.nspname = 'public' AND p.proname = 'check_achievements') THEN
    PERFORM public.check_achievements(p_new_user_id, 'prediction_vote', v_vote.id);
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'xp_earned', v_xp,
    'vote_id', v_vote.id
  );
END;
$$;
