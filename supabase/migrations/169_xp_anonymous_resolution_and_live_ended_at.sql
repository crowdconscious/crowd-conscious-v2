-- XP for anonymous voters on market resolution + live_events.ended_at

-- 1) xp_transactions: anonymous resolution bonuses
ALTER TABLE public.xp_transactions
  ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE public.xp_transactions
  ADD COLUMN IF NOT EXISTS anonymous_participant_id uuid
  REFERENCES public.anonymous_participants(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_xp_transactions_anon_participant
  ON public.xp_transactions (anonymous_participant_id)
  WHERE anonymous_participant_id IS NOT NULL;

COMMENT ON COLUMN public.xp_transactions.anonymous_participant_id IS
  'Bonus XP for anonymous/alias votes when user_id is NULL (e.g. market resolution).';

-- 2) live_events: when the event was ended
ALTER TABLE public.live_events
  ADD COLUMN IF NOT EXISTS ended_at timestamptz;

COMMENT ON COLUMN public.live_events.ended_at IS 'Set when status becomes completed.';

-- 3) resolve_market_free: award XP to registered users OR anonymous participants
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

      UPDATE public.market_votes
      SET is_correct = true, bonus_xp = v_bonus
      WHERE id = v_vote.id;

      IF v_vote.user_id IS NOT NULL THEN
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
      ELSIF v_vote.anonymous_participant_id IS NOT NULL THEN
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

COMMENT ON FUNCTION public.resolve_market_free IS 'Resolve market; award bonus XP to registered or anonymous voters.';
