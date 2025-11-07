-- ================================================================
-- FIX: Row-Level Security blocking lesson_responses inserts
-- Error: 42501 - new row violates row-level security policy
-- ================================================================

-- Step 1: Check current RLS policies
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

-- Step 2: Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can view own lesson responses" ON lesson_responses;
DROP POLICY IF EXISTS "Users can insert own lesson responses" ON lesson_responses;
DROP POLICY IF EXISTS "Users can update own lesson responses" ON lesson_responses;
DROP POLICY IF EXISTS "Employees can view own responses" ON lesson_responses;
DROP POLICY IF EXISTS "Employees can insert responses" ON lesson_responses;
DROP POLICY IF EXISTS "Employees can update responses" ON lesson_responses;

-- Step 3: Create permissive policies for authenticated users

-- SELECT: Users can view their own lesson responses
CREATE POLICY "authenticated_users_select_own_responses" ON lesson_responses
FOR SELECT
TO authenticated
USING (
  enrollment_id IN (
    SELECT id FROM course_enrollments 
    WHERE user_id = auth.uid()
  )
);

-- INSERT: Users can create lesson responses for their enrollments
CREATE POLICY "authenticated_users_insert_own_responses" ON lesson_responses
FOR INSERT
TO authenticated
WITH CHECK (
  enrollment_id IN (
    SELECT id FROM course_enrollments 
    WHERE user_id = auth.uid()
  )
);

-- UPDATE: Users can update their own lesson responses
CREATE POLICY "authenticated_users_update_own_responses" ON lesson_responses
FOR UPDATE
TO authenticated
USING (
  enrollment_id IN (
    SELECT id FROM course_enrollments 
    WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  enrollment_id IN (
    SELECT id FROM course_enrollments 
    WHERE user_id = auth.uid()
  )
);

-- DELETE: Users can delete their own lesson responses (optional)
CREATE POLICY "authenticated_users_delete_own_responses" ON lesson_responses
FOR DELETE
TO authenticated
USING (
  enrollment_id IN (
    SELECT id FROM course_enrollments 
    WHERE user_id = auth.uid()
  )
);

-- Step 4: Verify RLS is enabled
ALTER TABLE lesson_responses ENABLE ROW LEVEL SECURITY;

-- Step 5: Verify new policies
SELECT 
  policyname,
  cmd as operation,
  CASE 
    WHEN cmd = 'SELECT' THEN 'Read own responses'
    WHEN cmd = 'INSERT' THEN 'Create responses for own enrollments'
    WHEN cmd = 'UPDATE' THEN 'Update own responses'
    WHEN cmd = 'DELETE' THEN 'Delete own responses'
  END as description
FROM pg_policies
WHERE tablename = 'lesson_responses'
ORDER BY cmd;

-- Step 6: Test manual insert (replace with YOUR IDs)
/*
-- Get your enrollment_id and lesson_id first:
SELECT 
  ce.id as enrollment_id,
  ml.id as lesson_id
FROM course_enrollments ce
CROSS JOIN module_lessons ml
WHERE ce.module_id = '63c08c28-638d-42d9-ba5d-ecfc541957b0'
AND ml.lesson_order = 1
AND ce.user_id = auth.uid()
LIMIT 1;

-- Then test insert:
INSERT INTO lesson_responses (
  enrollment_id,
  lesson_id,
  completed,
  completed_at
) VALUES (
  'YOUR_ENROLLMENT_ID_HERE',
  'YOUR_LESSON_ID_HERE',
  true,
  NOW()
) ON CONFLICT (enrollment_id, lesson_id)
DO UPDATE SET 
  completed = true,
  completed_at = NOW();

-- Verify:
SELECT * FROM lesson_responses 
WHERE enrollment_id IN (
  SELECT id FROM course_enrollments WHERE user_id = auth.uid()
);
*/

