-- 🔍 DIAGNOSE LESSON COMPLETION ISSUE
-- Run this to check what's happening when you complete a lesson

-- 1️⃣ CHECK YOUR ENROLLMENT
SELECT 
  id as enrollment_id,
  user_id,
  module_id,
  progress_percentage,
  completed,
  xp_earned,
  'Your enrollment' as note
FROM course_enrollments
WHERE user_id = auth.uid()
  AND module_id = '63c08c28-638d-42d9-ba5d-ecfc541957b0';  -- Aire Limpio module

-- 2️⃣ CHECK LESSON RESPONSES (should show completed lessons)
SELECT 
  lr.id,
  lr.enrollment_id,
  lr.lesson_id,
  ml.title as lesson_title,
  ml.lesson_order,
  lr.completed,
  lr.completed_at,
  'Your completed lessons' as note
FROM lesson_responses lr
JOIN course_enrollments ce ON lr.enrollment_id = ce.id
JOIN module_lessons ml ON lr.lesson_id = ml.id
WHERE ce.user_id = auth.uid()
  AND ml.module_id = '63c08c28-638d-42d9-ba5d-ecfc541957b0'
ORDER BY ml.lesson_order;

-- 3️⃣ CHECK IF LESSON_RESPONSES TABLE HAS CORRECT COLUMNS
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'lesson_responses'
ORDER BY ordinal_position;

-- 4️⃣ CHECK RLS POLICIES ON LESSON_RESPONSES
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'lesson_responses';

-- 5️⃣ CHECK RLS POLICIES ON COURSE_ENROLLMENTS (UPDATE specifically)
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'course_enrollments'
  AND cmd = 'UPDATE';

-- 6️⃣ TRY TO MANUALLY UPDATE YOUR ENROLLMENT (test if RLS allows it)
-- Replace USER_ID and ENROLLMENT_ID with actual values from query 1
-- UPDATE course_enrollments
-- SET progress_percentage = 20, completed = false
-- WHERE id = 'YOUR_ENROLLMENT_ID_HERE';

-- 7️⃣ CHECK UNIQUE CONSTRAINT ON LESSON_RESPONSES
SELECT
  con.conname as constraint_name,
  con.contype as constraint_type,
  CASE 
    WHEN con.contype = 'u' THEN 'UNIQUE'
    WHEN con.contype = 'p' THEN 'PRIMARY KEY'
    ELSE con.contype::text
  END as constraint_description,
  array_agg(att.attname ORDER BY unnest(con.conkey)) as columns
FROM pg_constraint con
JOIN pg_attribute att ON att.attrelid = con.conrelid AND att.attnum = ANY(con.conkey)
WHERE con.conrelid = 'lesson_responses'::regclass
  AND con.contype IN ('u', 'p')  -- unique or primary key
GROUP BY con.conname, con.contype;

