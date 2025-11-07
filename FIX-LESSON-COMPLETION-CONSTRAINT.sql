-- ================================================================
-- FIX: Ensure lesson_responses has proper unique constraint
-- and can accept lesson completions
-- ================================================================

-- Step 1: Drop old constraints if they exist
ALTER TABLE lesson_responses 
  DROP CONSTRAINT IF EXISTS lesson_responses_enrollment_id_lesson_id_key;

ALTER TABLE lesson_responses 
  DROP CONSTRAINT IF EXISTS lesson_responses_employee_id_lesson_id_key;

-- Step 2: Create the correct unique constraint
ALTER TABLE lesson_responses 
  ADD CONSTRAINT lesson_responses_enrollment_id_lesson_id_key 
  UNIQUE (enrollment_id, lesson_id);

-- Step 3: Verify the constraint exists
SELECT 
  conname as constraint_name,
  pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'public.lesson_responses'::regclass
AND conname = 'lesson_responses_enrollment_id_lesson_id_key';

-- Step 4: Test manual insert with YOUR actual IDs
-- First, get your enrollment ID and lesson 1 ID:
SELECT 
  'Use these IDs below' as instruction,
  ce.id as your_enrollment_id,
  ml.id as lesson_1_id
FROM course_enrollments ce
CROSS JOIN (
  SELECT id FROM module_lessons 
  WHERE module_id = '63c08c28-638d-42d9-ba5d-ecfc541957b0' 
  AND lesson_order = 1 
  LIMIT 1
) ml
WHERE ce.module_id = '63c08c28-638d-42d9-ba5d-ecfc541957b0'
ORDER BY ce.created_at DESC
LIMIT 1;

-- Step 5: MANUAL TEST - Copy the IDs from above and run this:
/*
-- REPLACE WITH YOUR ACTUAL IDs FROM STEP 4!
INSERT INTO lesson_responses (
  enrollment_id,
  lesson_id,
  module_id,
  completed,
  completed_at,
  time_spent_minutes
) VALUES (
  'YOUR_ENROLLMENT_ID_HERE',  -- Replace!
  'YOUR_LESSON_1_ID_HERE',     -- Replace!
  '63c08c28-638d-42d9-ba5d-ecfc541957b0',
  true,
  NOW(),
  5
)
ON CONFLICT (enrollment_id, lesson_id) 
DO UPDATE SET 
  completed = true,
  completed_at = NOW();

-- Then verify it worked:
SELECT * FROM lesson_responses 
WHERE enrollment_id = 'YOUR_ENROLLMENT_ID_HERE'
AND lesson_id = 'YOUR_LESSON_1_ID_HERE';
*/

-- Step 6: Check if it's now marked as completed
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM lesson_responses lr
      JOIN module_lessons ml ON ml.id = lr.lesson_id
      WHERE ml.module_id = '63c08c28-638d-42d9-ba5d-ecfc541957b0'
      AND ml.lesson_order = 1
      AND lr.completed = true
    ) THEN '✅ Lesson 1 IS NOW completed!'
    ELSE '❌ Lesson 1 still NOT completed - check Step 5'
  END as status;

