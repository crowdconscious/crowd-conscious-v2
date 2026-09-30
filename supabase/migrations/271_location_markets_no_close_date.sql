-- ============================================================================
-- 271: Location voting markets have no close date
--
-- After 251, vote RPCs reject any market whose resolution_date has passed
-- ("Pulse has closed"). Conscious Location markets are not Pulses — they stay
-- open for continuous community evaluation. Review cadence lives on
-- conscious_locations.next_review_date, not prediction_markets.resolution_date.
--
-- 1) Allow NULL resolution_date (was TIMESTAMPTZ NOT NULL since 119)
-- 2) Clear stamped close dates on existing location markets
-- 3) Scope the close-date guard to is_pulse = true (bodies from 262)
-- ============================================================================

ALTER TABLE public.prediction_markets
  ALTER COLUMN resolution_date DROP NOT NULL;

COMMENT ON COLUMN public.prediction_markets.resolution_date IS
  'Advertised close for Pulses (is_pulse). NULL = no close (e.g. Conscious Location voting).';

UPDATE public.prediction_markets pm
SET resolution_date = NULL
WHERE pm.id IN (
  SELECT cl.current_market_id
  FROM public.conscious_locations cl
  WHERE cl.current_market_id IS NOT NULL
);

-- ---------------------------------------------------------------------------
-- Vote RPCs: close-date guard only when is_pulse (bodies from 262, one-line change)
-- ---------------------------------------------------------------------------

DROP FUNCTION IF EXISTS public.execute_market_vote(uuid, uuid, uuid, integer, jsonb, text);
DROP FUNCTION IF EXISTS public.execute_anonymous_market_vote(uuid, uuid, uuid, integer, jsonb, text);
DROP FUNCTION IF EXISTS public.execute_alias_anonymous_market_vote(uuid, uuid, uuid, integer, jsonb, text);

