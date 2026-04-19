-- ================================================================
-- DEBUG: Why isn't Lesson 2 unlocking?
-- Run this to diagnose the issue
-- ================================================================

-- Step 1: Check your enrollment
SELECT 
  'ENROLLMENT' as check_type,
  id as enrollment_id,
  user_id,
  module_id,
  progress_percentage,
  xp_earned,
  completed
FROM course_enrollments
WHERE module_id = '63c08c28-638d-42d9-ba5d-ecfc541957b0'
ORDER BY created_at DESC
LIMIT 5;

-- Step 2: Check lesson_responses (what lessons did you complete?)
SELECT 
  'LESSON RESPONSES' as check_type,
  lr.id as response_id,
  lr.enrollment_id,
  lr.lesson_id,
  lr.completed,
  lr.completed_at,
  ml.lesson_order,
  ml.title as lesson_title
FROM lesson_responses lr
JOIN module_lessons ml ON ml.id = lr.lesson_id
WHERE lr.enrollment_id IN (
  SELECT id FROM course_enrollments 
  WHERE module_id = '63c08c28-638d-42d9-ba5d-ecfc541957b0'
)
ORDER BY lr.completed_at DESC;

-- Step 3: Check all lessons for this module
SELECT 
  'ALL LESSONS' as check_type,
  id as lesson_id,
  lesson_order,
  title,
  xp_reward
FROM module_lessons
WHERE module_id = '63c08c28-638d-42d9-ba5d-ecfc541957b0'
ORDER BY lesson_order;

-- Step 4: Check if Lesson 1 is marked as completed
SELECT 
  'LESSON 1 COMPLETION CHECK' as check_type,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM lesson_responses lr
      JOIN module_lessons ml ON ml.id = lr.lesson_id
      WHERE ml.module_id = '63c08c28-638d-42d9-ba5d-ecfc541957b0'
      AND ml.lesson_order = 1
      AND lr.completed = true
    ) THEN '✅ Lesson 1 IS completed'
    ELSE '❌ Lesson 1 NOT completed'
  END as status;

-- Step 5: What the progress API should return
SELECT 
  'PROGRESS API SHOULD RETURN' as check_type,
  array_agg(lr.lesson_id) as completed_lesson_ids,
  count(*) as completed_count
FROM lesson_responses lr
WHERE lr.enrollment_id IN (
  SELECT id FROM course_enrollments 
  WHERE module_id = '63c08c28-638d-42d9-ba5d-ecfc541957b0'
)
AND lr.completed = true;

