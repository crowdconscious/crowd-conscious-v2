-- ============================================================
-- 161: Browser-guest votes (execute_anonymous_market_vote) must
-- update market_outcomes probabilities like all other vote paths.
-- Previously (151) they only bumped engagement_count.
-- Also fix claim_guest_market_vote to avoid double-counting outcomes
-- when guest votes already contributed to aggregates.
-- Backfill outcome aggregates + market counters from ALL market_votes.
-- ============================================================

COMMENT ON COLUMN public.prediction_markets.total_votes IS 'Count of all market_votes rows (registered + anonymous).';
COMMENT ON COLUMN public.prediction_markets.engagement_count IS 'Total participation rows (same source as total_votes; legacy column).';

-- ---------------------------------------------------------------------------
-- Guest UUID votes: same outcome math as execute_live_anonymous_market_vote
-- ---------------------------------------------------------------------------
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
  WHERE market_id = p_market_id AND user_id = p_guest_id AND COALESCE(is_anonymous, false) = true;
  IF FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'already_voted', true,
      'error', 'already_voted'
    );
  END IF;

  INSERT INTO public.market_votes (market_id, outcome_id, user_id, confidence, xp_earned, is_anonymous)
  VALUES (p_market_id, p_outcome_id, p_guest_id, p_confidence, 0, true)
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

  RETURN jsonb_build_object(
    'success', true,
    'vote_id', v_vote_id,
    'xp_earned', 0,
    'outcome_label', v_outcome.label,
    'new_probability', (SELECT probability FROM public.market_outcomes WHERE id = p_outcome_id),
    'confidence', p_confidence,
    'is_anonymous', true
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- Claim: guest row already counted in aggregates — only attach user + XP
-- ---------------------------------------------------------------------------
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

  -- Guest vote already included in market_outcomes + total_votes — do not add again
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

-- ---------------------------------------------------------------------------
-- Backfill: rebuild aggregates from ALL rows in market_votes
-- ---------------------------------------------------------------------------
UPDATE public.market_outcomes SET vote_count = 0, total_confidence = 0;

UPDATE public.market_outcomes mo
SET
  vote_count = COALESCE(a.cnt, 0),
  total_confidence = COALESCE(a.conf_sum, 0)
FROM (
  SELECT
    outcome_id,
    COUNT(*)::integer AS cnt,
    SUM(confidence)::numeric AS conf_sum
  FROM public.market_votes
  GROUP BY outcome_id
) a
WHERE mo.id = a.outcome_id;

DO $$
DECLARE
  r RECORD;
  tw numeric;
  oc integer;
BEGIN
  FOR r IN SELECT DISTINCT market_id FROM public.market_outcomes LOOP
    SELECT COALESCE(SUM(total_confidence), 0), COUNT(*)::integer
    INTO tw, oc
    FROM public.market_outcomes
    WHERE market_id = r.market_id;

    IF tw > 0 THEN
      UPDATE public.market_outcomes mo
      SET probability = mo.total_confidence / tw
      WHERE mo.market_id = r.market_id;
    ELSIF oc > 0 THEN
      UPDATE public.market_outcomes mo
      SET probability = 1.0 / oc::numeric
      WHERE mo.market_id = r.market_id;
    END IF;
  END LOOP;
END $$;

UPDATE public.prediction_markets pm
SET
  total_votes = COALESCE((
    SELECT COUNT(*)::integer FROM public.market_votes mv WHERE mv.market_id = pm.id
  ), 0),
  engagement_count = COALESCE((
    SELECT COUNT(*)::integer FROM public.market_votes mv WHERE mv.market_id = pm.id
  ), 0),
  updated_at = now();

UPDATE public.prediction_markets pm
SET current_probability = COALESCE((
  SELECT CASE
    WHEN COALESCE(pm.market_type, 'binary') = 'binary' THEN (
      SELECT mo.probability * 100
      FROM public.market_outcomes mo
      WHERE mo.market_id = pm.id AND LOWER(mo.label) IN ('yes', 'sí', 'si')
      LIMIT 1
    )
    ELSE (
      SELECT MAX(mo.probability) * 100
      FROM public.market_outcomes mo
      WHERE mo.market_id = pm.id
    )
  END
), 50)
WHERE EXISTS (SELECT 1 FROM public.market_outcomes o WHERE o.market_id = pm.id);
