-- Phase 0 addendum (Strategist/CTO 2026-09-21): sacred-data rule.
-- No XP for vote VOLUME, OPTION chosen, OR CONFIDENCE — not only accuracy.
--
-- Live cast RPCs (migration 256) still paid:
--   binary/few-outcome:  v_xp := 5 + (p_confidence - 1)          -- confidence gaming
--   multi-outcome:       v_xp := 10 + f(1 - probability)          -- option/longshot gaming
--   alias anonymous:     v_xp := GREATEST(5, ROUND(confidence*1.5))
-- plus xp_transactions 'prediction_vote' + user_xp / anonymous_participants bumps.
--
-- This migration zeroes cast XP while preserving vote math (aggregates untouched).
-- Migration 257 already stripped resolve-time accuracy bonus XP.
-- Apply in Supabase before production behavior matches code.
--
-- Kept: Señales report/co-sign XP and other non-vote civic rewards.

CREATE OR REPLACE FUNCTION public.execute_market_vote(
  p_user_id uuid,
  p_market_id uuid,
  p_outcome_id uuid,
  p_confidence integer,
  p_rankings jsonb DEFAULT NULL,
  p_other_text text DEFAULT NULL
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
  v_xp integer := 0;
  v_vote_id uuid;
  v_outcome_rec RECORD;
  v_total_weight numeric;
  v_outcome_count integer;
  v_prepared jsonb;
  v_rankings_col jsonb;
  v_other_col text;
BEGIN
  SELECT * INTO v_market FROM public.prediction_markets WHERE id = p_market_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Market not found');
  END IF;
  IF v_market.status NOT IN ('active', 'trading') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Market is not active');
  END IF;
  IF v_market.resolution_date IS NOT NULL AND v_market.resolution_date <= now() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Pulse has closed');
  END IF;

  SELECT * INTO v_outcome FROM public.market_outcomes
  WHERE id = p_outcome_id AND market_id = p_market_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid outcome for this market');
  END IF;

  IF p_confidence < 1 OR p_confidence > 10 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Confidence must be 1-10');
  END IF;

  v_prepared := public.prepare_market_vote_payload(p_market_id, p_outcome_id, p_rankings, p_other_text);
  IF COALESCE((v_prepared->>'ok')::boolean, false) = false THEN
    RETURN jsonb_build_object('success', false, 'error', COALESCE(v_prepared->>'error', 'Invalid vote'));
  END IF;
  IF v_prepared->'rankings' IS NULL OR v_prepared->'rankings' = 'null'::jsonb THEN
    v_rankings_col := NULL;
  ELSE
    v_rankings_col := v_prepared->'rankings';
  END IF;
  v_other_col := NULLIF(v_prepared->>'other_text', '');

  SELECT * INTO v_existing FROM public.market_votes
  WHERE market_id = p_market_id AND user_id = p_user_id;

  IF FOUND THEN
    IF COALESCE(v_existing.is_anonymous, false) THEN
      RETURN jsonb_build_object('success', false, 'error', 'Anonymous votes cannot be updated');
    END IF;

    IF v_existing.outcome_id = p_outcome_id
       AND v_existing.confidence = p_confidence
       AND v_existing.rankings IS NOT DISTINCT FROM v_rankings_col
       AND v_existing.other_text IS NOT DISTINCT FROM v_other_col THEN
      RETURN jsonb_build_object(
        'success', true,
        'is_update', true,
        'no_change', true,
        'xp_earned', 0,
        'outcome_label', v_outcome.label,
        'new_probability', (SELECT probability FROM public.market_outcomes WHERE id = p_outcome_id),
        'confidence', p_confidence
      );
    END IF;

    IF v_existing.outcome_id = p_outcome_id THEN
      PERFORM public.update_outcome_confidence(p_outcome_id, v_existing.confidence, p_confidence);
    ELSE
      UPDATE public.market_outcomes
      SET vote_count = GREATEST(0, vote_count - 1),
          total_confidence = GREATEST(0, total_confidence - v_existing.confidence)
      WHERE id = v_existing.outcome_id;

      UPDATE public.market_outcomes
      SET vote_count = vote_count + 1,
          total_confidence = total_confidence + p_confidence
      WHERE id = p_outcome_id;
    END IF;

    UPDATE public.market_votes
    SET outcome_id = p_outcome_id,
        confidence = p_confidence,
        rankings = v_rankings_col,
        other_text = v_other_col
    WHERE id = v_existing.id;

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
      ), 50),
      updated_at = now()
      WHERE id = p_market_id;
    ELSE
      UPDATE public.prediction_markets
      SET current_probability = COALESCE((
        SELECT MAX(probability) * 100 FROM public.market_outcomes WHERE market_id = p_market_id
      ), 50),
      updated_at = now()
      WHERE id = p_market_id;
    END IF;

    INSERT INTO public.prediction_market_history (market_id, probability, volume_24h, trade_count)
    VALUES (
      p_market_id,
      (SELECT probability * 100 FROM public.market_outcomes WHERE id = p_outcome_id),
      0,
      (SELECT total_votes FROM public.prediction_markets WHERE id = p_market_id)
    );

    RETURN jsonb_build_object(
      'success', true,
      'is_update', true,
      'xp_earned', 0,
      'vote_id', v_existing.id,
      'outcome_label', v_outcome.label,
      'new_probability', (SELECT probability FROM public.market_outcomes WHERE id = p_outcome_id),
      'confidence', p_confidence
    );
  END IF;

  -- Sacred data: never pay XP for casting a vote (volume / option / confidence).
  SELECT COUNT(*) INTO v_outcome_count FROM public.market_outcomes WHERE market_id = p_market_id;
  v_xp := 0;

  INSERT INTO public.market_votes (
    market_id, outcome_id, user_id, confidence, xp_earned, is_anonymous, rankings, other_text
  )
  VALUES (
    p_market_id, p_outcome_id, p_user_id, p_confidence, v_xp, false, v_rankings_col, v_other_col
  )
  RETURNING id INTO v_vote_id;

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

  -- Intentionally no xp_transactions / user_xp / leaderboards / check_achievements
  -- for prediction_vote (Phase 0 sacred-data).

  RETURN jsonb_build_object(
    'success', true,
    'is_update', false,
    'vote_id', v_vote_id,
    'xp_earned', v_xp,
    'outcome_label', v_outcome.label,
    'new_probability', (SELECT probability FROM public.market_outcomes WHERE id = p_outcome_id),
    'confidence', p_confidence
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.execute_market_vote(uuid, uuid, uuid, integer, jsonb, text)
  TO authenticated, anon, service_role;

COMMENT ON FUNCTION public.execute_market_vote IS
  'Cast a vote. Ranked mode supported. Does NOT award XP for volume/option/confidence (Phase 0 sacred-data).';

-- Alias anonymous path: same sacred-data zero XP (was confidence-scaled).
CREATE OR REPLACE FUNCTION public.execute_alias_anonymous_market_vote(
  p_participant_id uuid,
  p_market_id uuid,
  p_outcome_id uuid,
  p_confidence integer,
  p_rankings jsonb DEFAULT NULL,
  p_other_text text DEFAULT NULL
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
  v_xp integer := 0;
  v_session text;
  v_prepared jsonb;
  v_rankings_col jsonb;
  v_other_col text;
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
  IF v_market.resolution_date IS NOT NULL AND v_market.resolution_date <= now() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Pulse has closed');
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

  v_prepared := public.prepare_market_vote_payload(p_market_id, p_outcome_id, p_rankings, p_other_text);
  IF COALESCE((v_prepared->>'ok')::boolean, false) = false THEN
    RETURN jsonb_build_object('success', false, 'error', COALESCE(v_prepared->>'error', 'Invalid vote'));
  END IF;
  IF v_prepared->'rankings' IS NULL OR v_prepared->'rankings' = 'null'::jsonb THEN
    v_rankings_col := NULL;
  ELSE
    v_rankings_col := v_prepared->'rankings';
  END IF;
  v_other_col := NULLIF(v_prepared->>'other_text', '');

  SELECT * INTO v_existing FROM public.market_votes
  WHERE market_id = p_market_id AND anonymous_participant_id = p_participant_id;
  IF FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'already_voted', true,
      'error', 'already_voted'
    );
  END IF;

  v_xp := 0;

  INSERT INTO public.market_votes (
    market_id, outcome_id, user_id, confidence, xp_earned, is_anonymous,
    anonymous_participant_id, session_id, rankings, other_text
  )
  VALUES (
    p_market_id, p_outcome_id, NULL, p_confidence, v_xp, true,
    p_participant_id, v_session, v_rankings_col, v_other_col
  )
  RETURNING id INTO v_vote_id;

  -- No increment_anonymous_xp — sacred-data (was confidence-scaled).

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

REVOKE ALL ON FUNCTION public.execute_alias_anonymous_market_vote(uuid, uuid, uuid, integer, jsonb, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.execute_alias_anonymous_market_vote(uuid, uuid, uuid, integer, jsonb, text) TO service_role;

COMMENT ON FUNCTION public.execute_alias_anonymous_market_vote IS
  'Alias anonymous vote. Does NOT award XP for volume/option/confidence (Phase 0 sacred-data).';

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'xp_rewards'
  ) THEN
    UPDATE public.xp_rewards
    SET xp_amount = 0,
        description = 'RETIRED Phase 0: no XP for vote volume/option/confidence'
    WHERE action_type = 'prediction_vote';
  END IF;
END $$;
