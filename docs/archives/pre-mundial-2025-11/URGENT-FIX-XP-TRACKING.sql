-- =========================================================
-- URGENT: Fix XP Tracking Across All Enrollments
-- Issue: Certificates show XP but module pages show 0 XP
-- Date: November 10, 2025
-- =========================================================

-- STEP 1: Diagnostic - Check XP discrepancies
SELECT 
  ce.id as enrollment_id,
  p.full_name as user_name,
  mm.title as module_name,
  mm.lesson_count,
  mm.xp_reward as module_configured_xp,
  ce.progress_percentage,
  ce.xp_earned as currently_showing_xp,
  COUNT(DISTINCT lr.lesson_id) FILTER (WHERE lr.completed = true) as lessons_completed,
  COUNT(DISTINCT lr.lesson_id) FILTER (WHERE lr.completed = true) * 50 as expected_xp,
  ce.completed as module_complete,
  ce.completion_date
FROM course_enrollments ce
JOIN profiles p ON ce.user_id = p.id
JOIN marketplace_modules mm ON ce.module_id = mm.id
LEFT JOIN lesson_responses lr ON ce.id = lr.enrollment_id
WHERE ce.user_id IS NOT NULL
GROUP BY ce.id, p.full_name, mm.title, mm.lesson_count, mm.xp_reward, ce.progress_percentage, ce.xp_earned, ce.completed, ce.completion_date
ORDER BY ce.created_at DESC;

-- STEP 2: Fix ALL enrollments - Recalculate XP based on completed lessons
UPDATE course_enrollments
SET xp_earned = subquery.calculated_xp
FROM (
  SELECT 
    ce.id,
    COALESCE(COUNT(DISTINCT lr.lesson_id) FILTER (WHERE lr.completed = true), 0) * 50 as calculated_xp
  FROM course_enrollments ce
  LEFT JOIN lesson_responses lr ON ce.id = lr.enrollment_id
  WHERE ce.user_id IS NOT NULL
  GROUP BY ce.id
) AS subquery
WHERE course_enrollments.id = subquery.id
  AND course_enrollments.user_id IS NOT NULL;

-- STEP 3: Verify the fix
SELECT 
  mm.title,
  ce.progress_percentage,
  ce.xp_earned,
  COUNT(DISTINCT lr.lesson_id) FILTER (WHERE lr.completed = true) as lessons_completed,
  COUNT(DISTINCT lr.lesson_id) FILTER (WHERE lr.completed = true) * 50 as expected_xp,
  CASE 
    WHEN ce.xp_earned = COUNT(DISTINCT lr.lesson_id) FILTER (WHERE lr.completed = true) * 50 THEN '✅ Correct'
    ELSE '❌ Still wrong: ' || ce.xp_earned || ' vs ' || COUNT(DISTINCT lr.lesson_id) FILTER (WHERE lr.completed = true) * 50
  END as xp_status
FROM course_enrollments ce
JOIN marketplace_modules mm ON ce.module_id = mm.id
LEFT JOIN lesson_responses lr ON ce.id = lr.enrollment_id
WHERE ce.user_id IS NOT NULL
GROUP BY mm.title, ce.progress_percentage, ce.xp_earned, ce.id
ORDER BY xp_status;

-- STEP 4: Check for orphaned lesson_responses (responses without enrollment)
SELECT 
  lr.id,
  lr.enrollment_id,
  lr.lesson_id,
  lr.completed,
  ce.id as enrollment_exists
FROM lesson_responses lr
LEFT JOIN course_enrollments ce ON lr.enrollment_id = ce.id
WHERE ce.id IS NULL
LIMIT 10;

-- STEP 5: Summary report
SELECT 
  'Total Enrollments' as metric,
  COUNT(*) as value
FROM course_enrollments
WHERE user_id IS NOT NULL

UNION ALL

SELECT 
  'Enrollments with Completed Lessons',
  COUNT(DISTINCT ce.id)
FROM course_enrollments ce
JOIN lesson_responses lr ON ce.id = lr.enrollment_id
WHERE ce.user_id IS NOT NULL
  AND lr.completed = true

UNION ALL

SELECT 
  'Enrollments with 0 XP (but have completed lessons)',
  COUNT(DISTINCT ce.id)
FROM course_enrollments ce
JOIN lesson_responses lr ON ce.id = lr.enrollment_id
WHERE ce.user_id IS NOT NULL
  AND lr.completed = true
  AND ce.xp_earned = 0

UNION ALL

SELECT 
  'Enrollments with Correct XP',
  COUNT(*)
FROM (
  SELECT 
    ce.id,
    ce.xp_earned,
    COALESCE(COUNT(DISTINCT lr.lesson_id) FILTER (WHERE lr.completed = true), 0) * 50 as expected_xp
  FROM course_enrollments ce
  LEFT JOIN lesson_responses lr ON ce.id = lr.enrollment_id
  WHERE ce.user_id IS NOT NULL
  GROUP BY ce.id, ce.xp_earned
  HAVING ce.xp_earned = COALESCE(COUNT(DISTINCT lr.lesson_id) FILTER (WHERE lr.completed = true), 0) * 50
) as correct_xp;

-- =========================================================
-- EXPECTED RESULTS
-- =========================================================
-- After Step 2:
-- - All enrollments should have xp_earned = (completed_lessons × 50)
-- - "Cero Residuos" with 6 lessons complete should show 300 XP
-- - Module pages should display correct XP values
-- =========================================================

