-- =====================================================
-- PHASE 7: GAMIFICATION FUNCTIONS (PRODUCTION-READY)
-- Complete implementation of all XP and gamification functions
-- =====================================================

BEGIN;

-- =====================================================
-- 1. AWARD XP FUNCTION (Complete Implementation)
-- =====================================================

CREATE OR REPLACE FUNCTION public.award_xp(
  p_user_id UUID,
  p_action_type VARCHAR(50),
  p_action_id UUID DEFAULT NULL,
  p_description TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_xp_amount INTEGER;
  v_new_total_xp INTEGER;
  v_old_tier INTEGER;
  v_new_tier INTEGER;
  v_xp_to_next INTEGER;
  v_tier_progress DECIMAL(5,2);
  v_tier_changed BOOLEAN := FALSE;
  v_result JSONB;
BEGIN
  -- Validate user exists
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'User not found: %', p_user_id;
  END IF;

  -- Get XP amount for this action
  SELECT xp_amount INTO v_xp_amount
  FROM public.xp_rewards
  WHERE action_type = p_action_type;

  IF v_xp_amount IS NULL THEN
    RAISE EXCEPTION 'Unknown action type: %', p_action_type;
  END IF;

  -- Prevent duplicate XP awards for same action (if action_id provided)
  IF p_action_id IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM public.xp_transactions
      WHERE user_id = p_user_id
        AND action_type = p_action_type
        AND action_id = p_action_id
    ) THEN
      -- Return existing transaction info instead of error
      SELECT jsonb_build_object(
        'success', false,
        'message', 'XP already awarded for this action',
        'xp_amount', 0,
        'tier_changed', false
      ) INTO v_result;
      RETURN v_result;
    END IF;
  END IF;

  -- Record transaction
  INSERT INTO public.xp_transactions (user_id, amount, action_type, action_id, description)
  VALUES (p_user_id, v_xp_amount, p_action_type, p_action_id, p_description);

  -- Initialize or update user XP
  INSERT INTO public.user_xp (user_id, total_xp, current_tier, tier_progress, xp_to_next_tier)
  VALUES (p_user_id, v_xp_amount, 1, 0.0, 500)
  ON CONFLICT (user_id) DO UPDATE
  SET
    total_xp = public.user_xp.total_xp + v_xp_amount,
    updated_at = NOW()
  RETURNING total_xp, current_tier INTO v_new_total_xp, v_old_tier;

  -- Calculate new tier
  v_new_tier := public.calculate_tier(v_new_total_xp);

  -- Check if tier changed
  IF v_new_tier > v_old_tier THEN
    v_tier_changed := TRUE;
  END IF;

  -- Calculate progress to next tier
  IF v_new_tier < 5 THEN
    v_xp_to_next := public.xp_for_next_tier(v_new_tier);
    DECLARE
      v_current_tier_xp INTEGER;
      v_tier_xp_range INTEGER;
    BEGIN
      -- Get XP range for current tier
      SELECT 
        CASE v_new_tier
          WHEN 1 THEN 0
          WHEN 2 THEN 501
          WHEN 3 THEN 1501
          WHEN 4 THEN 3501
          ELSE 0
        END INTO v_current_tier_xp;

      v_tier_xp_range := v_xp_to_next - v_current_tier_xp;
      v_tier_progress := LEAST(100.0, GREATEST(0.0, 
        ((v_new_total_xp - v_current_tier_xp)::DECIMAL / v_tier_xp_range::DECIMAL) * 100.0
      ));
    END;
  ELSE
    v_xp_to_next := NULL;
    v_tier_progress := 100.0;
  END IF;

  -- Update tier and progress
  UPDATE public.user_xp
  SET
    current_tier = v_new_tier,
    tier_progress = v_tier_progress,
    xp_to_next_tier = COALESCE(v_xp_to_next, 0),
    updated_at = NOW()
  WHERE user_id = p_user_id;

  -- Update leaderboard
  INSERT INTO public.leaderboards (user_id, total_xp, tier)
  VALUES (p_user_id, v_new_total_xp, v_new_tier)
  ON CONFLICT (user_id) DO UPDATE
  SET
    total_xp = v_new_total_xp,
    tier = v_new_tier,
    updated_at = NOW();

  -- Trigger leaderboard rank update (async via trigger)
  PERFORM public.update_leaderboard_ranks();

  -- Build result object
  v_result := jsonb_build_object(
    'success', TRUE,
    'xp_amount', v_xp_amount,
    'total_xp', v_new_total_xp,
    'old_tier', v_old_tier,
    'new_tier', v_new_tier,
    'tier_changed', v_tier_changed,
    'tier_progress', v_tier_progress,
    'xp_to_next_tier', COALESCE(v_xp_to_next, 0)
  );

  RETURN v_result;
