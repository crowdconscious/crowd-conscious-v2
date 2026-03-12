-- ============================================================================
-- RUN IN SUPABASE SQL EDITOR
-- ============================================================================
-- Copy this ENTIRE file and paste into Supabase Dashboard → SQL Editor → New query
-- Then click Run (or Cmd/Ctrl+Enter)
-- ============================================================================

-- ========== STEP 1: Notifications (fixes column "link" does not exist) ==========
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS link TEXT;

-- ========== STEP 2: Achievements (Voice Heard, Active Predictor, Fund Voice, etc.) ==========
CREATE OR REPLACE FUNCTION public.check_achievements(
  p_user_id UUID,
  p_action_type VARCHAR(50) DEFAULT NULL,
  p_action_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_xp RECORD;
  v_unlocked_achievements JSONB := '[]'::jsonb;
  v_achievement JSONB;
  v_content_count INTEGER;
  v_market_vote_count INTEGER;
  v_fund_vote_cycles INTEGER;
  v_correct_predictions INTEGER;
  v_sponsorship_count INTEGER;
BEGIN
  SELECT * INTO v_user_xp FROM public.user_xp WHERE user_id = p_user_id;
  SELECT COUNT(*) INTO v_market_vote_count FROM public.market_votes WHERE user_id = p_user_id;
  SELECT COUNT(*) INTO v_correct_predictions FROM public.market_votes WHERE user_id = p_user_id AND is_correct = true;
  SELECT COUNT(DISTINCT cycle) INTO v_fund_vote_cycles FROM public.fund_votes WHERE user_id = p_user_id;
  v_content_count := 0;
  BEGIN
    SELECT COUNT(*) INTO v_content_count FROM public.community_content WHERE created_by = p_user_id;
  EXCEPTION WHEN OTHERS THEN
    v_content_count := 0;
  END;
  v_sponsorship_count := 0;
  BEGIN
    SELECT COUNT(*) INTO v_sponsorship_count FROM public.sponsorships WHERE sponsor_id = p_user_id;
  EXCEPTION WHEN OTHERS THEN
    v_sponsorship_count := 0;
  END;

  IF v_market_vote_count >= 1 AND NOT EXISTS (SELECT 1 FROM public.user_achievements WHERE user_id = p_user_id AND achievement_type = 'FIRST_VOTE') THEN
    INSERT INTO public.user_achievements (user_id, achievement_type, achievement_name, achievement_description, icon_url)
    VALUES (p_user_id, 'FIRST_VOTE', 'Voice Heard', 'Cast your first prediction', '🗳️') ON CONFLICT (user_id, achievement_type) DO NOTHING;
  END IF;
  IF v_market_vote_count >= 10 AND NOT EXISTS (SELECT 1 FROM public.user_achievements WHERE user_id = p_user_id AND achievement_type = 'VOTE_10') THEN
    INSERT INTO public.user_achievements (user_id, achievement_type, achievement_name, achievement_description, icon_url)
    VALUES (p_user_id, 'VOTE_10', 'Active Predictor', 'Make 10 predictions', '📊') ON CONFLICT (user_id, achievement_type) DO NOTHING;
  END IF;
  IF v_market_vote_count >= 50 AND NOT EXISTS (SELECT 1 FROM public.user_achievements WHERE user_id = p_user_id AND achievement_type = 'VOTE_50') THEN
    INSERT INTO public.user_achievements (user_id, achievement_type, achievement_name, achievement_description, icon_url)
    VALUES (p_user_id, 'VOTE_50', 'Democracy Champion', 'Cast 50 predictions', '🏛️') ON CONFLICT (user_id, achievement_type) DO NOTHING;
  END IF;
  IF v_fund_vote_cycles >= 1 AND NOT EXISTS (SELECT 1 FROM public.user_achievements WHERE user_id = p_user_id AND achievement_type = 'FIRST_FUND_VOTE') THEN
    INSERT INTO public.user_achievements (user_id, achievement_type, achievement_name, achievement_description, icon_url)
    VALUES (p_user_id, 'FIRST_FUND_VOTE', 'Fund Voice', 'Vote for your first cause in the Conscious Fund', '💚') ON CONFLICT (user_id, achievement_type) DO NOTHING;
  END IF;
  IF v_fund_vote_cycles >= 5 AND NOT EXISTS (SELECT 1 FROM public.user_achievements WHERE user_id = p_user_id AND achievement_type = 'FUND_CHAMPION') THEN
    INSERT INTO public.user_achievements (user_id, achievement_type, achievement_name, achievement_description, icon_url)
    VALUES (p_user_id, 'FUND_CHAMPION', 'Fund Champion', 'Vote for causes across 5 different months', '🌍') ON CONFLICT (user_id, achievement_type) DO NOTHING;
  END IF;
  IF v_correct_predictions >= 1 AND NOT EXISTS (SELECT 1 FROM public.user_achievements WHERE user_id = p_user_id AND achievement_type = 'FIRST_CORRECT') THEN
    INSERT INTO public.user_achievements (user_id, achievement_type, achievement_name, achievement_description, icon_url)
    VALUES (p_user_id, 'FIRST_CORRECT', 'Sharp Insight', 'Get your first correct prediction', '🎯') ON CONFLICT (user_id, achievement_type) DO NOTHING;
  END IF;
  IF v_correct_predictions >= 10 AND NOT EXISTS (SELECT 1 FROM public.user_achievements WHERE user_id = p_user_id AND achievement_type = 'CORRECT_10') THEN
    INSERT INTO public.user_achievements (user_id, achievement_type, achievement_name, achievement_description, icon_url)
    VALUES (p_user_id, 'CORRECT_10', 'Accurate Mind', 'Get 10 correct predictions', '✨') ON CONFLICT (user_id, achievement_type) DO NOTHING;
  END IF;
  IF v_content_count >= 1 AND NOT EXISTS (SELECT 1 FROM public.user_achievements WHERE user_id = p_user_id AND achievement_type = 'FIRST_CONTENT') THEN
    INSERT INTO public.user_achievements (user_id, achievement_type, achievement_name, achievement_description, icon_url)
    VALUES (p_user_id, 'FIRST_CONTENT', 'Creator', 'Create your first content', '✨') ON CONFLICT (user_id, achievement_type) DO NOTHING;
  END IF;
  IF v_sponsorship_count >= 1 AND NOT EXISTS (SELECT 1 FROM public.user_achievements WHERE user_id = p_user_id AND achievement_type = 'FIRST_SPONSORSHIP') THEN
    INSERT INTO public.user_achievements (user_id, achievement_type, achievement_name, achievement_description, icon_url)
    VALUES (p_user_id, 'FIRST_SPONSORSHIP', 'First Contribution', 'Make your first sponsorship', '💝') ON CONFLICT (user_id, achievement_type) DO NOTHING;
  END IF;
  IF v_sponsorship_count >= 10 AND NOT EXISTS (SELECT 1 FROM public.user_achievements WHERE user_id = p_user_id AND achievement_type = 'SPONSOR_10') THEN
    INSERT INTO public.user_achievements (user_id, achievement_type, achievement_name, achievement_description, icon_url)
    VALUES (p_user_id, 'SPONSOR_10', 'Generous Giver', 'Make 10 sponsorships', '🎁') ON CONFLICT (user_id, achievement_type) DO NOTHING;
  END IF;
  IF v_user_xp IS NOT NULL THEN
    IF v_user_xp.current_tier >= 2 AND NOT EXISTS (SELECT 1 FROM public.user_achievements WHERE user_id = p_user_id AND achievement_type = 'TIER_2') THEN
      INSERT INTO public.user_achievements (user_id, achievement_type, achievement_name, achievement_description, icon_url)
      VALUES (p_user_id, 'TIER_2', 'Contributor', 'Reach Contributor tier', '🌊') ON CONFLICT (user_id, achievement_type) DO NOTHING;
    END IF;
    IF v_user_xp.current_tier >= 3 AND NOT EXISTS (SELECT 1 FROM public.user_achievements WHERE user_id = p_user_id AND achievement_type = 'TIER_3') THEN
      INSERT INTO public.user_achievements (user_id, achievement_type, achievement_name, achievement_description, icon_url)
      VALUES (p_user_id, 'TIER_3', 'Changemaker', 'Reach Changemaker tier', '💜') ON CONFLICT (user_id, achievement_type) DO NOTHING;
    END IF;
    IF v_user_xp.current_tier >= 4 AND NOT EXISTS (SELECT 1 FROM public.user_achievements WHERE user_id = p_user_id AND achievement_type = 'TIER_4') THEN
      INSERT INTO public.user_achievements (user_id, achievement_type, achievement_name, achievement_description, icon_url)
      VALUES (p_user_id, 'TIER_4', 'Impact Leader', 'Reach Impact Leader tier', '⭐') ON CONFLICT (user_id, achievement_type) DO NOTHING;
    END IF;
    IF v_user_xp.current_tier >= 5 AND NOT EXISTS (SELECT 1 FROM public.user_achievements WHERE user_id = p_user_id AND achievement_type = 'TIER_5') THEN
      INSERT INTO public.user_achievements (user_id, achievement_type, achievement_name, achievement_description, icon_url)
      VALUES (p_user_id, 'TIER_5', 'Legend', 'Reach Legend tier', '👑') ON CONFLICT (user_id, achievement_type) DO NOTHING;
    END IF;
  END IF;
  RETURN jsonb_build_object('unlocked', v_unlocked_achievements);
END;
$$;

CREATE OR REPLACE FUNCTION public.execute_market_vote(
  p_user_id uuid, p_market_id uuid, p_outcome_id uuid, p_confidence integer
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
BEGIN
  SELECT * INTO v_market FROM public.prediction_markets WHERE id = p_market_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Market not found'); END IF;
  IF v_market.status NOT IN ('active', 'trading') THEN RETURN jsonb_build_object('success', false, 'error', 'Market is not active'); END IF;
  SELECT * INTO v_outcome FROM public.market_outcomes WHERE id = p_outcome_id AND market_id = p_market_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Invalid outcome for this market'); END IF;
  SELECT * INTO v_existing FROM public.market_votes WHERE market_id = p_market_id AND user_id = p_user_id;
  IF FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'You already voted on this market'); END IF;
  IF p_confidence < 1 OR p_confidence > 10 THEN RETURN jsonb_build_object('success', false, 'error', 'Confidence must be 1-10'); END IF;
  v_xp := 5 + (p_confidence - 1);
  INSERT INTO public.market_votes (market_id, outcome_id, user_id, confidence, xp_earned)
  VALUES (p_market_id, p_outcome_id, p_user_id, p_confidence, v_xp) RETURNING id INTO v_vote_id;
  UPDATE public.market_outcomes SET vote_count = vote_count + 1, total_confidence = total_confidence + p_confidence WHERE id = p_outcome_id;
  UPDATE public.prediction_markets SET total_votes = COALESCE(total_votes, 0) + 1, updated_at = now() WHERE id = p_market_id;
  SELECT SUM(total_confidence) INTO v_total_weight FROM public.market_outcomes WHERE market_id = p_market_id;
  IF v_total_weight > 0 THEN
    FOR v_outcome_rec IN SELECT id, total_confidence FROM public.market_outcomes WHERE market_id = p_market_id
    LOOP
      UPDATE public.market_outcomes SET probability = v_outcome_rec.total_confidence::numeric / v_total_weight WHERE id = v_outcome_rec.id;
    END LOOP;
  END IF;
  IF COALESCE(v_market.market_type, 'binary') = 'binary' THEN
    UPDATE public.prediction_markets SET current_probability = COALESCE((SELECT probability * 100 FROM public.market_outcomes WHERE market_id = p_market_id AND LOWER(label) IN ('yes', 'sí', 'si') LIMIT 1), 50) WHERE id = p_market_id;
  ELSE
    UPDATE public.prediction_markets SET current_probability = COALESCE((SELECT MAX(probability) * 100 FROM public.market_outcomes WHERE market_id = p_market_id), 50) WHERE id = p_market_id;
  END IF;
  INSERT INTO public.prediction_market_history (market_id, probability, volume_24h, trade_count)
  VALUES (p_market_id, (SELECT probability * 100 FROM public.market_outcomes WHERE id = p_outcome_id), 0, (SELECT total_votes FROM public.prediction_markets WHERE id = p_market_id));
  INSERT INTO public.xp_transactions (user_id, amount, action_type, action_id, description)
  VALUES (p_user_id, v_xp, 'prediction_vote', v_vote_id, 'Predicted: ' || LEFT(v_outcome.label, 30) || ' on ' || LEFT(v_market.title, 40));
  INSERT INTO public.user_xp (user_id, total_xp, current_tier, tier_progress, xp_to_next_tier)
  VALUES (p_user_id, v_xp, 1, 0.0, 500) ON CONFLICT (user_id) DO UPDATE SET total_xp = public.user_xp.total_xp + v_xp, updated_at = now();
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'leaderboards') THEN
    INSERT INTO public.leaderboards (user_id, total_xp, tier) SELECT p_user_id, ux.total_xp, ux.current_tier FROM public.user_xp ux WHERE ux.user_id = p_user_id
    ON CONFLICT (user_id) DO UPDATE SET total_xp = EXCLUDED.total_xp, tier = EXCLUDED.tier, updated_at = now();
  END IF;
  PERFORM public.check_achievements(p_user_id, 'prediction_vote', v_vote_id);
  RETURN jsonb_build_object('success', true, 'vote_id', v_vote_id, 'xp_earned', v_xp, 'outcome_label', v_outcome.label, 'new_probability', (SELECT probability FROM public.market_outcomes WHERE id = p_outcome_id), 'confidence', p_confidence);
END;
$$;

COMMENT ON FUNCTION public.check_achievements IS 'Check and unlock achievements based on market_votes, fund_votes, content, sponsorships, tier';
COMMENT ON FUNCTION public.execute_market_vote IS 'Cast a vote on a market outcome (free-to-play). Calls check_achievements after vote.';
