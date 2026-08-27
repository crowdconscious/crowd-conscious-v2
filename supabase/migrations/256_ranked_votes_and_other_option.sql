-- ============================================================================
-- 256: Ranked multi-option votes (F2, scoring A1) + "Other" free-text (F3)
--
-- Storage: market_votes.rankings jsonb [{outcome_id, rank}] — not a child table.
-- Rankings are ≤3 items, uniqueness already lives on the vote row, and the
-- vote RPCs stay a single INSERT/UPDATE. Rank 2/3 is preference signal only;
-- confidence weight and resolution still use market_votes.outcome_id (rank 1).
--
-- Existing Pulses stay vote_mode='single'. Single-option path and 251
-- confidence-weighted resolution are unchanged (winner = SUM(confidence)
-- grouped by outcome_id, which remains the primary/rank-1 choice).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Columns
-- ---------------------------------------------------------------------------
ALTER TABLE public.prediction_markets
  ADD COLUMN IF NOT EXISTS vote_mode text NOT NULL DEFAULT 'single';

ALTER TABLE public.prediction_markets
  DROP CONSTRAINT IF EXISTS prediction_markets_vote_mode_check;

ALTER TABLE public.prediction_markets
  ADD CONSTRAINT prediction_markets_vote_mode_check
  CHECK (vote_mode IN ('single', 'ranked'));

ALTER TABLE public.prediction_markets
  ADD COLUMN IF NOT EXISTS allow_other boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.prediction_markets.vote_mode IS
  'single (default): one outcome. ranked: up to 3 ordered preferences; confidence applies to rank 1 only (A1).';
COMMENT ON COLUMN public.prediction_markets.allow_other IS
  'When true, an extra market_outcomes row with is_other=true is created. Listed options stay 2–6; Other is extra.';

ALTER TABLE public.market_outcomes
  ADD COLUMN IF NOT EXISTS is_other boolean NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS market_outcomes_one_other_per_market
  ON public.market_outcomes (market_id)
  WHERE is_other = true;

COMMENT ON COLUMN public.market_outcomes.is_other IS
  'Special "Otro"/"Other" outcome. Voters who pick it must supply market_votes.other_text.';

ALTER TABLE public.market_votes
  ADD COLUMN IF NOT EXISTS rankings jsonb;

ALTER TABLE public.market_votes
  ADD COLUMN IF NOT EXISTS other_text text;

ALTER TABLE public.market_votes
  DROP CONSTRAINT IF EXISTS market_votes_other_text_len;

ALTER TABLE public.market_votes
  ADD CONSTRAINT market_votes_other_text_len
  CHECK (other_text IS NULL OR char_length(other_text) <= 120);

COMMENT ON COLUMN public.market_votes.rankings IS
  'Ranked mode: [{outcome_id, rank}] with rank 1..3. Rank 1 matches outcome_id. Null on single-mode votes.';
COMMENT ON COLUMN public.market_votes.other_text IS
  'Required (trimmed, max 120) when any selected/ranked outcome has is_other=true. Not overloaded onto reasoning.';

