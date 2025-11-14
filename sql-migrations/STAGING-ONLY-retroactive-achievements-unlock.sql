-- ============================================================================
-- RETROACTIVE ACHIEVEMENT UNLOCK MIGRATION
-- ============================================================================
-- This script retroactively unlocks achievements for all users based on their
-- past actions (completed modules, lessons, votes, sponsorships, etc.)
--
-- IMPORTANT: Run this in STAGING first to verify results before production!
-- ============================================================================

DO $$
DECLARE
  v_user RECORD;
  v_modules_completed INTEGER;
  v_lessons_completed INTEGER;
  v_votes_cast INTEGER;
  v_sponsorships_made INTEGER;
  v_content_created INTEGER;
  v_total_xp INTEGER;
  v_current_tier INTEGER;
  v_achievements_unlocked INTEGER := 0;
  v_achievement_exists BOOLEAN;
BEGIN
  RAISE NOTICE 'Starting retroactive achievement unlock migration...';
  RAISE NOTICE 'Timestamp: %', NOW();

  -- Loop through all users
  FOR v_user IN 
    SELECT DISTINCT id FROM auth.users
  LOOP
    v_achievements_unlocked := 0;

    -- Count completed modules (course_enrollments with completed=true)
    SELECT COUNT(DISTINCT ce.module_id) INTO v_modules_completed
    FROM public.course_enrollments ce
    WHERE ce.user_id = v_user.id
      AND ce.completed = true;

    -- Count completed lessons (use completion_percentage as proxy - 100% = all lessons completed)
    -- For now, we'll estimate: if module is completed, count it as lessons completed
    -- This is a simplified approach since we don't have individual lesson tracking
    SELECT COUNT(*) INTO v_lessons_completed
    FROM public.course_enrollments ce
    WHERE ce.user_id = v_user.id
      AND ce.completed = true;

    -- Count votes cast
    SELECT COUNT(*) INTO v_votes_cast
    FROM public.votes v
    WHERE v.user_id = v_user.id;

    -- Count sponsorships made
    SELECT COUNT(*) INTO v_sponsorships_made
    FROM public.sponsorships s
    WHERE s.user_id = v_user.id;

    -- Count content created
    SELECT COUNT(*) INTO v_content_created
    FROM public.community_content cc
    WHERE cc.user_id = v_user.id;

    -- Get total XP and tier
    SELECT COALESCE(ux.total_xp, 0), COALESCE(ux.current_tier, 1)
    INTO v_total_xp, v_current_tier
    FROM public.user_xp ux
    WHERE ux.user_id = v_user.id;

    -- If no XP record exists, try user_stats
    IF v_total_xp IS NULL THEN
      SELECT COALESCE(us.total_xp, 0), 
             CASE 
               WHEN COALESCE(us.total_xp, 0) >= 7501 THEN 5
               WHEN COALESCE(us.total_xp, 0) >= 3501 THEN 4
               WHEN COALESCE(us.total_xp, 0) >= 1501 THEN 3
               WHEN COALESCE(us.total_xp, 0) >= 501 THEN 2
               ELSE 1
             END
      INTO v_total_xp, v_current_tier
      FROM public.user_stats us
      WHERE us.user_id = v_user.id;
    END IF;

    -- Default values if still null
    v_total_xp := COALESCE(v_total_xp, 0);
    v_current_tier := COALESCE(v_current_tier, 1);

    -- ========================================================================
    -- UNLOCK ACHIEVEMENTS BASED ON ACTIONS
    -- ========================================================================

    -- FIRST_LESSON_COMPLETED
    IF v_lessons_completed >= 1 THEN
      SELECT EXISTS(
        SELECT 1 FROM public.user_achievements
        WHERE user_id = v_user.id AND achievement_type = 'FIRST_LESSON_COMPLETED'
      ) INTO v_achievement_exists;
      
      IF NOT v_achievement_exists THEN
        INSERT INTO public.user_achievements (
          user_id, achievement_type, achievement_name, achievement_description, icon_url
        ) VALUES (
          v_user.id, 'FIRST_LESSON_COMPLETED', 'Getting Started', 
          'Complete your first lesson', '📚'
        ) ON CONFLICT DO NOTHING;
        v_achievements_unlocked := v_achievements_unlocked + 1;
      END IF;
    END IF;

    -- FIRST_MODULE_COMPLETED
    IF v_modules_completed >= 1 THEN
      SELECT EXISTS(
        SELECT 1 FROM public.user_achievements
        WHERE user_id = v_user.id AND achievement_type = 'FIRST_MODULE_COMPLETED'
      ) INTO v_achievement_exists;
      
      IF NOT v_achievement_exists THEN
        INSERT INTO public.user_achievements (
          user_id, achievement_type, achievement_name, achievement_description, icon_url
        ) VALUES (
          v_user.id, 'FIRST_MODULE_COMPLETED', 'First Steps', 
          'Complete your first module', '🌱'
        ) ON CONFLICT DO NOTHING;
        v_achievements_unlocked := v_achievements_unlocked + 1;
      END IF;
    END IF;

    -- MODULE_5 (Knowledge Seeker)
    IF v_modules_completed >= 5 THEN
      SELECT EXISTS(
        SELECT 1 FROM public.user_achievements
        WHERE user_id = v_user.id AND achievement_type = 'MODULE_5'
      ) INTO v_achievement_exists;
      
      IF NOT v_achievement_exists THEN
        INSERT INTO public.user_achievements (
          user_id, achievement_type, achievement_name, achievement_description, icon_url
        ) VALUES (
          v_user.id, 'MODULE_5', 'Knowledge Seeker', 
          'Complete 5 modules', '📖'
        ) ON CONFLICT DO NOTHING;
        v_achievements_unlocked := v_achievements_unlocked + 1;
      END IF;
    END IF;

    -- MODULE_10 (Master Learner)
    IF v_modules_completed >= 10 THEN
      SELECT EXISTS(
        SELECT 1 FROM public.user_achievements
        WHERE user_id = v_user.id AND achievement_type = 'MODULE_10'
      ) INTO v_achievement_exists;
      
      IF NOT v_achievement_exists THEN
        INSERT INTO public.user_achievements (
          user_id, achievement_type, achievement_name, achievement_description, icon_url
        ) VALUES (
          v_user.id, 'MODULE_10', 'Master Learner', 
          'Complete 10 modules', '🎓'
        ) ON CONFLICT DO NOTHING;
        v_achievements_unlocked := v_achievements_unlocked + 1;
      END IF;
    END IF;

    -- FIRST_VOTE (Voice Heard)
    IF v_votes_cast >= 1 THEN
      SELECT EXISTS(
        SELECT 1 FROM public.user_achievements
        WHERE user_id = v_user.id AND achievement_type = 'FIRST_VOTE'
      ) INTO v_achievement_exists;
      
      IF NOT v_achievement_exists THEN
        INSERT INTO public.user_achievements (
          user_id, achievement_type, achievement_name, achievement_description, icon_url
        ) VALUES (
          v_user.id, 'FIRST_VOTE', 'Voice Heard', 
          'Cast your first vote', '🗳️'
        ) ON CONFLICT DO NOTHING;
        v_achievements_unlocked := v_achievements_unlocked + 1;
      END IF;
    END IF;

    -- VOTE_50 (Democracy Champion)
    IF v_votes_cast >= 50 THEN
      SELECT EXISTS(
        SELECT 1 FROM public.user_achievements
        WHERE user_id = v_user.id AND achievement_type = 'VOTE_50'
      ) INTO v_achievement_exists;
      
      IF NOT v_achievement_exists THEN
        INSERT INTO public.user_achievements (
          user_id, achievement_type, achievement_name, achievement_description, icon_url
        ) VALUES (
          v_user.id, 'VOTE_50', 'Democracy Champion', 
          'Cast 50 votes', '🏛️'
        ) ON CONFLICT DO NOTHING;
        v_achievements_unlocked := v_achievements_unlocked + 1;
      END IF;
    END IF;

    -- FIRST_SPONSORSHIP (First Contribution)
    IF v_sponsorships_made >= 1 THEN
      SELECT EXISTS(
        SELECT 1 FROM public.user_achievements
        WHERE user_id = v_user.id AND achievement_type = 'FIRST_SPONSORSHIP'
      ) INTO v_achievement_exists;
      
      IF NOT v_achievement_exists THEN
        INSERT INTO public.user_achievements (
          user_id, achievement_type, achievement_name, achievement_description, icon_url
        ) VALUES (
          v_user.id, 'FIRST_SPONSORSHIP', 'First Contribution', 
          'Make your first sponsorship', '💝'
        ) ON CONFLICT DO NOTHING;
        v_achievements_unlocked := v_achievements_unlocked + 1;
      END IF;
    END IF;

    -- SPONSOR_10 (Generous Giver)
    IF v_sponsorships_made >= 10 THEN
      SELECT EXISTS(
        SELECT 1 FROM public.user_achievements
        WHERE user_id = v_user.id AND achievement_type = 'SPONSOR_10'
      ) INTO v_achievement_exists;
      
      IF NOT v_achievement_exists THEN
        INSERT INTO public.user_achievements (
          user_id, achievement_type, achievement_name, achievement_description, icon_url
        ) VALUES (
          v_user.id, 'SPONSOR_10', 'Generous Giver', 
          'Make 10 sponsorships', '🎁'
        ) ON CONFLICT DO NOTHING;
        v_achievements_unlocked := v_achievements_unlocked + 1;
      END IF;
    END IF;

    -- FIRST_CONTENT (Creator)
    IF v_content_created >= 1 THEN
      SELECT EXISTS(
        SELECT 1 FROM public.user_achievements
        WHERE user_id = v_user.id AND achievement_type = 'FIRST_CONTENT'
      ) INTO v_achievement_exists;
      
      IF NOT v_achievement_exists THEN
        INSERT INTO public.user_achievements (
          user_id, achievement_type, achievement_name, achievement_description, icon_url
        ) VALUES (
          v_user.id, 'FIRST_CONTENT', 'Creator', 
          'Create your first content', '✨'
        ) ON CONFLICT DO NOTHING;
        v_achievements_unlocked := v_achievements_unlocked + 1;
      END IF;
    END IF;

    -- TIER_2 (Contributor)
    IF v_current_tier >= 2 THEN
      SELECT EXISTS(
        SELECT 1 FROM public.user_achievements
        WHERE user_id = v_user.id AND achievement_type = 'TIER_2'
      ) INTO v_achievement_exists;
      
      IF NOT v_achievement_exists THEN
        INSERT INTO public.user_achievements (
          user_id, achievement_type, achievement_name, achievement_description, icon_url
        ) VALUES (
          v_user.id, 'TIER_2', 'Contributor', 
          'Reach Contributor tier', '🌊'
        ) ON CONFLICT DO NOTHING;
        v_achievements_unlocked := v_achievements_unlocked + 1;
      END IF;
    END IF;

    -- TIER_3 (Changemaker)
    IF v_current_tier >= 3 THEN
      SELECT EXISTS(
        SELECT 1 FROM public.user_achievements
        WHERE user_id = v_user.id AND achievement_type = 'TIER_3'
      ) INTO v_achievement_exists;
      
      IF NOT v_achievement_exists THEN
        INSERT INTO public.user_achievements (
          user_id, achievement_type, achievement_name, achievement_description, icon_url
        ) VALUES (
          v_user.id, 'TIER_3', 'Changemaker', 
          'Reach Changemaker tier', '💜'
        ) ON CONFLICT DO NOTHING;
        v_achievements_unlocked := v_achievements_unlocked + 1;
      END IF;
    END IF;

    -- TIER_4 (Impact Leader)
    IF v_current_tier >= 4 THEN
      SELECT EXISTS(
        SELECT 1 FROM public.user_achievements
        WHERE user_id = v_user.id AND achievement_type = 'TIER_4'
      ) INTO v_achievement_exists;
      
      IF NOT v_achievement_exists THEN
        INSERT INTO public.user_achievements (
          user_id, achievement_type, achievement_name, achievement_description, icon_url
        ) VALUES (
          v_user.id, 'TIER_4', 'Impact Leader', 
          'Reach Impact Leader tier', '⭐'
        ) ON CONFLICT DO NOTHING;
        v_achievements_unlocked := v_achievements_unlocked + 1;
      END IF;
    END IF;

    -- TIER_5 (Legend)
    IF v_current_tier >= 5 THEN
      SELECT EXISTS(
        SELECT 1 FROM public.user_achievements
        WHERE user_id = v_user.id AND achievement_type = 'TIER_5'
      ) INTO v_achievement_exists;
      
      IF NOT v_achievement_exists THEN
        INSERT INTO public.user_achievements (
          user_id, achievement_type, achievement_name, achievement_description, icon_url
        ) VALUES (
          v_user.id, 'TIER_5', 'Legend', 
          'Reach Legend tier', '👑'
        ) ON CONFLICT DO NOTHING;
        v_achievements_unlocked := v_achievements_unlocked + 1;
      END IF;
    END IF;

    -- Log progress for users with unlocked achievements
    IF v_achievements_unlocked > 0 THEN
      RAISE NOTICE 'User %: Unlocked % achievements (Modules: %, Lessons: %, Votes: %, Sponsorships: %, Content: %, Tier: %)', 
        v_user.id, v_achievements_unlocked, v_modules_completed, v_lessons_completed, 
        v_votes_cast, v_sponsorships_made, v_content_created, v_current_tier;
    END IF;

  END LOOP;

  RAISE NOTICE 'Retroactive achievement unlock migration completed!';
  RAISE NOTICE 'Timestamp: %', NOW();

END $$;

-- ============================================================================
-- SUMMARY REPORT
-- ============================================================================
SELECT 
  'Total Users' AS metric,
  COUNT(DISTINCT ua.user_id)::TEXT AS value
FROM public.user_achievements ua
UNION ALL
SELECT 
  'Total Achievements Unlocked' AS metric,
  COUNT(*)::TEXT AS value
FROM public.user_achievements
UNION ALL
SELECT 
  'Most Common Achievement' AS metric,
  achievement_type::TEXT AS value
FROM (
  SELECT achievement_type, COUNT(*) as cnt
  FROM public.user_achievements
  GROUP BY achievement_type
  ORDER BY cnt DESC
  LIMIT 1
) sub;

