-- =====================================================
-- ⚠️ STAGING ONLY - RETROACTIVE XP MIGRATION
-- =====================================================
-- 
-- WARNING: This migration awards XP retroactively to existing users
-- based on their historical actions. Only run this in STAGING environment!
-- 
-- This will:
-- 1. Award XP for completed lessons (from course_enrollments.lesson_responses)
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
-- Lessons are tracked in course_enrollments.lesson_responses (JSONB array)
-- Each response object contains: { lesson_id, completed, ... }

DO $$
DECLARE
  v_lesson RECORD;
  v_xp_awarded INTEGER;
BEGIN
  -- Process lessons from course_enrollments.lesson_responses
  FOR v_lesson IN
    SELECT DISTINCT
      ce.user_id,
      (lr.value->>'lesson_id')::UUID as lesson_id,
      ce.completion_date as completed_at
    FROM course_enrollments ce
    CROSS JOIN LATERAL jsonb_array_elements(ce.lesson_responses) AS lr
    WHERE ce.lesson_responses IS NOT NULL
      AND ce.lesson_responses::text != '[]'
      AND lr.value->>'completed' = 'true'
      AND lr.value->>'lesson_id' IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM public.xp_transactions xt
        WHERE xt.user_id = ce.user_id
          AND xt.action_type = 'lesson_completed'
          AND xt.action_id = (lr.value->>'lesson_id')::UUID
      )
    ORDER BY ce.completion_date ASC NULLS LAST, ce.enrolled_at ASC
  LOOP
    BEGIN
      -- award_xp returns INTEGER (the XP amount awarded)
      v_xp_awarded := award_xp(
        v_lesson.user_id,
        'lesson_completed',
        v_lesson.lesson_id,
        'Retroactive: Completed lesson'
      );
      
      RAISE NOTICE 'Awarded % XP to user % for lesson %', 
        v_xp_awarded, v_lesson.user_id, v_lesson.lesson_id;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Failed to award XP for lesson % to user %: %', 
        v_lesson.lesson_id, v_lesson.user_id, SQLERRM;
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
      ce.completion_date as completed_at
    FROM course_enrollments ce
    WHERE ce.completed = TRUE
      AND ce.completion_date IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM public.xp_transactions xt
        WHERE xt.user_id = ce.user_id
          AND xt.action_type = 'module_completed'
          AND xt.action_id = ce.module_id
      )
    ORDER BY ce.completion_date ASC
  LOOP
    BEGIN
      -- award_xp returns INTEGER (the XP amount awarded)
      v_xp_awarded := award_xp(
        v_module.user_id,
        'module_completed',
        v_module.module_id,
        'Retroactive: Completed module'
      );
      
      RAISE NOTICE 'Awarded % XP to user % for module %', 
        v_xp_awarded, v_module.user_id, v_module.module_id;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Failed to award XP for module % to user %: %', 
        v_module.module_id, v_module.user_id, SQLERRM;
    END;
  END LOOP;
END $$;

-- =====================================================
-- 3. AWARD XP FOR SPONSORSHIPS
-- =====================================================
-- Sponsorships with status 'paid' or 'completed' qualify for XP

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
    WHERE s.status IN ('paid', 'completed')
      AND s.sponsor_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM public.xp_transactions xt
        WHERE xt.user_id = s.sponsor_id
          AND xt.action_type = 'sponsor_need'
          AND xt.action_id = s.id
      )
    ORDER BY s.created_at ASC
  LOOP
    BEGIN
      -- award_xp returns INTEGER (the XP amount awarded)
      v_xp_awarded := award_xp(
        v_sponsorship.user_id,
        'sponsor_need',
        v_sponsorship.sponsorship_id,
        'Retroactive: Sponsorship'
      );
      
      RAISE NOTICE 'Awarded % XP to user % for sponsorship %', 
        v_xp_awarded, v_sponsorship.user_id, v_sponsorship.sponsorship_id;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Failed to award XP for sponsorship % to user %: %', 
        v_sponsorship.sponsorship_id, v_sponsorship.user_id, SQLERRM;
    END;
  END LOOP;
END $$;

