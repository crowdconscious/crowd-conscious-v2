-- ============================================================================
-- EMERGENCY FIX: Vote API failing with "relation public.community_content does not exist"
-- ============================================================================
-- The check_achievements function (called by execute_market_vote on every vote)
-- queries community_content, which was deleted. This wraps that query in an
-- exception handler so voting works even when community_content doesn't exist.
--
-- RUN IN SUPABASE SQL EDITOR: Copy this entire block and Run.
-- ============================================================================

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

COMMENT ON FUNCTION public.check_achievements IS 'Check and unlock achievements based on market_votes, fund_votes, content, sponsorships, tier. Handles missing tables (community_content, sponsorships).';
