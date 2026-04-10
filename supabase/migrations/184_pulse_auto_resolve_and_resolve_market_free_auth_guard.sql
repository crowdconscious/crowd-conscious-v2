-- 1) resolve_market_free: only insert xp_transactions when user_id exists in auth.users
--    (orphaned votes from deleted accounts no longer violate xp_transactions_user_id_fkey)
-- 2) resolve_pulse_market_by_plurality: pick winning outcome by vote count (ties: sort_order, probability, id)

CREATE OR REPLACE FUNCTION public.resolve_market_free(
  p_market_id uuid,
  p_winning_outcome_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_vote RECORD;
  v_bonus integer;
  v_correct integer := 0;
  v_total integer := 0;
  v_winning_label text;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.market_outcomes
    WHERE id = p_winning_outcome_id AND market_id = p_market_id
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid outcome');
  END IF;

  SELECT label INTO v_winning_label FROM public.market_outcomes WHERE id = p_winning_outcome_id;

  UPDATE public.prediction_markets
  SET status = 'resolved',
      resolution = v_winning_label,
      resolved_outcome = (v_winning_label ILIKE 'yes' OR v_winning_label ILIKE 'sí' OR v_winning_label ILIKE 'si'),
      resolved_at = now(),
      updated_at = now()
  WHERE id = p_market_id;

  UPDATE public.market_outcomes SET is_winner = true WHERE id = p_winning_outcome_id;
  UPDATE public.market_outcomes SET is_winner = false
  WHERE market_id = p_market_id AND id != p_winning_outcome_id;

  FOR v_vote IN
    SELECT * FROM public.market_votes WHERE market_id = p_market_id
  LOOP
    v_total := v_total + 1;

    IF v_vote.outcome_id = p_winning_outcome_id THEN
      v_bonus := GREATEST(5, (50 * v_vote.confidence) / 10);
      v_correct := v_correct + 1;

      IF v_vote.user_id IS NOT NULL AND EXISTS (SELECT 1 FROM auth.users WHERE id = v_vote.user_id) THEN
        UPDATE public.market_votes
        SET is_correct = true, bonus_xp = v_bonus
        WHERE id = v_vote.id;

        INSERT INTO public.xp_transactions (user_id, amount, action_type, action_id, description)
        VALUES (v_vote.user_id, v_bonus, 'prediction_correct', v_vote.id, 'Correct prediction! Bonus XP');

        UPDATE public.user_xp
        SET total_xp = total_xp + v_bonus, updated_at = now()
        WHERE user_id = v_vote.user_id;

        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'leaderboards') THEN
          UPDATE public.leaderboards
          SET total_xp = total_xp + v_bonus, updated_at = now()
          WHERE user_id = v_vote.user_id;
        END IF;
      ELSIF v_vote.user_id IS NOT NULL THEN
        UPDATE public.market_votes
        SET is_correct = true, bonus_xp = 0
        WHERE id = v_vote.id;
      ELSIF v_vote.anonymous_participant_id IS NOT NULL THEN
        UPDATE public.market_votes
        SET is_correct = true, bonus_xp = v_bonus
        WHERE id = v_vote.id;

        INSERT INTO public.xp_transactions (
          user_id,
          anonymous_participant_id,
          amount,
          action_type,
          action_id,
          description
        )
        VALUES (
          NULL,
          v_vote.anonymous_participant_id,
          v_bonus,
          'prediction_correct',
          v_vote.id,
          'Correct prediction! Bonus XP'
        );

        UPDATE public.anonymous_participants
        SET total_xp = total_xp + v_bonus, last_active_at = now()
        WHERE id = v_vote.anonymous_participant_id;
      ELSE
        UPDATE public.market_votes
        SET is_correct = true, bonus_xp = 0
        WHERE id = v_vote.id;
      END IF;
    ELSE
      UPDATE public.market_votes
      SET is_correct = false, bonus_xp = 0
      WHERE id = v_vote.id;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'total_voters', v_total,
    'correct_voters', v_correct,
    'winning_outcome', v_winning_label
  );
END;
$$;

COMMENT ON FUNCTION public.resolve_market_free IS
  'Resolve market; award bonus XP to registered (auth.users) or anonymous voters. Skips XP for orphaned user_id.';

CREATE OR REPLACE FUNCTION public.resolve_pulse_market_by_plurality(p_market_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_winning uuid;
  v_pm RECORD;
  v_base jsonb;
BEGIN
  SELECT id, status, is_pulse, archived_at, resolution_date
  INTO v_pm
  FROM public.prediction_markets
  WHERE id = p_market_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Market not found');
  END IF;

  IF COALESCE(v_pm.is_pulse, false) = false THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not a Pulse market');
  END IF;

  IF v_pm.status NOT IN ('active', 'trading') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Market not open for resolution');
  END IF;

  IF v_pm.archived_at IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Market archived');
  END IF;

  IF v_pm.resolution_date > now() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Resolution date not reached');
  END IF;

  WITH counts AS (
    SELECT outcome_id, COUNT(*)::bigint AS c
    FROM public.market_votes
    WHERE market_id = p_market_id
    GROUP BY outcome_id
  )
  SELECT mo.id INTO v_winning
  FROM public.market_outcomes mo
  LEFT JOIN counts c ON c.outcome_id = mo.id
  WHERE mo.market_id = p_market_id
  ORDER BY COALESCE(c.c, 0) DESC, mo.sort_order ASC NULLS LAST, mo.probability DESC NULLS LAST, mo.id ASC
  LIMIT 1;

  IF v_winning IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No outcomes');
  END IF;

  v_base := public.resolve_market_free(p_market_id, v_winning);
  RETURN v_base || jsonb_build_object('winning_outcome_id', v_winning);
END;
$$;

COMMENT ON FUNCTION public.resolve_pulse_market_by_plurality IS
  'Pulse markets only: resolve to plurality winner (market_votes), tie-break sort_order then probability.';