-- ---------------------------------------------------------------------------
-- Shared validator (called from vote RPCs). Not granted to clients.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.prepare_market_vote_payload(
  p_market_id uuid,
  p_outcome_id uuid,
  p_rankings jsonb,
  p_other_text text
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  v_mode text;
  v_rankings jsonb;
  v_other text;
  v_elem jsonb;
  v_rank int;
  v_oid uuid;
  v_seen_ranks int[] := ARRAY[]::int[];
  v_seen_oids uuid[] := ARRAY[]::uuid[];
  v_n int;
  v_i int;
  v_rank1 uuid;
  v_has_other boolean := false;
  v_selected uuid[];
BEGIN
  SELECT COALESCE(vote_mode, 'single') INTO v_mode
  FROM public.prediction_markets WHERE id = p_market_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Market not found');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.market_outcomes
    WHERE id = p_outcome_id AND market_id = p_market_id
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Invalid outcome for this market');
  END IF;

  IF v_mode = 'single' THEN
    IF p_rankings IS NOT NULL
       AND jsonb_typeof(p_rankings) = 'array'
       AND jsonb_array_length(p_rankings) > 0 THEN
      RETURN jsonb_build_object('ok', false, 'error', 'Ranked submit on a single-choice Pulse');
    END IF;
    v_rankings := NULL;
    v_selected := ARRAY[p_outcome_id];
  ELSE
    -- Ranked: missing rankings → implicit rank-1 only so sim and older clients
    -- can still vote the primary outcome without extra confidence on 2/3.
    IF p_rankings IS NULL
       OR jsonb_typeof(p_rankings) <> 'array'
       OR jsonb_array_length(p_rankings) = 0 THEN
      v_rankings := jsonb_build_array(
        jsonb_build_object('outcome_id', p_outcome_id, 'rank', 1)
      );
      v_selected := ARRAY[p_outcome_id];
    ELSE
      v_n := jsonb_array_length(p_rankings);
      IF v_n > 3 THEN
        RETURN jsonb_build_object('ok', false, 'error', 'At most 3 ranked options');
      END IF;

      FOR v_i IN 0 .. v_n - 1 LOOP
        v_elem := p_rankings -> v_i;
        BEGIN
          v_oid := (v_elem->>'outcome_id')::uuid;
        EXCEPTION WHEN OTHERS THEN
          RETURN jsonb_build_object('ok', false, 'error', 'Invalid ranked outcome');
        END;
        BEGIN
          v_rank := (v_elem->>'rank')::int;
        EXCEPTION WHEN OTHERS THEN
          RETURN jsonb_build_object('ok', false, 'error', 'Invalid rank');
        END;
        IF v_rank < 1 OR v_rank > 3 THEN
          RETURN jsonb_build_object('ok', false, 'error', 'Rank must be 1, 2, or 3');
        END IF;
        IF v_rank = ANY (v_seen_ranks) THEN
          RETURN jsonb_build_object('ok', false, 'error', 'Duplicate rank');
        END IF;
        IF v_oid = ANY (v_seen_oids) THEN
          RETURN jsonb_build_object('ok', false, 'error', 'Duplicate ranked outcome');
        END IF;
        IF NOT EXISTS (
          SELECT 1 FROM public.market_outcomes
          WHERE id = v_oid AND market_id = p_market_id
        ) THEN
          RETURN jsonb_build_object('ok', false, 'error', 'Invalid ranked outcome');
        END IF;
        v_seen_ranks := v_seen_ranks || v_rank;
        v_seen_oids := v_seen_oids || v_oid;
      END LOOP;

      FOR v_i IN 1 .. v_n LOOP
        IF NOT (v_i = ANY (v_seen_ranks)) THEN
          RETURN jsonb_build_object('ok', false, 'error', 'Ranks must be consecutive from 1');
        END IF;
      END LOOP;

      SELECT (e->>'outcome_id')::uuid INTO v_rank1
      FROM jsonb_array_elements(p_rankings) e
      WHERE (e->>'rank')::int = 1;
      IF v_rank1 IS DISTINCT FROM p_outcome_id THEN
        RETURN jsonb_build_object('ok', false, 'error', 'Primary outcome must be rank 1');
      END IF;

      SELECT jsonb_agg(
               jsonb_build_object('outcome_id', oid, 'rank', rnk)
               ORDER BY rnk
             )
      INTO v_rankings
      FROM (
        SELECT (e->>'outcome_id')::uuid AS oid, (e->>'rank')::int AS rnk
        FROM jsonb_array_elements(p_rankings) e
      ) s;

      SELECT array_agg(oid) INTO v_selected
      FROM (
        SELECT (e->>'outcome_id')::uuid AS oid
        FROM jsonb_array_elements(v_rankings) e
      ) x;
    END IF;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.market_outcomes
    WHERE id = ANY (v_selected) AND COALESCE(is_other, false) = true
  ) INTO v_has_other;

  IF v_has_other THEN
    v_other := btrim(COALESCE(p_other_text, ''));
    IF v_other = '' THEN
      RETURN jsonb_build_object('ok', false, 'error', 'Other text is required');
    END IF;
    IF char_length(v_other) > 120 THEN
      RETURN jsonb_build_object('ok', false, 'error', 'Other text must be 120 characters or fewer');
    END IF;
  ELSE
    v_other := NULL;
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'rankings', v_rankings,
    'other_text', v_other
  );
