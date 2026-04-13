-- Align execute_alias_anonymous_market_vote with API: allow anonymous alias votes
-- for Conscious Locations markets (current_market_id on conscious_locations), not only
-- live / micro / Pulse markets.

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
     AND COALESCE(v_market.is_pulse, false) = false
     AND NOT EXISTS (
       SELECT 1 FROM public.conscious_locations
       WHERE current_market_id = p_market_id
     ) THEN
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