END;
$$;

-- =====================================================
-- 2. CALCULATE TIER PROGRESS FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION public.calculate_tier_progress(
  p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_xp RECORD;
  v_current_tier_xp INTEGER;
  v_next_tier_xp INTEGER;
  v_progress DECIMAL(5,2);
  v_result JSONB;
BEGIN
  SELECT * INTO v_user_xp
  FROM public.user_xp
  WHERE user_id = p_user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'tier', 1,
      'progress', 0.0,
      'xp_to_next', 500,
      'total_xp', 0
    );
  END IF;

  -- Calculate current tier XP threshold
  v_current_tier_xp := CASE v_user_xp.current_tier
    WHEN 1 THEN 0
    WHEN 2 THEN 501
    WHEN 3 THEN 1501
    WHEN 4 THEN 3501
    WHEN 5 THEN 7501
    ELSE 0
  END;

  -- Calculate next tier XP threshold
  v_next_tier_xp := CASE v_user_xp.current_tier
    WHEN 1 THEN 501
    WHEN 2 THEN 1501
    WHEN 3 THEN 3501
    WHEN 4 THEN 7501
    WHEN 5 THEN NULL
    ELSE NULL
  END;

  -- Calculate progress percentage
  IF v_next_tier_xp IS NOT NULL THEN
    v_progress := LEAST(100.0, GREATEST(0.0,
      ((v_user_xp.total_xp - v_current_tier_xp)::DECIMAL / 
       (v_next_tier_xp - v_current_tier_xp)::DECIMAL) * 100.0
    ));
  ELSE
    v_progress := 100.0;
  END IF;

  v_result := jsonb_build_object(
    'tier', v_user_xp.current_tier,
    'progress', v_progress,
    'xp_to_next', COALESCE(v_next_tier_xp - v_user_xp.total_xp, 0),
    'total_xp', v_user_xp.total_xp,
    'current_tier_xp', v_current_tier_xp,
    'next_tier_xp', v_next_tier_xp
  );

  RETURN v_result;
END;
$$;

