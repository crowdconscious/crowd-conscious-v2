-- =====================================================
-- ⚠️ STAGING ONLY - RETROACTIVE XP MIGRATION
-- =====================================================
-- 
-- WARNING: This migration awards XP retroactively to existing users
-- based on their historical actions. Only run this in STAGING environment!
-- 
-- This will:
-- 1. Award XP for completed lessons
-- 2. Award XP for completed modules
-- 3. Award XP for sponsorships
-- 4. Award XP for votes
-- 5. Award XP for content creation
-- 
-- DO NOT RUN IN PRODUCTION without careful review and testing!
-- =====================================================

BEGIN;

-- =====================================================
-- 1. AWARD XP FOR COMPLETED LESSONS
-- =====================================================

DO $$
DECLARE
  v_lesson RECORD;
  v_xp_awarded INTEGER;
BEGIN
  FOR v_lesson IN
    SELECT DISTINCT
      ce.user_id,
      ml.id as lesson_id,
      ml.title as lesson_title,
      ce.completed_at
    FROM course_enrollments ce
    JOIN module_lessons ml ON ml.module_id = ce.module_id
    JOIN lesson_progress lp ON lp.lesson_id = ml.id AND lp.user_id = ce.user_id
    WHERE lp.completed = TRUE
      AND ce.completed_at IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM xp_transactions xt
        WHERE xt.user_id = ce.user_id
          AND xt.action_type = 'lesson_completed'
          AND xt.action_id = ml.id
      )
    ORDER BY ce.completed_at ASC
  LOOP
    BEGIN
      SELECT (award_xp(
        v_lesson.user_id,
        'lesson_completed',
        v_lesson.lesson_id,
        'Retroactive: ' || v_lesson.lesson_title
      )->>'xp_amount')::INTEGER INTO v_xp_awarded;
      
      RAISE NOTICE 'Awarded % XP to user % for lesson %', 
        v_xp_awarded, v_lesson.user_id, v_lesson.lesson_title;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Failed to award XP for lesson %: %', v_lesson.lesson_id, SQLERRM;
    END;
  END LOOP;
END $$;

-- =====================================================
-- 2. AWARD XP FOR COMPLETED MODULES
-- =====================================================

DO $$
DECLARE
  v_module RECORD;
  v_xp_awarded INTEGER;
BEGIN
  FOR v_module IN
    SELECT DISTINCT
      ce.user_id,
      ce.module_id,
      mm.title as module_title,
      ce.completed_at
    FROM course_enrollments ce
    JOIN marketplace_modules mm ON mm.id = ce.module_id
    WHERE ce.completed = TRUE
      AND ce.completed_at IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM xp_transactions xt
        WHERE xt.user_id = ce.user_id
          AND xt.action_type = 'module_completed'
          AND xt.action_id = ce.module_id
      )
    ORDER BY ce.completed_at ASC
  LOOP
    BEGIN
      SELECT (award_xp(
        v_module.user_id,
        'module_completed',
        v_module.module_id,
        'Retroactive: ' || v_module.module_title
      )->>'xp_amount')::INTEGER INTO v_xp_awarded;
      
      RAISE NOTICE 'Awarded % XP to user % for module %', 
        v_xp_awarded, v_module.user_id, v_module.module_title;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Failed to award XP for module %: %', v_module.module_id, SQLERRM;
    END;
  END LOOP;
END $$;

-- =====================================================
-- 3. AWARD XP FOR SPONSORSHIPS
-- =====================================================

DO $$
DECLARE
  v_sponsorship RECORD;
  v_xp_awarded INTEGER;
BEGIN
  FOR v_sponsorship IN
    SELECT DISTINCT
      s.sponsor_id as user_id,
      s.id as sponsorship_id,
      s.created_at
    FROM sponsorships s
    WHERE s.status = 'completed'
      AND s.sponsor_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM xp_transactions xt
        WHERE xt.user_id = s.sponsor_id
          AND xt.action_type = 'sponsor_need'
          AND xt.action_id = s.id
      )
    ORDER BY s.created_at ASC
  LOOP
    BEGIN
      SELECT (award_xp(
        v_sponsorship.user_id,
        'sponsor_need',
        v_sponsorship.sponsorship_id,
        'Retroactive: Sponsorship'
      )->>'xp_amount')::INTEGER INTO v_xp_awarded;
      
      RAISE NOTICE 'Awarded % XP to user % for sponsorship %', 
        v_xp_awarded, v_sponsorship.user_id, v_sponsorship.sponsorship_id;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Failed to award XP for sponsorship %: %', v_sponsorship.sponsorship_id, SQLERRM;
    END;
  END LOOP;