CREATE OR REPLACE FUNCTION public.execute_market_vote(
  p_user_id uuid,
  p_market_id uuid,
  p_outcome_id uuid,
  p_confidence integer,
  p_rankings jsonb DEFAULT NULL,
  p_other_text text DEFAULT NULL,
  p_selections jsonb DEFAULT NULL
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
  v_prepared jsonb;
  v_rankings_col jsonb;
  v_other_col text;
  v_selections jsonb;
  v_primary_oid uuid;
  v_primary_conf integer;
  v_old_sel jsonb;
  v_mode text;
BEGIN
  SELECT * INTO v_market FROM public.prediction_markets WHERE id = p_market_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Market not found');
  END IF;
  IF v_market.status NOT IN ('active', 'trading') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Market is not active');
  END IF;
  IF COALESCE(v_market.is_pulse, false) = true AND v_market.resolution_date IS NOT NULL AND v_market.resolution_date <= now() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Pulse has closed');
  END IF;

  v_mode := COALESCE(v_market.vote_mode, 'single');

  -- When selections provided with confidences, top-level p_confidence must match
  -- the derived primary; when omitted, use p_confidence for the single/legacy path.
  IF p_confidence < 0 OR p_confidence > 10 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Confidence must be 0-10');
  END IF;

  v_prepared := public.prepare_market_vote_payload(
    p_market_id, p_outcome_id, p_rankings, p_other_text, p_selections
  );
  IF COALESCE((v_prepared->>'ok')::boolean, false) = false THEN
    RETURN jsonb_build_object('success', false, 'error', COALESCE(v_prepared->>'error', 'Invalid vote'));
  END IF;

  IF v_prepared->'rankings' IS NULL OR v_prepared->'rankings' = 'null'::jsonb THEN
    v_rankings_col := NULL;
  ELSE
    v_rankings_col := v_prepared->'rankings';
  END IF;
  v_other_col := NULLIF(v_prepared->>'other_text', '');
  v_primary_oid := (v_prepared->>'primary_outcome_id')::uuid;

  IF v_mode = 'multi'
     AND p_selections IS NOT NULL
     AND jsonb_typeof(p_selections) = 'array'
     AND jsonb_array_length(p_selections) > 0 THEN
    v_selections := v_prepared->'selections';
    v_primary_conf := (v_prepared->>'primary_confidence')::int;
    -- Align top-level confidence with primary when client sent full selections.
    IF p_confidence IS DISTINCT FROM v_primary_conf THEN
      -- Allow client to send matching values; if mismatch, prefer derived primary.
      -- Require they match for honesty of old single-field consumers.
      RETURN jsonb_build_object('success', false, 'error', 'Confidence must match highest-certainty pick');
    END IF;
  ELSE
    v_selections := public.finalize_vote_selections(v_prepared->'selections', p_confidence);
    v_primary_conf := p_confidence;
  END IF;

  SELECT * INTO v_outcome FROM public.market_outcomes
  WHERE id = v_primary_oid AND market_id = p_market_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid outcome for this market');
  END IF;

  SELECT * INTO v_existing FROM public.market_votes
  WHERE market_id = p_market_id AND user_id = p_user_id;

  IF FOUND THEN
    IF COALESCE(v_existing.is_anonymous, false) THEN
      RETURN jsonb_build_object('success', false, 'error', 'Anonymous votes cannot be updated');
    END IF;

    SELECT COALESCE(jsonb_agg(
             jsonb_build_object('outcome_id', outcome_id, 'confidence', confidence)
             ORDER BY created_at
           ), '[]'::jsonb)
    INTO v_old_sel
    FROM public.market_vote_selections
    WHERE vote_id = v_existing.id;

    IF v_existing.outcome_id = v_primary_oid
       AND v_existing.confidence = v_primary_conf
       AND v_existing.rankings IS NOT DISTINCT FROM v_rankings_col
       AND v_existing.other_text IS NOT DISTINCT FROM v_other_col
       AND v_old_sel = v_selections THEN
      RETURN jsonb_build_object(
        'success', true,
        'is_update', true,
        'no_change', true,
        'xp_earned', 0,
        'outcome_label', v_outcome.label,
        'new_probability', (SELECT probability FROM public.market_outcomes WHERE id = v_primary_oid),
        'confidence', v_primary_conf
      );
    END IF;

    PERFORM public.clear_vote_selections_and_aggregates(v_existing.id);

    UPDATE public.market_votes
    SET outcome_id = v_primary_oid,
        confidence = v_primary_conf,
        rankings = v_rankings_col,
        other_text = v_other_col,
        change_count = COALESCE(change_count, 0) + 1,
        updated_at = now()
    WHERE id = v_existing.id;

    PERFORM public.insert_vote_selections_and_aggregates(
      v_existing.id, p_market_id, v_selections
    );
    PERFORM public.renormalize_market_outcome_probabilities(p_market_id);

    INSERT INTO public.prediction_market_history (market_id, probability, volume_24h, trade_count)
    VALUES (
      p_market_id,
      (SELECT probability * 100 FROM public.market_outcomes WHERE id = v_primary_oid),
      0,
      (SELECT total_votes FROM public.prediction_markets WHERE id = p_market_id)
    );

    RETURN jsonb_build_object(
      'success', true,
      'is_update', true,
      'xp_earned', 0,
      'vote_id', v_existing.id,
      'outcome_label', v_outcome.label,
      'new_probability', (SELECT probability FROM public.market_outcomes WHERE id = v_primary_oid),
      'confidence', v_primary_conf
    );
  END IF;

  v_xp := 0;

  INSERT INTO public.market_votes (
    market_id, outcome_id, user_id, confidence, xp_earned, is_anonymous, rankings, other_text
  )
  VALUES (
    p_market_id, v_primary_oid, p_user_id, v_primary_conf, v_xp, false, v_rankings_col, v_other_col
  )
  RETURNING id INTO v_vote_id;

  PERFORM public.insert_vote_selections_and_aggregates(v_vote_id, p_market_id, v_selections);

  UPDATE public.prediction_markets
  SET total_votes = COALESCE(total_votes, 0) + 1,
      engagement_count = COALESCE(engagement_count, 0) + 1,
      updated_at = now()
  WHERE id = p_market_id;

  PERFORM public.renormalize_market_outcome_probabilities(p_market_id);

  INSERT INTO public.prediction_market_history (market_id, probability, volume_24h, trade_count)
  VALUES (p_market_id,
    (SELECT probability * 100 FROM public.market_outcomes WHERE id = v_primary_oid),
    0,
    (SELECT total_votes FROM public.prediction_markets WHERE id = p_market_id));

  RETURN jsonb_build_object(
    'success', true,
    'is_update', false,
    'vote_id', v_vote_id,
    'xp_earned', v_xp,
    'outcome_label', v_outcome.label,
    'new_probability', (SELECT probability FROM public.market_outcomes WHERE id = v_primary_oid),
    'confidence', v_primary_conf
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.execute_market_vote(uuid, uuid, uuid, integer, jsonb, text, jsonb)
  TO authenticated, anon, service_role;

COMMENT ON FUNCTION public.execute_market_vote IS
  'Cast/update a vote. Supports single, ranked, multi (p_selections). confidence 0 = No lo sé. No XP for casting.';

CREATE OR REPLACE FUNCTION public.execute_anonymous_market_vote(
  p_guest_id uuid,
  p_market_id uuid,
  p_outcome_id uuid,
  p_confidence integer,
  p_rankings jsonb DEFAULT NULL,
  p_other_text text DEFAULT NULL,
  p_selections jsonb DEFAULT NULL
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
  v_prepared jsonb;
  v_rankings_col jsonb;
  v_other_col text;
  v_selections jsonb;
  v_primary_oid uuid;
  v_primary_conf integer;
  v_mode text;
BEGIN
  SELECT * INTO v_market FROM public.prediction_markets WHERE id = p_market_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Market not found');
  END IF;
  IF v_market.status NOT IN ('active', 'trading') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Market is not active');
  END IF;
  IF COALESCE(v_market.is_pulse, false) = true AND v_market.resolution_date IS NOT NULL AND v_market.resolution_date <= now() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Pulse has closed');
  END IF;

  v_mode := COALESCE(v_market.vote_mode, 'single');

  IF p_confidence < 0 OR p_confidence > 10 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Confidence must be 0-10');
  END IF;

  v_prepared := public.prepare_market_vote_payload(
    p_market_id, p_outcome_id, p_rankings, p_other_text, p_selections
  );
  IF COALESCE((v_prepared->>'ok')::boolean, false) = false THEN
    RETURN jsonb_build_object('success', false, 'error', COALESCE(v_prepared->>'error', 'Invalid vote'));
  END IF;

  IF v_prepared->'rankings' IS NULL OR v_prepared->'rankings' = 'null'::jsonb THEN
    v_rankings_col := NULL;
  ELSE
    v_rankings_col := v_prepared->'rankings';
  END IF;
  v_other_col := NULLIF(v_prepared->>'other_text', '');
  v_primary_oid := (v_prepared->>'primary_outcome_id')::uuid;

  IF v_mode = 'multi'
     AND p_selections IS NOT NULL
     AND jsonb_typeof(p_selections) = 'array'
     AND jsonb_array_length(p_selections) > 0 THEN
    v_selections := v_prepared->'selections';
    v_primary_conf := (v_prepared->>'primary_confidence')::int;
    IF p_confidence IS DISTINCT FROM v_primary_conf THEN
      RETURN jsonb_build_object('success', false, 'error', 'Confidence must match highest-certainty pick');
    END IF;
  ELSE
    v_selections := public.finalize_vote_selections(v_prepared->'selections', p_confidence);
    v_primary_conf := p_confidence;
  END IF;

  SELECT * INTO v_outcome FROM public.market_outcomes
  WHERE id = v_primary_oid AND market_id = p_market_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid outcome for this market');
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

  INSERT INTO public.market_votes (
    market_id, outcome_id, user_id, confidence, xp_earned, is_anonymous, rankings, other_text
  )
  VALUES (
    p_market_id, v_primary_oid, p_guest_id, v_primary_conf, 0, true, v_rankings_col, v_other_col
  )
  RETURNING id INTO v_vote_id;

  PERFORM public.insert_vote_selections_and_aggregates(v_vote_id, p_market_id, v_selections);

  UPDATE public.prediction_markets
  SET total_votes = COALESCE(total_votes, 0) + 1,
      engagement_count = COALESCE(engagement_count, 0) + 1,
      updated_at = now()
  WHERE id = p_market_id;

  PERFORM public.renormalize_market_outcome_probabilities(p_market_id);

  INSERT INTO public.prediction_market_history (market_id, probability, volume_24h, trade_count)
  VALUES (p_market_id,
    (SELECT probability * 100 FROM public.market_outcomes WHERE id = v_primary_oid),
    0,
    (SELECT total_votes FROM public.prediction_markets WHERE id = p_market_id));

  RETURN jsonb_build_object(
    'success', true,
    'vote_id', v_vote_id,
    'xp_earned', 0,
    'outcome_label', v_outcome.label,
    'new_probability', (SELECT probability FROM public.market_outcomes WHERE id = v_primary_oid),
    'confidence', v_primary_conf,
    'is_anonymous', true
  );
END;
$$;

-- Keep service_role only — mobile uses POST /api/votes/anonymous.
GRANT EXECUTE ON FUNCTION public.execute_anonymous_market_vote(uuid, uuid, uuid, integer, jsonb, text, jsonb)
  TO service_role;

COMMENT ON FUNCTION public.execute_anonymous_market_vote IS
  'Guest vote (service_role). Multi via p_selections. confidence 0 = No lo sé. No XP.';

CREATE OR REPLACE FUNCTION public.execute_alias_anonymous_market_vote(
  p_participant_id uuid,
  p_market_id uuid,
  p_outcome_id uuid,
  p_confidence integer,
  p_rankings jsonb DEFAULT NULL,
  p_other_text text DEFAULT NULL,
  p_selections jsonb DEFAULT NULL
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
  v_xp integer := 0;
  v_session text;
  v_prepared jsonb;
  v_rankings_col jsonb;
  v_other_col text;
  v_selections jsonb;
  v_primary_oid uuid;
  v_primary_conf integer;
  v_mode text;
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
  IF COALESCE(v_market.is_pulse, false) = true AND v_market.resolution_date IS NOT NULL AND v_market.resolution_date <= now() THEN
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

  v_mode := COALESCE(v_market.vote_mode, 'single');

  IF p_confidence < 0 OR p_confidence > 10 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Confidence must be 0-10');
  END IF;

  v_prepared := public.prepare_market_vote_payload(
    p_market_id, p_outcome_id, p_rankings, p_other_text, p_selections
  );
  IF COALESCE((v_prepared->>'ok')::boolean, false) = false THEN
    RETURN jsonb_build_object('success', false, 'error', COALESCE(v_prepared->>'error', 'Invalid vote'));
  END IF;

  IF v_prepared->'rankings' IS NULL OR v_prepared->'rankings' = 'null'::jsonb THEN
    v_rankings_col := NULL;
  ELSE
    v_rankings_col := v_prepared->'rankings';
  END IF;
  v_other_col := NULLIF(v_prepared->>'other_text', '');
  v_primary_oid := (v_prepared->>'primary_outcome_id')::uuid;

  IF v_mode = 'multi'
     AND p_selections IS NOT NULL
     AND jsonb_typeof(p_selections) = 'array'
     AND jsonb_array_length(p_selections) > 0 THEN
    v_selections := v_prepared->'selections';
    v_primary_conf := (v_prepared->>'primary_confidence')::int;
    IF p_confidence IS DISTINCT FROM v_primary_conf THEN
      RETURN jsonb_build_object('success', false, 'error', 'Confidence must match highest-certainty pick');
    END IF;
  ELSE
    v_selections := public.finalize_vote_selections(v_prepared->'selections', p_confidence);
    v_primary_conf := p_confidence;
  END IF;

  SELECT * INTO v_outcome FROM public.market_outcomes
  WHERE id = v_primary_oid AND market_id = p_market_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid outcome for this market');
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

  v_xp := 0;

  INSERT INTO public.market_votes (
    market_id, outcome_id, user_id, confidence, xp_earned, is_anonymous,
    anonymous_participant_id, session_id, rankings, other_text
  )
  VALUES (
    p_market_id, v_primary_oid, NULL, v_primary_conf, v_xp, true,
    p_participant_id, v_session, v_rankings_col, v_other_col
  )
  RETURNING id INTO v_vote_id;

  PERFORM public.insert_vote_selections_and_aggregates(v_vote_id, p_market_id, v_selections);

  UPDATE public.prediction_markets
  SET total_votes = COALESCE(total_votes, 0) + 1,
      engagement_count = COALESCE(engagement_count, 0) + 1,
      updated_at = now()
  WHERE id = p_market_id;

  PERFORM public.renormalize_market_outcome_probabilities(p_market_id);

  INSERT INTO public.prediction_market_history (market_id, probability, volume_24h, trade_count)
  VALUES (p_market_id,
    (SELECT probability * 100 FROM public.market_outcomes WHERE id = v_primary_oid),
    0,
    (SELECT total_votes FROM public.prediction_markets WHERE id = p_market_id));

  RETURN jsonb_build_object(
    'success', true,
    'vote_id', v_vote_id,
    'xp_earned', v_xp,
    'is_anonymous', true,
    'outcome_label', v_outcome.label,
    'new_probability', (SELECT probability FROM public.market_outcomes WHERE id = v_primary_oid),
    'confidence', v_primary_conf
  );
END;
$$;

REVOKE ALL ON FUNCTION public.execute_alias_anonymous_market_vote(uuid, uuid, uuid, integer, jsonb, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.execute_alias_anonymous_market_vote(uuid, uuid, uuid, integer, jsonb, text, jsonb)
  TO service_role;

COMMENT ON FUNCTION public.execute_alias_anonymous_market_vote IS
  'Alias anonymous vote (service_role). Multi via p_selections. confidence 0 = No lo sé. No XP.';
