-- 🧪 TEST COMPLETE LESSON FLOW
-- This verifies everything is ready for testing

DO $$ 
BEGIN
  RAISE NOTICE '🧪 Testing complete lesson flow...';
END $$;

-- 1️⃣ Check your enrollment
SELECT 
  id as enrollment_id,
  user_id,
  module_id,
  progress_percentage,
  completed,
  xp_earned,
  '✅ Your enrollment' as step
FROM course_enrollments
WHERE user_id = auth.uid()
  AND module_id = '63c08c28-638d-42d9-ba5d-ecfc541957b0'  -- Aire Limpio
LIMIT 1;

-- 2️⃣ Check if any lessons are completed
SELECT 
  lr.id,
  lr.enrollment_id,
  lr.lesson_id,
  ml.title as lesson_title,
  ml.lesson_order,
  lr.completed,
  lr.completed_at,
  '✅ Completed lessons (if any)' as step
FROM lesson_responses lr
JOIN module_lessons ml ON lr.lesson_id = ml.id
WHERE lr.enrollment_id IN (
  SELECT id FROM course_enrollments 
  WHERE user_id = auth.uid() 
  AND module_id = '63c08c28-638d-42d9-ba5d-ecfc541957b0'
)
ORDER BY ml.lesson_order;

-- 3️⃣ Show all lessons for this module
SELECT 
  id as lesson_id,
  lesson_order,
  title,
  estimated_minutes,
  xp_reward,
  '✅ All lessons in Aire Limpio' as step
FROM module_lessons
WHERE module_id = '63c08c28-638d-42d9-ba5d-ecfc541957b0'
ORDER BY lesson_order;

-- 4️⃣ Check RLS policies allow progress API to read
SELECT 
  policyname,
  cmd,
  '✅ RLS policies on lesson_responses' as step
FROM pg_policies
WHERE tablename = 'lesson_responses'
  AND cmd IN ('SELECT', 'INSERT', 'UPDATE');

DO $$ 
BEGIN
  RAISE NOTICE '✅ Test queries complete!';
  RAISE NOTICE '📝 If you see your enrollment and lessons above, you''re ready to test!';
END $$;