-- =====================================================
-- 3. CHECK AND UNLOCK ACHIEVEMENTS FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION public.check_achievements(
  p_user_id UUID,
  p_action_type VARCHAR(50),
  p_action_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_xp RECORD;
  v_unlocked_achievements JSONB := '[]'::jsonb;
  v_achievement JSONB;
BEGIN
  -- Get user XP data
  SELECT * INTO v_user_xp
  FROM public.user_xp
  WHERE user_id = p_user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('unlocked', v_unlocked_achievements);
  END IF;

  -- Check for first lesson achievement
  IF p_action_type = 'lesson_completed' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.user_achievements
      WHERE user_id = p_user_id AND achievement_type = 'first_lesson'
    ) THEN
      IF (SELECT COUNT(*) FROM public.xp_transactions
          WHERE user_id = p_user_id AND action_type = 'lesson_completed') = 1 THEN
        INSERT INTO public.user_achievements (
          user_id, achievement_type, achievement_name,
          achievement_description, icon_url
        ) VALUES (
          p_user_id, 'first_lesson', 'First Steps',
          'Completed your first lesson!', '🎯'
        );
        v_achievement := jsonb_build_object(
          'type', 'first_lesson',
          'name', 'First Steps',
          'description', 'Completed your first lesson!',
          'icon', '🎯'
        );
        v_unlocked_achievements := v_unlocked_achievements || jsonb_build_array(v_achievement);
      END IF;
    END IF;
  END IF;

  -- Check for first module achievement
  IF p_action_type = 'module_completed' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.user_achievements
      WHERE user_id = p_user_id AND achievement_type = 'first_module'
    ) THEN
      INSERT INTO public.user_achievements (
        user_id, achievement_type, achievement_name,
        achievement_description, icon_url
      ) VALUES (
        p_user_id, 'first_module', 'Module Master',
        'Completed your first module!', '🏆'
      );
      v_achievement := jsonb_build_object(
        'type', 'first_module',
        'name', 'Module Master',
        'description', 'Completed your first module!',
        'icon', '🏆'
      );
      v_unlocked_achievements := v_unlocked_achievements || jsonb_build_array(v_achievement);
    END IF;
  END IF;

  -- Check for tier achievements
  IF v_user_xp.current_tier >= 2 AND NOT EXISTS (
    SELECT 1 FROM public.user_achievements
    WHERE user_id = p_user_id AND achievement_type = 'tier_contributor'
  ) THEN
    INSERT INTO public.user_achievements (
      user_id, achievement_type, achievement_name,
      achievement_description, icon_url
    ) VALUES (
      p_user_id, 'tier_contributor', 'Contributor',
      'Reached Contributor tier!', '🌊'
    );
    v_achievement := jsonb_build_object(
      'type', 'tier_contributor',
      'name', 'Contributor',
      'description', 'Reached Contributor tier!',
      'icon', '🌊'
    );
    v_unlocked_achievements := v_unlocked_achievements || jsonb_build_array(v_achievement);
  END IF;

  IF v_user_xp.current_tier >= 3 AND NOT EXISTS (
    SELECT 1 FROM public.user_achievements
    WHERE user_id = p_user_id AND achievement_type = 'tier_changemaker'
  ) THEN
    INSERT INTO public.user_achievements (
      user_id, achievement_type, achievement_name,
      achievement_description, icon_url
    ) VALUES (
      p_user_id, 'tier_changemaker', 'Changemaker',
      'Reached Changemaker tier!', '💜'
    );
    v_achievement := jsonb_build_object(
      'type', 'tier_changemaker',
      'name', 'Changemaker',
      'description', 'Reached Changemaker tier!',
      'icon', '💜'
    );
    v_unlocked_achievements := v_unlocked_achievements || jsonb_build_array(v_achievement);
  END IF;

  IF v_user_xp.current_tier >= 4 AND NOT EXISTS (
    SELECT 1 FROM public.user_achievements
    WHERE user_id = p_user_id AND achievement_type = 'tier_impact_leader'
  ) THEN
    INSERT INTO public.user_achievements (
      user_id, achievement_type, achievement_name,
      achievement_description, icon_url
    ) VALUES (
      p_user_id, 'tier_impact_leader', 'Impact Leader',
      'Reached Impact Leader tier!', '⭐'
    );
    v_achievement := jsonb_build_object(
      'type', 'tier_impact_leader',
      'name', 'Impact Leader',
      'description', 'Reached Impact Leader tier!',
      'icon', '⭐'
    );
    v_unlocked_achievements := v_unlocked_achievements || jsonb_build_array(v_achievement);
  END IF;

  IF v_user_xp.current_tier >= 5 AND NOT EXISTS (
    SELECT 1 FROM public.user_achievements
    WHERE user_id = p_user_id AND achievement_type = 'tier_legend'
  ) THEN
    INSERT INTO public.user_achievements (
      user_id, achievement_type, achievement_name,
      achievement_description, icon_url
    ) VALUES (
      p_user_id, 'tier_legend', 'Legend',
      'Reached Legend tier!', '👑'
    );
    v_achievement := jsonb_build_object(
      'type', 'tier_legend',
      'name', 'Legend',
      'description', 'Reached Legend tier!',
      'icon', '👑'
    );
    v_unlocked_achievements := v_unlocked_achievements || jsonb_build_array(v_achievement);
  END IF;

  -- Check for first sponsor achievement
  IF p_action_type = 'sponsor_need' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.user_achievements
      WHERE user_id = p_user_id AND achievement_type = 'first_sponsor'
    ) THEN
      INSERT INTO public.user_achievements (
        user_id, achievement_type, achievement_name,
        achievement_description, icon_url
      ) VALUES (
        p_user_id, 'first_sponsor', 'First Sponsor',
        'Made your first sponsorship!', '💝'
      );
      v_achievement := jsonb_build_object(
        'type', 'first_sponsor',
        'name', 'First Sponsor',
        'description', 'Made your first sponsorship!',
        'icon', '💝'
      );
      v_unlocked_achievements := v_unlocked_achievements || jsonb_build_array(v_achievement);
    END IF;
  END IF;

  RETURN jsonb_build_object('unlocked', v_unlocked_achievements);
