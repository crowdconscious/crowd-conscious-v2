-- Phase 0 (UX Product Spec v1): strip XP-for-accuracy / confidence gaming.
--
-- Principle: "The data is sacred (no XP for vote volume/option/confidence)."
-- Correct-prediction bonus scaled with confidence (GREATEST(5, 50*confidence/10)),
-- which paid for being right AND for cranking certainty — pollutes Pulse honesty.
--
-- Keeps:
--   - is_correct flags for analytics / UI match indicators
--   - participation XP on vote cast (prediction_vote) elsewhere
-- Does NOT award:
--   - bonus_xp on correct votes
--   - xp_transactions action_type = 'prediction_correct'
--   - total_xp bumps from accuracy
--
-- Live PARTICIPATION_REVEAL_THRESHOLD (25) is unrelated and untouched.
-- Apply in Supabase before relying on this in production.

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
      v_correct := v_correct + 1;
      -- Mark match for analytics; never pay accuracy/confidence bonus XP.
      UPDATE public.market_votes
      SET is_correct = true, bonus_xp = 0
      WHERE id = v_vote.id;
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
  'Resolve market; set is_correct for analytics. Does NOT award accuracy/confidence bonus XP (Phase 0 sacred-data rule).';

-- Soft-disable accuracy reward row if the catalog table exists.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'xp_rewards'
  ) THEN
    UPDATE public.xp_rewards
    SET xp_amount = 0,
        description = 'RETIRED Phase 0: no XP for correct/accurate votes'
    WHERE action_type = 'prediction_correct';
  END IF;
END $$;
