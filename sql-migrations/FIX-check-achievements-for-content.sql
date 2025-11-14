-- ============================================================================
-- FIX: Update check_achievements function to unlock content creation achievements
-- ============================================================================
-- The check_achievements function needs to check for content creation and unlock
-- achievements in the user_achievements table (not user_stats array)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.check_achievements(
  p_user_id UUID,
  p_action_type VARCHAR(50) DEFAULT NULL,
  p_action_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_xp RECORD;
  v_user_stats RECORD;
  v_unlocked_achievements JSONB := '[]'::jsonb;
  v_achievement JSONB;
  v_content_count INTEGER;
  v_vote_count INTEGER;
  v_sponsorship_count INTEGER;
BEGIN
  -- Get user XP data
  SELECT * INTO v_user_xp
  FROM public.user_xp
  WHERE user_id = p_user_id;

  -- Get user stats (for counts)
  SELECT * INTO v_user_stats
  FROM public.user_stats
  WHERE user_id = p_user_id;

  -- Count actual actions from database
  SELECT COUNT(*) INTO v_content_count
  FROM public.community_content
  WHERE created_by = p_user_id;

  SELECT COUNT(*) INTO v_vote_count
  FROM public.votes
  WHERE user_id = p_user_id;

  SELECT COUNT(*) INTO v_sponsorship_count
  FROM public.sponsorships
  WHERE sponsor_id = p_user_id;

  -- ========================================================================
  -- CHECK CONTENT CREATION ACHIEVEMENTS
  -- ========================================================================
  
  -- FIRST_CONTENT (Creator) - Create your first content
  IF v_content_count >= 1 AND NOT EXISTS (
    SELECT 1 FROM public.user_achievements
    WHERE user_id = p_user_id AND achievement_type = 'FIRST_CONTENT'
  ) THEN
    INSERT INTO public.user_achievements (
      user_id, achievement_type, achievement_name,
      achievement_description, icon_url
    ) VALUES (
      p_user_id, 'FIRST_CONTENT', 'Creator',
      'Create your first content', '✨'
    ) ON CONFLICT DO NOTHING;
    
    v_achievement := jsonb_build_object(
      'type', 'FIRST_CONTENT',
      'name', 'Creator',
      'description', 'Create your first content',
      'icon', '✨'
    );
    v_unlocked_achievements := v_unlocked_achievements || jsonb_build_array(v_achievement);
  END IF;

  -- ========================================================================
  -- CHECK VOTING ACHIEVEMENTS
  -- ========================================================================
  
  -- FIRST_VOTE (Voice Heard) - Cast your first vote
  IF v_vote_count >= 1 AND NOT EXISTS (
    SELECT 1 FROM public.user_achievements
    WHERE user_id = p_user_id AND achievement_type = 'FIRST_VOTE'
  ) THEN
    INSERT INTO public.user_achievements (
      user_id, achievement_type, achievement_name,
      achievement_description, icon_url
    ) VALUES (
      p_user_id, 'FIRST_VOTE', 'Voice Heard',
      'Cast your first vote', '🗳️'
    ) ON CONFLICT DO NOTHING;
    
    v_achievement := jsonb_build_object(
      'type', 'FIRST_VOTE',
      'name', 'Voice Heard',
      'description', 'Cast your first vote',
      'icon', '🗳️'
    );
    v_unlocked_achievements := v_unlocked_achievements || jsonb_build_array(v_achievement);
  END IF;

  -- VOTE_50 (Democracy Champion) - Cast 50 votes
  IF v_vote_count >= 50 AND NOT EXISTS (
    SELECT 1 FROM public.user_achievements
    WHERE user_id = p_user_id AND achievement_type = 'VOTE_50'
  ) THEN
    INSERT INTO public.user_achievements (
      user_id, achievement_type, achievement_name,
      achievement_description, icon_url
    ) VALUES (
      p_user_id, 'VOTE_50', 'Democracy Champion',
      'Cast 50 votes', '🏛️'
    ) ON CONFLICT DO NOTHING;
    
    v_achievement := jsonb_build_object(
      'type', 'VOTE_50',
      'name', 'Democracy Champion',
      'description', 'Cast 50 votes',
      'icon', '🏛️'
    );
    v_unlocked_achievements := v_unlocked_achievements || jsonb_build_array(v_achievement);
  END IF;

  -- ========================================================================
  -- CHECK SPONSORSHIP ACHIEVEMENTS
  -- ========================================================================
  
  -- FIRST_SPONSORSHIP (First Contribution) - Make your first sponsorship
  IF v_sponsorship_count >= 1 AND NOT EXISTS (
    SELECT 1 FROM public.user_achievements
    WHERE user_id = p_user_id AND achievement_type = 'FIRST_SPONSORSHIP'
  ) THEN
    INSERT INTO public.user_achievements (
      user_id, achievement_type, achievement_name,
      achievement_description, icon_url
    ) VALUES (
      p_user_id, 'FIRST_SPONSORSHIP', 'First Contribution',
      'Make your first sponsorship', '💝'
    ) ON CONFLICT DO NOTHING;
    
    v_achievement := jsonb_build_object(
      'type', 'FIRST_SPONSORSHIP',
      'name', 'First Contribution',
      'description', 'Make your first sponsorship',
      'icon', '💝'
    );
    v_unlocked_achievements := v_unlocked_achievements || jsonb_build_array(v_achievement);
  END IF;

  -- SPONSOR_10 (Generous Giver) - Make 10 sponsorships
  IF v_sponsorship_count >= 10 AND NOT EXISTS (
    SELECT 1 FROM public.user_achievements
    WHERE user_id = p_user_id AND achievement_type = 'SPONSOR_10'
  ) THEN
    INSERT INTO public.user_achievements (
      user_id, achievement_type, achievement_name,
      achievement_description, icon_url
    ) VALUES (
      p_user_id, 'SPONSOR_10', 'Generous Giver',
      'Make 10 sponsorships', '🎁'
    ) ON CONFLICT DO NOTHING;
    
    v_achievement := jsonb_build_object(
      'type', 'SPONSOR_10',
      'name', 'Generous Giver',
      'description', 'Make 10 sponsorships',
      'icon', '🎁'
    );
    v_unlocked_achievements := v_unlocked_achievements || jsonb_build_array(v_achievement);
  END IF;

  -- ========================================================================
  -- CHECK TIER ACHIEVEMENTS
  -- ========================================================================
  
  IF v_user_xp IS NOT NULL THEN
    -- TIER_2 (Contributor)
    IF v_user_xp.current_tier >= 2 AND NOT EXISTS (
      SELECT 1 FROM public.user_achievements
      WHERE user_id = p_user_id AND achievement_type = 'TIER_2'
    ) THEN
      INSERT INTO public.user_achievements (
        user_id, achievement_type, achievement_name,
        achievement_description, icon_url
      ) VALUES (
        p_user_id, 'TIER_2', 'Contributor',
        'Reach Contributor tier', '🌊'
      ) ON CONFLICT DO NOTHING;
    END IF;

    -- TIER_3 (Changemaker)
    IF v_user_xp.current_tier >= 3 AND NOT EXISTS (
      SELECT 1 FROM public.user_achievements
      WHERE user_id = p_user_id AND achievement_type = 'TIER_3'
    ) THEN
      INSERT INTO public.user_achievements (
        user_id, achievement_type, achievement_name,
        achievement_description, icon_url
      ) VALUES (
        p_user_id, 'TIER_3', 'Changemaker',
        'Reach Changemaker tier', '💜'
      ) ON CONFLICT DO NOTHING;
    END IF;

    -- TIER_4 (Impact Leader)
    IF v_user_xp.current_tier >= 4 AND NOT EXISTS (
      SELECT 1 FROM public.user_achievements
      WHERE user_id = p_user_id AND achievement_type = 'TIER_4'
    ) THEN
      INSERT INTO public.user_achievements (
        user_id, achievement_type, achievement_name,
        achievement_description, icon_url
      ) VALUES (
        p_user_id, 'TIER_4', 'Impact Leader',
        'Reach Impact Leader tier', '⭐'
      ) ON CONFLICT DO NOTHING;
    END IF;

    -- TIER_5 (Legend)
    IF v_user_xp.current_tier >= 5 AND NOT EXISTS (
      SELECT 1 FROM public.user_achievements
      WHERE user_id = p_user_id AND achievement_type = 'TIER_5'
    ) THEN
      INSERT INTO public.user_achievements (
        user_id, achievement_type, achievement_name,
        achievement_description, icon_url
      ) VALUES (
        p_user_id, 'TIER_5', 'Legend',
        'Reach Legend tier', '👑'
      ) ON CONFLICT DO NOTHING;
    END IF;
  END IF;

  RETURN jsonb_build_object('unlocked', v_unlocked_achievements);
END;
$$;

-- Update trigger to pass action_type
CREATE OR REPLACE FUNCTION trigger_content_xp()
RETURNS TRIGGER AS $$
BEGIN
  -- Award XP for creating content (XP amount comes from xp_rewards table)
  PERFORM public.award_xp(
    NEW.created_by, 
    'create_content',  -- Action type (must match xp_rewards table)
    NEW.id,            -- Action ID (content ID)
    'Created ' || COALESCE(NEW.type, 'content') || ': ' || COALESCE(NEW.title, 'Untitled')
  );
  
  -- Update content count in user stats
  UPDATE public.user_stats 
  SET content_created = content_created + 1,
      updated_at = NOW()
  WHERE user_id = NEW.created_by;
  
  -- Update streak and check achievements (pass action_type)
  PERFORM public.update_user_streak(NEW.created_by);
  PERFORM public.check_achievements(NEW.created_by, 'create_content', NEW.id);
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the insert
    RAISE WARNING 'Error in trigger_content_xp: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_content_xp ON public.community_content;
CREATE TRIGGER trigger_content_xp
  AFTER INSERT ON public.community_content
  FOR EACH ROW
  EXECUTE FUNCTION trigger_content_xp();

-- Update vote trigger to pass action_type
CREATE OR REPLACE FUNCTION trigger_vote_xp()
RETURNS TRIGGER AS $$
BEGIN
  -- Award XP for voting (XP amount comes from xp_rewards table)
  PERFORM public.award_xp(
    NEW.user_id, 
    'vote_content',  -- Action type (must match xp_rewards table)
    NEW.content_id, -- Action ID (content ID)
    'Voted on content'
  );
  
  -- Update vote count in user stats
  UPDATE public.user_stats 
  SET votes_cast = votes_cast + 1,
      updated_at = NOW()
  WHERE user_id = NEW.user_id;
  
  -- Update streak and check achievements (pass action_type)
  PERFORM public.update_user_streak(NEW.user_id);
  PERFORM public.check_achievements(NEW.user_id, 'vote_content', NEW.content_id);
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error in trigger_vote_xp: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_vote_xp ON public.votes;
CREATE TRIGGER trigger_vote_xp
  AFTER INSERT ON public.votes
  FOR EACH ROW
  EXECUTE FUNCTION trigger_vote_xp();

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.check_achievements TO authenticated;
GRANT EXECUTE ON FUNCTION trigger_content_xp TO authenticated;
GRANT EXECUTE ON FUNCTION trigger_vote_xp TO authenticated;

