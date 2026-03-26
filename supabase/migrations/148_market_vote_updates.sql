-- Re-vote / update prediction: track changes, adjust outcome aggregates, keep one row per user+market.

ALTER TABLE public.market_votes
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS change_count integer NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.market_votes.updated_at IS 'Last time outcome or confidence changed (registered users).';
COMMENT ON COLUMN public.market_votes.change_count IS 'Number of times this user changed outcome or confidence on this market.';

-- Only bump change_count when outcome or confidence actually changes (avoids claim_guest false positives).
CREATE OR REPLACE FUNCTION public.update_market_vote_timestamp()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF (NEW.outcome_id IS DISTINCT FROM OLD.outcome_id OR NEW.confidence IS DISTINCT FROM OLD.confidence) THEN
    NEW.updated_at := now();
    NEW.change_count := COALESCE(OLD.change_count, 0) + 1;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS market_votes_updated_at ON public.market_votes;
CREATE TRIGGER market_votes_updated_at
  BEFORE UPDATE ON public.market_votes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_market_vote_timestamp();

-- Helpers (used by execute_market_vote; SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.update_outcome_vote_counts(
  old_outcome_id uuid,
  new_outcome_id uuid
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.market_outcomes
  SET vote_count = GREATEST(0, vote_count - 1)
  WHERE id = old_outcome_id;

  UPDATE public.market_outcomes
  SET vote_count = vote_count + 1
  WHERE id = new_outcome_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_outcome_confidence(
  p_outcome_id uuid,
  p_old_confidence integer,
  p_new_confidence integer
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.market_outcomes
  SET total_confidence = total_confidence - p_old_confidence + p_new_confidence
  WHERE id = p_outcome_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.execute_market_vote(
  p_user_id uuid,
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
  v_xp integer;
  v_vote_id uuid;
  v_outcome_rec RECORD;
  v_total_weight numeric;
  v_outcome_count integer;
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

  IF p_confidence < 1 OR p_confidence > 10 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Confidence must be 1-10');
  END IF;

  SELECT * INTO v_existing FROM public.market_votes
  WHERE market_id = p_market_id AND user_id = p_user_id;

  IF FOUND THEN
    IF COALESCE(v_existing.is_anonymous, false) THEN
      RETURN jsonb_build_object('success', false, 'error', 'Anonymous votes cannot be updated');
    END IF;

    IF v_existing.outcome_id = p_outcome_id AND v_existing.confidence = p_confidence THEN
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
        confidence = p_confidence
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

  -- New vote (insert path)
  SELECT COUNT(*) INTO v_outcome_count FROM public.market_outcomes WHERE market_id = p_market_id;

  IF v_outcome_count <= 2 THEN
    v_xp := 5 + (p_confidence - 1);
  ELSE
    v_xp := 10 + GREATEST(0, LEAST(15, ROUND((1 - COALESCE(v_outcome.probability, 0.5)) * 15)::integer));
  END IF;

  INSERT INTO public.market_votes (market_id, outcome_id, user_id, confidence, xp_earned)
  VALUES (p_market_id, p_outcome_id, p_user_id, p_confidence, v_xp)
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

  INSERT INTO public.xp_transactions (user_id, amount, action_type, action_id, description)
  VALUES (p_user_id, v_xp, 'prediction_vote', v_vote_id,
    'Predicted: ' || LEFT(v_outcome.label, 30) || ' on ' || LEFT(v_market.title, 40));

  INSERT INTO public.user_xp (user_id, total_xp, current_tier, tier_progress, xp_to_next_tier)
  VALUES (p_user_id, v_xp, 1, 0.0, 500)
  ON CONFLICT (user_id) DO UPDATE
  SET total_xp = public.user_xp.total_xp + v_xp, updated_at = now();

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'leaderboards') THEN
    INSERT INTO public.leaderboards (user_id, total_xp, tier)
    SELECT p_user_id, ux.total_xp, ux.current_tier
    FROM public.user_xp ux WHERE ux.user_id = p_user_id
    ON CONFLICT (user_id) DO UPDATE
    SET total_xp = EXCLUDED.total_xp, tier = EXCLUDED.tier, updated_at = now();
  END IF;

  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid WHERE n.nspname = 'public' AND p.proname = 'check_achievements') THEN
    PERFORM public.check_achievements(p_user_id, 'prediction_vote', v_vote_id);
  END IF;

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