END $$;

-- =====================================================
-- 4. AWARD XP FOR VOTES (Upvotes only)
-- =====================================================

DO $$
DECLARE
  v_vote RECORD;
  v_xp_awarded INTEGER;
BEGIN
  FOR v_vote IN
    SELECT DISTINCT
      v.user_id,
      v.content_id,
      v.created_at
    FROM votes v
    WHERE v.vote_type = 'up'
      AND NOT EXISTS (
        SELECT 1 FROM xp_transactions xt
        WHERE xt.user_id = v.user_id
          AND xt.action_type = 'vote_content'
          AND xt.action_id = v.content_id
      )
    ORDER BY v.created_at ASC
  LOOP
    BEGIN
      SELECT (award_xp(
        v_vote.user_id,
        'vote_content',
        v_vote.content_id,
        'Retroactive: Vote on content'
      )->>'xp_amount')::INTEGER INTO v_xp_awarded;
      
      RAISE NOTICE 'Awarded % XP to user % for vote on content %', 
        v_xp_awarded, v_vote.user_id, v_vote.content_id;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Failed to award XP for vote %: %', v_vote.content_id, SQLERRM;
    END;
  END LOOP;
END $$;

-- =====================================================
-- 5. AWARD XP FOR CONTENT CREATION
-- =====================================================

DO $$
DECLARE
  v_content RECORD;
  v_xp_awarded INTEGER;
BEGIN
  FOR v_content IN
    SELECT DISTINCT
      cc.created_by as user_id,
      cc.id as content_id,
      cc.created_at
    FROM community_content cc
    WHERE cc.status = 'published'
      AND cc.created_by IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM xp_transactions xt
        WHERE xt.user_id = cc.created_by
          AND xt.action_type = 'create_content'
          AND xt.action_id = cc.id
      )
    ORDER BY cc.created_at ASC
  LOOP
    BEGIN
      SELECT (award_xp(
        v_content.user_id,
        'create_content',
        v_content.content_id,
        'Retroactive: Content creation'
      )->>'xp_amount')::INTEGER INTO v_xp_awarded;
      
      RAISE NOTICE 'Awarded % XP to user % for content %', 
        v_xp_awarded, v_content.user_id, v_content.content_id;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Failed to award XP for content %: %', v_content.content_id, SQLERRM;
    END;
  END LOOP;
END $$;

-- =====================================================
-- 6. UPDATE LEADERBOARD RANKS
-- =====================================================

SELECT update_leaderboard_ranks();

-- =====================================================
-- 7. SUMMARY REPORT
-- =====================================================

DO $$
DECLARE
  v_total_users INTEGER;
  v_total_xp_awarded BIGINT;
  v_users_with_xp INTEGER;
BEGIN
  SELECT COUNT(DISTINCT user_id) INTO v_total_users FROM user_xp;
  SELECT SUM(total_xp) INTO v_total_xp_awarded FROM user_xp;
  SELECT COUNT(*) INTO v_users_with_xp FROM user_xp WHERE total_xp > 0;
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'RETROACTIVE XP MIGRATION COMPLETE';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Total users with XP: %', v_users_with_xp;
  RAISE NOTICE 'Total XP awarded: %', v_total_xp_awarded;
  RAISE NOTICE 'Average XP per user: %', 
    CASE WHEN v_users_with_xp > 0 THEN v_total_xp_awarded / v_users_with_xp ELSE 0 END;
  RAISE NOTICE '========================================';
END $$;

COMMIT;

-- =====================================================
-- VERIFICATION QUERIES (Run after migration)
-- =====================================================

-- Check XP distribution by tier
-- SELECT 
--   current_tier,
--   COUNT(*) as user_count,
--   AVG(total_xp) as avg_xp,
--   MIN(total_xp) as min_xp,
--   MAX(total_xp) as max_xp
-- FROM user_xp
-- GROUP BY current_tier
-- ORDER BY current_tier;

-- Check XP transactions by type
-- SELECT 
--   action_type,
--   COUNT(*) as transaction_count,
--   SUM(amount) as total_xp_awarded
-- FROM xp_transactions
-- GROUP BY action_type
-- ORDER BY total_xp_awarded DESC;