END;
$$;

REVOKE ALL ON FUNCTION public.prepare_market_vote_payload(uuid, uuid, jsonb, text) FROM PUBLIC;

-- Extra args have defaults so 4-arg callers (mobile, tests) keep working.
-- DROP the old signatures first: CREATE OR REPLACE with added args would
-- otherwise leave an overload, which PostgREST cannot dispatch.
DROP FUNCTION IF EXISTS public.execute_market_vote(uuid, uuid, uuid, integer);
DROP FUNCTION IF EXISTS public.execute_anonymous_market_vote(uuid, uuid, uuid, integer);
DROP FUNCTION IF EXISTS public.execute_alias_anonymous_market_vote(uuid, uuid, uuid, integer);

-- ---------------------------------------------------------------------------
-- Registered vote RPC (base: 251) + rankings/other_text
-- ---------------------------------------------------------------------------
CREATE FUNCTION public.execute_market_vote(
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
  v_xp integer;
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

    -- created_at is preserved on re-vote (ranking/confidence/other_text update).
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

  SELECT COUNT(*) INTO v_outcome_count FROM public.market_outcomes WHERE market_id = p_market_id;

  IF v_outcome_count <= 2 THEN
    v_xp := 5 + (p_confidence - 1);
  ELSE
    v_xp := 10 + GREATEST(0, LEAST(15, ROUND((1 - COALESCE(v_outcome.probability, 0.5)) * 15)::integer));
  END IF;

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

GRANT EXECUTE ON FUNCTION public.execute_market_vote(uuid, uuid, uuid, integer, jsonb, text)
  TO authenticated, anon, service_role;

-- ---------------------------------------------------------------------------
-- Anonymous (browser-guest) vote RPC (base: 251) + rankings/other_text
-- ---------------------------------------------------------------------------
CREATE FUNCTION public.execute_anonymous_market_vote(
  p_guest_id uuid,
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
  v_vote_id uuid;
  v_outcome_rec RECORD;
  v_total_weight numeric;
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
    p_market_id, p_outcome_id, p_guest_id, p_confidence, 0, true, v_rankings_col, v_other_col
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

GRANT EXECUTE ON FUNCTION public.execute_anonymous_market_vote(uuid, uuid, uuid, integer, jsonb, text)
  TO service_role;

-- ---------------------------------------------------------------------------
-- Alias anonymous vote (base: 190) + close-date guard + rankings/other_text
-- ---------------------------------------------------------------------------
CREATE FUNCTION public.execute_alias_anonymous_market_vote(
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
  v_xp integer;
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

  v_xp := GREATEST(5, ROUND(p_confidence * 1.5)::integer);

  INSERT INTO public.market_votes (
    market_id, outcome_id, user_id, confidence, xp_earned, is_anonymous,
    anonymous_participant_id, session_id, rankings, other_text
  )
  VALUES (
    p_market_id, p_outcome_id, NULL, p_confidence, v_xp, true,
    p_participant_id, v_session, v_rankings_col, v_other_col
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

REVOKE ALL ON FUNCTION public.execute_alias_anonymous_market_vote(uuid, uuid, uuid, integer, jsonb, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.execute_alias_anonymous_market_vote(uuid, uuid, uuid, integer, jsonb, text) TO service_role;

COMMENT ON FUNCTION public.execute_market_vote IS
  'Cast a vote. Ranked mode: p_rankings [{outcome_id, rank}] max 3; confidence applies to p_outcome_id (rank 1) only. p_other_text required when Other is selected.';
