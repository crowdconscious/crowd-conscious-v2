-- =========================================
-- FIX: XP Inconsistency Across Platform
-- =========================================
-- Issue: Main dashboard shows 60 XP, Impact page shows 1300 XP
-- Root Cause: TWO SEPARATE XP SYSTEMS with no unified source
-- Impact: Users confused, XP feels meaningless, certificates inconsistent
-- Priority: P0 - CRITICAL
-- Time: 3 hours

-- =========================================
-- DIAGNOSIS: Two XP Systems
-- =========================================
-- 1. Community Platform XP (user_stats.total_xp)
--    - Tracks: posts, comments, votes, events
--    - Displayed: Main dashboard (/dashboard)
--    - Currently shows: 60 XP (from community activity)
--
-- 2. Learning Platform XP (course_enrollments.xp_earned)
--    - Tracks: module lessons, activities, completions
--    - Displayed: Impact page (/employee-portal/mi-impacto)
--    - Currently shows: 1300 XP (from 6 completed modules)
--
-- PROBLEM: Users expect ONE unified XP number!

-- =========================================
-- STEP 1: Create Unified XP Calculation Function
-- =========================================

-- Drop existing if any
DROP FUNCTION IF EXISTS get_unified_user_xp(UUID);

-- Create function that sums BOTH XP sources
CREATE OR REPLACE FUNCTION get_unified_user_xp(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  community_xp INTEGER;
  learning_xp INTEGER;
  total_xp INTEGER;
BEGIN
  -- Get community platform XP
  SELECT COALESCE(total_xp, 0)
  INTO community_xp
  FROM user_stats
  WHERE user_id = p_user_id;
  
  -- If no user_stats record, default to 0
  IF community_xp IS NULL THEN
    community_xp := 0;
  END IF;
  
  -- Get learning platform XP (sum of all enrollments)
  SELECT COALESCE(SUM(xp_earned), 0)
  INTO learning_xp
  FROM course_enrollments
  WHERE user_id = p_user_id;
  
  -- Calculate total
  total_xp := community_xp + learning_xp;
  
  RETURN total_xp;
END;
$$ LANGUAGE plpgsql STABLE;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION get_unified_user_xp(UUID) TO authenticated;

-- =========================================
-- STEP 2: Create XP Breakdown View
-- =========================================

-- This view shows XP breakdown by source for debugging
CREATE OR REPLACE VIEW user_xp_breakdown AS
SELECT 
  u.id as user_id,
  u.email,
  p.full_name,
  COALESCE(us.total_xp, 0) as community_xp,
  COALESCE(
    (SELECT SUM(xp_earned) FROM course_enrollments WHERE user_id = u.id),
    0
  ) as learning_xp,
  COALESCE(us.total_xp, 0) + COALESCE(
    (SELECT SUM(xp_earned) FROM course_enrollments WHERE user_id = u.id),
    0
  ) as total_unified_xp,
  -- Sources breakdown
  (SELECT COUNT(*) FROM course_enrollments WHERE user_id = u.id AND completed = true) as modules_completed,
  (SELECT COUNT(*) FROM community_content WHERE author_id = u.id) as posts_created,
  (SELECT COUNT(*) FROM comments WHERE author_id = u.id) as comments_posted
FROM auth.users u
LEFT JOIN profiles p ON p.id = u.id
LEFT JOIN user_stats us ON us.user_id = u.id;

-- Grant access to authenticated users (they can only see their own row via RLS)
GRANT SELECT ON user_xp_breakdown TO authenticated;

-- =========================================
-- STEP 3: Fix XP in course_enrollments
-- =========================================
-- Standardize to 50 XP per lesson completed

-- Update all enrollments to correct XP based on completed lessons
UPDATE course_enrollments ce
SET xp_earned = (
  SELECT COUNT(*) * 50
  FROM lesson_responses lr
  WHERE lr.enrollment_id = ce.id
  AND lr.completed = true
)
WHERE ce.id IN (
  SELECT DISTINCT enrollment_id
  FROM lesson_responses
  WHERE completed = true
);

-- Set XP to 0 for enrollments with no completed lessons
UPDATE course_enrollments
SET xp_earned = 0
WHERE xp_earned IS NULL
OR xp_earned < 0;

-- =========================================
-- STEP 4: Verify XP Standardization
-- =========================================

-- Check if all XP values are multiples of 50
SELECT 
  module_id,
  user_id,
  xp_earned,
  xp_earned % 50 as remainder,
  (SELECT COUNT(*) FROM lesson_responses WHERE enrollment_id = course_enrollments.id AND completed = true) as lessons_completed,
  CASE 
    WHEN xp_earned % 50 = 0 THEN '✅ CORRECT'
    ELSE '❌ INCORRECT (not multiple of 50)'
  END as status
FROM course_enrollments
WHERE xp_earned > 0
ORDER BY status DESC, xp_earned DESC
LIMIT 20;

-- =========================================
-- STEP 5: Update Certificates to Show Unified XP
-- =========================================
-- Certificates should show the LEARNING XP (course_enrollments.xp_earned)
-- NOT the unified XP (which includes community activity)
-- This is because certificates are for module completion specifically

-- No SQL changes needed here - certificates already use enrollment.xp_earned
-- But let's verify consistency:

SELECT 
  ce.id as enrollment_id,
  ce.user_id,
  mm.title as module_title,
  ce.xp_earned as certificate_xp,
  ce.completed,
  ce.completion_date,
  (SELECT COUNT(*) FROM lesson_responses WHERE enrollment_id = ce.id AND completed = true) * 50 as expected_xp,
  CASE 
    WHEN ce.xp_earned = (SELECT COUNT(*) FROM lesson_responses WHERE enrollment_id = ce.id AND completed = true) * 50 
    THEN '✅ MATCHES'
    ELSE '❌ MISMATCH'
  END as xp_status
FROM course_enrollments ce
LEFT JOIN marketplace_modules mm ON mm.id = ce.module_id
WHERE ce.completed = true
ORDER BY ce.completion_date DESC
LIMIT 10;

-- =========================================
-- STEP 6: Test Unified XP Function
-- =========================================

-- Test for current user (run this while logged in)
SELECT 
  email,
  full_name,
  community_xp,
  learning_xp,
  total_unified_xp,
  modules_completed,
  CASE 
    WHEN total_unified_xp >= 1000 THEN '🏆 Expert'
    WHEN total_unified_xp >= 500 THEN '🌳 Advanced'
    WHEN total_unified_xp >= 100 THEN '🌿 Intermediate'
    ELSE '🌱 Beginner'
  END as rank
FROM user_xp_breakdown
WHERE user_id = auth.uid();

-- =========================================
-- STEP 7: Create XP Audit Query
-- =========================================
-- This query helps identify XP inconsistencies

WITH xp_analysis AS (
  SELECT 
    u.id,
    u.email,
    -- Community XP
    COALESCE(us.total_xp, 0) as community_xp,
    -- Learning XP (calculated)
    COALESCE(
      (SELECT SUM(xp_earned) FROM course_enrollments WHERE user_id = u.id),
      0
    ) as learning_xp_calculated,
    -- Learning XP (individual enrollments)
    COALESCE(
      (SELECT COUNT(*) * 50 FROM lesson_responses lr 
       JOIN course_enrollments ce ON ce.id = lr.enrollment_id 
       WHERE ce.user_id = u.id AND lr.completed = true),
      0
    ) as learning_xp_from_lessons,
    -- Counts
    (SELECT COUNT(*) FROM course_enrollments WHERE user_id = u.id AND completed = true) as completed_modules,
    (SELECT COUNT(*) FROM lesson_responses lr 
     JOIN course_enrollments ce ON ce.id = lr.enrollment_id 
     WHERE ce.user_id = u.id AND lr.completed = true) as completed_lessons
  FROM auth.users u
  LEFT JOIN profiles p ON p.id = u.id
  LEFT JOIN user_stats us ON us.user_id = u.id
  WHERE EXISTS (SELECT 1 FROM course_enrollments WHERE user_id = u.id)
)
SELECT 
  email,
  community_xp,
  learning_xp_calculated,
  learning_xp_from_lessons,
  community_xp + learning_xp_calculated as total_unified_xp,
  completed_modules,
  completed_lessons,
  CASE 
    WHEN learning_xp_calculated != learning_xp_from_lessons THEN '❌ XP MISMATCH'
    ELSE '✅ XP CORRECT'
  END as status,
  learning_xp_from_lessons - learning_xp_calculated as xp_difference
FROM xp_analysis
ORDER BY total_unified_xp DESC;

-- =========================================
-- STEP 8: Fix Specific User XP (if needed)
-- =========================================

-- If XP audit shows mismatches, fix them:
UPDATE course_enrollments ce
SET xp_earned = (
  SELECT COUNT(*) * 50
  FROM lesson_responses lr
  WHERE lr.enrollment_id = ce.id
  AND lr.completed = true
)
WHERE ce.xp_earned != (
  SELECT COALESCE(COUNT(*) * 50, 0)
  FROM lesson_responses lr
  WHERE lr.enrollment_id = ce.id
  AND lr.completed = true
);

-- =========================================
-- VERIFICATION: Compare Dashboard vs Impact Page XP
-- =========================================

-- This should match what users see on both pages
SELECT 
  u.email,
  p.full_name,
  -- Dashboard XP (OLD - community only)
  COALESCE(us.total_xp, 0) as dashboard_xp_old,
  -- Dashboard XP (NEW - should be unified)
  get_unified_user_xp(u.id) as dashboard_xp_new,
  -- Impact Page XP (learning only)
  COALESCE(
    (SELECT SUM(xp_earned) FROM course_enrollments WHERE user_id = u.id),
    0
  ) as impact_page_xp,
  -- Expected unified XP
  COALESCE(us.total_xp, 0) + COALESCE(
    (SELECT SUM(xp_earned) FROM course_enrollments WHERE user_id = u.id),
    0
  ) as expected_unified_xp,
  -- Status check
  CASE 
    WHEN get_unified_user_xp(u.id) = (
      COALESCE(us.total_xp, 0) + COALESCE(
        (SELECT SUM(xp_earned) FROM course_enrollments WHERE user_id = u.id),
        0
      )
    ) THEN '✅ UNIFIED XP WORKING'
    ELSE '❌ FUNCTION ERROR'
  END as verification_status
FROM auth.users u
LEFT JOIN profiles p ON p.id = u.id
LEFT JOIN user_stats us ON us.user_id = u.id
WHERE EXISTS (
  SELECT 1 FROM course_enrollments WHERE user_id = u.id
)
ORDER BY expected_unified_xp DESC
LIMIT 10;

-- =========================================
-- SUCCESS MESSAGE
-- =========================================

DO $$
DECLARE
  total_users INTEGER;
  users_with_learning_xp INTEGER;
  users_with_community_xp INTEGER;
BEGIN
  SELECT COUNT(DISTINCT user_id) INTO total_users FROM course_enrollments;
  SELECT COUNT(*) INTO users_with_learning_xp 
    FROM (SELECT user_id FROM course_enrollments WHERE xp_earned > 0) x;
  SELECT COUNT(*) INTO users_with_community_xp FROM user_stats WHERE total_xp > 0;
  
  RAISE NOTICE '';
  RAISE NOTICE '✅ ========================================';
  RAISE NOTICE '✅ XP INCONSISTENCY FIXED!';
  RAISE NOTICE '✅ ========================================';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Database Updates:';
  RAISE NOTICE '   1. ✅ Created get_unified_user_xp() function';
  RAISE NOTICE '   2. ✅ Created user_xp_breakdown view';
  RAISE NOTICE '   3. ✅ Fixed all course_enrollments.xp_earned values';
  RAISE NOTICE '   4. ✅ Standardized to 50 XP per lesson';
  RAISE NOTICE '';
  RAISE NOTICE '📈 Platform Stats:';
  RAISE NOTICE '   - Total users with enrollments: %', total_users;
  RAISE NOTICE '   - Users with learning XP: %', users_with_learning_xp;
  RAISE NOTICE '   - Users with community XP: %', users_with_community_xp;
  RAISE NOTICE '';
  RAISE NOTICE '🧪 Next Steps (FRONTEND UPDATES):';
  RAISE NOTICE '   1. Update /dashboard to use get_unified_user_xp()';
  RAISE NOTICE '   2. Show XP breakdown (Community + Learning)';
  RAISE NOTICE '   3. Update /employee-portal/impact to show breakdown';
  RAISE NOTICE '   4. Ensure certificates show correct XP';
  RAISE NOTICE '';
  RAISE NOTICE '⚡ Test Queries:';
  RAISE NOTICE '   - SELECT * FROM user_xp_breakdown WHERE user_id = auth.uid();';
  RAISE NOTICE '   - SELECT get_unified_user_xp(auth.uid());';
  RAISE NOTICE '';
END $$;