END;
$$;

-- =====================================================
-- 4. UPDATE STREAK FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION public.update_user_streak(
  p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_streak RECORD;
  v_today DATE := CURRENT_DATE;
  v_yesterday DATE := CURRENT_DATE - INTERVAL '1 day';
  v_new_streak INTEGER;
  v_streak_bonus INTEGER := 0;
BEGIN
  -- Get or create streak record
  INSERT INTO public.user_streaks (user_id, current_streak, longest_streak, last_activity_date)
  VALUES (p_user_id, 0, 0, NULL)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT * INTO v_streak
  FROM public.user_streaks
  WHERE user_id = p_user_id;

  -- Check if streak should continue or reset
  IF v_streak.last_activity_date IS NULL THEN
    -- First activity
    v_new_streak := 1;
  ELSIF v_streak.last_activity_date = v_yesterday THEN
    -- Continuing streak
    v_new_streak := v_streak.current_streak + 1;
  ELSIF v_streak.last_activity_date = v_today THEN
    -- Already logged in today
    v_new_streak := v_streak.current_streak;
  ELSE
    -- Streak broken, reset to 1
    v_new_streak := 1;
  END IF;

  -- Update longest streak if needed
  IF v_new_streak > v_streak.longest_streak THEN
    UPDATE public.user_streaks
    SET
      current_streak = v_new_streak,
      longest_streak = v_new_streak,
      last_activity_date = v_today,
      updated_at = NOW()
    WHERE user_id = p_user_id;
  ELSE
    UPDATE public.user_streaks
    SET
      current_streak = v_new_streak,
      last_activity_date = v_today,
      updated_at = NOW()
    WHERE user_id = p_user_id;
  END IF;

  -- Award streak bonus XP
  IF v_streak.last_activity_date != v_today THEN
    IF v_new_streak = 7 THEN
      -- 7-day streak bonus
      PERFORM public.award_xp(p_user_id, 'week_streak', NULL, '7-day login streak!');
      v_streak_bonus := 50;
    ELSIF v_new_streak = 30 THEN
      -- 30-day streak bonus
      PERFORM public.award_xp(p_user_id, 'month_streak', NULL, '30-day login streak!');
      v_streak_bonus := 200;
    ELSE
      -- Daily login XP
      PERFORM public.award_xp(p_user_id, 'daily_login', NULL, 'Daily login');
      v_streak_bonus := 10;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'current_streak', v_new_streak,
    'longest_streak', GREATEST(v_new_streak, v_streak.longest_streak),
    'streak_bonus', v_streak_bonus
  );
END;
$$;

-- =====================================================
-- 5. GET LEADERBOARD FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_leaderboard(
  p_limit INTEGER DEFAULT 100,
  p_offset INTEGER DEFAULT 0,
  p_tier_filter INTEGER DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_agg(
    jsonb_build_object(
      'user_id', l.user_id,
      'rank', l.rank,
      'total_xp', l.total_xp,
      'tier', l.tier,
      'profile', jsonb_build_object(
        'full_name', p.full_name,
        'avatar_url', p.avatar_url
      )
    )
    ORDER BY l.rank ASC
  ) INTO v_result
  FROM public.leaderboards l
  LEFT JOIN public.profiles p ON p.id = l.user_id
  WHERE l.rank IS NOT NULL
    AND (p_tier_filter IS NULL OR l.tier = p_tier_filter)
  ORDER BY l.rank ASC
  LIMIT p_limit
  OFFSET p_offset;

  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$;

COMMIT;

