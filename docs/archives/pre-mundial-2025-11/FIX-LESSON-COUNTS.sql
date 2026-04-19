-- =========================================================
-- FIX: Correct lesson_count for modules showing wrong progress
-- Issue: "Cero Residuos" showing 120% (6 lessons completed, but lesson_count = 5)
-- Date: November 10, 2025
-- =========================================================

-- STEP 1: Check current lesson counts vs actual lessons
SELECT 
  mm.id,
  mm.title,
  mm.lesson_count as configured_count,
  COUNT(DISTINCT ml.id) as actual_lesson_count,
  mm.lesson_count - COUNT(DISTINCT ml.id) as difference,
  CASE 
    WHEN mm.lesson_count = COUNT(DISTINCT ml.id) THEN '✅ Correct'
    ELSE '❌ Mismatch!'
  END as status
FROM marketplace_modules mm
LEFT JOIN module_lessons ml ON mm.id = ml.module_id
WHERE mm.status = 'published'
GROUP BY mm.id, mm.title, mm.lesson_count
ORDER BY status DESC, mm.core_value;

-- STEP 2: Find specific enrollments with > 100% progress
SELECT 
  ce.id as enrollment_id,
  mm.title,
  mm.lesson_count as module_lesson_count,
  ce.progress_percentage,
  COUNT(DISTINCT lr.lesson_id) as completed_lessons,
  CASE 
    WHEN ce.progress_percentage > 100 THEN '🔴 Over 100%'
    WHEN ce.progress_percentage = 100 THEN '✅ Complete'
    ELSE '⏳ In Progress'
  END as status
FROM course_enrollments ce
JOIN marketplace_modules mm ON ce.module_id = mm.id
LEFT JOIN lesson_responses lr ON ce.id = lr.enrollment_id AND lr.completed = true
WHERE ce.user_id IS NOT NULL
GROUP BY ce.id, mm.title, mm.lesson_count, ce.progress_percentage
HAVING ce.progress_percentage > 100
ORDER BY ce.progress_percentage DESC;

-- STEP 3: Fix "Economía Circular: Cero Residuos" if it has 6 lessons
-- (Only run this if Step 1 shows the module has 6 actual lessons but lesson_count = 5)

UPDATE marketplace_modules
SET 
  lesson_count = (
    SELECT COUNT(DISTINCT ml.id)
    FROM module_lessons ml
    WHERE ml.module_id = marketplace_modules.id
  ),
  xp_reward = (
    SELECT COUNT(DISTINCT ml.id) * 50
    FROM module_lessons ml
    WHERE ml.module_id = marketplace_modules.id
  )
WHERE title ILIKE '%cero residuos%'
  AND status = 'published';

-- STEP 4: Recalculate progress for affected enrollments
-- This will fix the 120% issue by using correct lesson count

WITH lesson_counts AS (
  SELECT 
    ce.id as enrollment_id,
    ce.module_id,
    mm.lesson_count as total_lessons,
    COUNT(DISTINCT lr.lesson_id) as completed_lessons
  FROM course_enrollments ce
  JOIN marketplace_modules mm ON ce.module_id = mm.id
  LEFT JOIN lesson_responses lr ON ce.id = lr.enrollment_id AND lr.completed = true
  WHERE ce.user_id IS NOT NULL
  GROUP BY ce.id, ce.module_id, mm.lesson_count
)
UPDATE course_enrollments ce
SET 
  progress_percentage = ROUND((lc.completed_lessons::numeric / NULLIF(lc.total_lessons, 0)) * 100),
  completed = (lc.completed_lessons >= lc.total_lessons),
  completion_date = CASE 
    WHEN lc.completed_lessons >= lc.total_lessons AND ce.completion_date IS NULL 
    THEN NOW() 
    ELSE ce.completion_date 
  END
FROM lesson_counts lc
WHERE ce.id = lc.enrollment_id
  AND ce.progress_percentage != ROUND((lc.completed_lessons::numeric / NULLIF(lc.total_lessons, 0)) * 100);

-- STEP 5: Verify the fix
SELECT 
  mm.title,
  mm.lesson_count,
  COUNT(DISTINCT ml.id) as actual_lessons,
  ce.progress_percentage,
  COUNT(DISTINCT lr.lesson_id) as completed_lessons,
  CASE 
    WHEN ce.progress_percentage > 100 THEN '❌ Still broken'
    WHEN ce.progress_percentage = 100 AND ce.completed = true THEN '✅ Fixed and complete'
    ELSE '✅ Fixed'
  END as status
FROM course_enrollments ce
JOIN marketplace_modules mm ON ce.module_id = mm.id
LEFT JOIN module_lessons ml ON mm.id = ml.module_id
LEFT JOIN lesson_responses lr ON ce.id = lr.enrollment_id AND lr.completed = true
WHERE ce.user_id IS NOT NULL
GROUP BY mm.title, mm.lesson_count, ce.progress_percentage, ce.completed
ORDER BY status, mm.title;

-- =========================================================
-- EXPECTED RESULTS
-- =========================================================
-- After running this:
-- 1. lesson_count in marketplace_modules matches actual lessons
-- 2. All progress_percentage values ≤ 100%
-- 3. "Cero Residuos" shows 100% instead of 120%
-- 4. XP rewards match lesson count (6 lessons = 300 XP, not 250 XP)
-- =========================================================