-- =====================================================
-- 4. AWARD XP FOR VOTES (Approve votes only)
-- =====================================================
-- Votes table uses 'vote' column with values 'approve' or 'reject'

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
    WHERE v.vote = 'approve'
      AND NOT EXISTS (
        SELECT 1 FROM public.xp_transactions xt
        WHERE xt.user_id = v.user_id
          AND xt.action_type = 'vote_content'
          AND xt.action_id = v.content_id
      )
    ORDER BY v.created_at ASC
  LOOP
    BEGIN
      -- award_xp returns INTEGER (the XP amount awarded)
      v_xp_awarded := award_xp(
        v_vote.user_id,
        'vote_content',
        v_vote.content_id,
        'Retroactive: Voted on content'
      );
      
      RAISE NOTICE 'Awarded % XP to user % for vote on content %', 
        v_xp_awarded, v_vote.user_id, v_vote.content_id;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Failed to award XP for vote % to user %: %', 
        v_vote.content_id, v_vote.user_id, SQLERRM;
    END;
  END LOOP;
END $$;

-- =====================================================
-- 5. AWARD XP FOR CONTENT CREATION
-- =====================================================
-- Content with status 'approved', 'active', or 'completed' qualifies

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
    WHERE cc.status IN ('approved', 'active', 'completed', 'published')
      AND cc.created_by IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM public.xp_transactions xt
        WHERE xt.user_id = cc.created_by
          AND xt.action_type = 'create_content'
          AND xt.action_id = cc.id
      )
    ORDER BY cc.created_at ASC
  LOOP
    BEGIN
      -- award_xp returns INTEGER (the XP amount awarded)
      v_xp_awarded := award_xp(
        v_content.user_id,
        'create_content',
        v_content.content_id,
        'Retroactive: Content creation'
      );
      
      RAISE NOTICE 'Awarded % XP to user % for content %', 
        v_xp_awarded, v_content.user_id, v_content.content_id;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Failed to award XP for content % to user %: %', 
        v_content.content_id, v_content.user_id, SQLERRM;
    END;
  END LOOP;
END $$;

-- =====================================================
-- 6. UPDATE LEADERBOARD RANKS
-- =====================================================

DO $$
BEGIN
  PERFORM update_leaderboard_ranks();
  RAISE NOTICE 'Leaderboard ranks updated';
END $$;

-- =====================================================
-- 7. SUMMARY REPORT
-- =====================================================

DO $$
DECLARE
  v_total_users INTEGER;
  v_total_xp_awarded BIGINT;
  v_users_with_xp INTEGER;
  v_retroactive_xp BIGINT;
  v_retroactive_transactions INTEGER;
BEGIN
  SELECT COUNT(DISTINCT user_id) INTO v_total_users FROM public.user_xp;
  SELECT SUM(total_xp) INTO v_total_xp_awarded FROM public.user_xp;
  SELECT COUNT(*) INTO v_users_with_xp FROM public.user_xp WHERE total_xp > 0;
  
  -- Count retroactive XP specifically
  SELECT COUNT(*), COALESCE(SUM(amount), 0) 
  INTO v_retroactive_transactions, v_retroactive_xp
  FROM public.xp_transactions
  WHERE description LIKE 'Retroactive:%';
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'RETROACTIVE XP MIGRATION COMPLETE';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Total users with XP records: %', v_total_users;
  RAISE NOTICE 'Users with XP > 0: %', v_users_with_xp;
  RAISE NOTICE 'Total XP across all users: %', v_total_xp_awarded;
  RAISE NOTICE 'Retroactive transactions created: %', v_retroactive_transactions;
  RAISE NOTICE 'Retroactive XP awarded: %', v_retroactive_xp;
  RAISE NOTICE 'Average XP per user (with XP): %', 
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
-- FROM public.user_xp
-- GROUP BY current_tier
-- ORDER BY current_tier;

-- Check XP transactions by type
-- SELECT 
--   action_type,
--   COUNT(*) as transaction_count,
--   SUM(amount) as total_xp_awarded
-- FROM public.xp_transactions
-- GROUP BY action_type
-- ORDER BY total_xp_awarded DESC;

-- Check retroactive transactions (should have "Retroactive:" in description)
-- SELECT 
--   action_type,
--   COUNT(*) as retroactive_count,
--   SUM(amount) as retroactive_xp
-- FROM public.xp_transactions
-- WHERE description LIKE 'Retroactive:%'
-- GROUP BY action_type
-- ORDER BY retroactive_xp DESC;

-- Check users who received retroactive XP
-- SELECT 
--   ux.user_id,
--   ux.total_xp,
--   ux.current_tier,
--   COUNT(xt.id) as retroactive_transactions,
--   SUM(xt.amount) as retroactive_xp_total
-- FROM public.user_xp ux
-- JOIN public.xp_transactions xt ON xt.user_id = ux.user_id
-- WHERE xt.description LIKE 'Retroactive:%'
-- GROUP BY ux.user_id, ux.total_xp, ux.current_tier
-- ORDER BY retroactive_xp_total DESC
-- LIMIT 20;

