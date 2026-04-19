-- =========================================================
-- FIX: Standardize XP Rewards Across All Modules
-- Issue: Modules have inconsistent XP values (90, 250, 265)
-- Fix: Standardize to 50 XP per lesson * lesson_count
-- Date: November 10, 2025
-- =========================================================

-- STEP 1: Show current XP configuration (before fix)
SELECT 
  title,
  lesson_count,
  xp_reward as current_xp,
  (lesson_count * 50) as should_be_xp,
  xp_reward - (lesson_count * 50) as difference
FROM marketplace_modules
WHERE status = 'published'
ORDER BY core_value;

-- STEP 2: Standardize ALL modules to 50 XP per lesson
UPDATE marketplace_modules
SET xp_reward = lesson_count * 50
WHERE status = 'published';

-- STEP 3: Verify the fix worked
SELECT 
  title,
  lesson_count,
  xp_reward as corrected_xp,
  CASE 
    WHEN xp_reward = lesson_count * 50 THEN '✅ Correct'
    ELSE '❌ Still Wrong'
  END as status
FROM marketplace_modules
WHERE status = 'published'
ORDER BY core_value;

-- =========================================================
-- STEP 4: Recalculate XP for existing enrollments
-- (For users who already completed lessons with old XP values)
-- =========================================================

-- This will update xp_earned based on completed lessons
-- Formula: completed_lessons * 50 XP

WITH lesson_counts AS (
  SELECT 
    ce.id as enrollment_id,
    ce.module_id,
    COUNT(DISTINCT lr.lesson_id) as completed_lessons
  FROM course_enrollments ce
  LEFT JOIN lesson_responses lr ON ce.id = lr.enrollment_id AND lr.completed = true
  WHERE ce.user_id IS NOT NULL
  GROUP BY ce.id, ce.module_id
)
UPDATE course_enrollments ce
SET xp_earned = lc.completed_lessons * 50
FROM lesson_counts lc
WHERE ce.id = lc.enrollment_id
  AND lc.completed_lessons > 0
  AND (ce.xp_earned != lc.completed_lessons * 50 OR ce.xp_earned IS NULL);

-- =========================================================
-- STEP 5: Verification - Check if XP is now consistent
-- =========================================================

SELECT 
  mm.title,
  mm.xp_reward as module_xp,
  ce.id as enrollment_id,
  ce.progress_percentage,
  COUNT(DISTINCT lr.lesson_id) as completed_lessons,
  ce.xp_earned as current_xp,
  COUNT(DISTINCT lr.lesson_id) * 50 as expected_xp,
  CASE 
    WHEN ce.xp_earned = COUNT(DISTINCT lr.lesson_id) * 50 THEN '✅'
    ELSE '❌ ' || ce.xp_earned || ' vs ' || COUNT(DISTINCT lr.lesson_id) * 50
  END as xp_status
FROM course_enrollments ce
JOIN marketplace_modules mm ON ce.module_id = mm.id
LEFT JOIN lesson_responses lr ON ce.id = lr.enrollment_id AND lr.completed = true
WHERE ce.user_id IS NOT NULL
GROUP BY mm.title, mm.xp_reward, ce.id, ce.progress_percentage, ce.xp_earned
ORDER BY xp_status, ce.created_at DESC;

-- =========================================================
-- EXPECTED RESULTS
-- =========================================================
-- All modules with 5 lessons should have:
-- - xp_reward = 250 (5 lessons × 50 XP)
-- 
-- All enrollments should have:
-- - xp_earned = completed_lessons × 50 XP
-- 
-- Example:
-- - 1 lesson complete = 50 XP
-- - 3 lessons complete = 150 XP
-- - 5 lessons complete = 250 XP (module complete!)
-- =========================================================

-- STEP 6: Summary Report
SELECT 
  'Total Modules' as metric,
  COUNT(*) as value
FROM marketplace_modules
WHERE status = 'published'

UNION ALL

SELECT 
  'Modules with Correct XP',
  COUNT(*)
FROM marketplace_modules
WHERE status = 'published'
  AND xp_reward = lesson_count * 50

UNION ALL

SELECT 
  'Total Active Enrollments',
  COUNT(*)
FROM course_enrollments
WHERE user_id IS NOT NULL

UNION ALL

SELECT 
  'Enrollments with XP Earned',
  COUNT(*)
FROM course_enrollments
WHERE user_id IS NOT NULL
  AND xp_earned > 0;

