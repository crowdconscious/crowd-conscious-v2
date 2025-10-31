-- Fix RLS policies to allow employees to update their own enrollment progress
-- This is blocking progress from being saved!

-- Step 1: Check current RLS policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'course_enrollments';

-- Step 2: Drop existing restrictive UPDATE policy if it exists
DROP POLICY IF EXISTS "Employees can update their own enrollment" ON course_enrollments;
DROP POLICY IF EXISTS "Employees can view and update own enrollments" ON course_enrollments;
DROP POLICY IF EXISTS "Users can update their own enrollments" ON course_enrollments;

-- Step 3: Create new UPDATE policy that allows employees to update their progress
CREATE POLICY "Employees and admins can update their own enrollment progress"
ON course_enrollments
FOR UPDATE
TO authenticated
USING (employee_id = auth.uid())
WITH CHECK (employee_id = auth.uid());

-- Step 4: Ensure employees can SELECT their own enrollments
DROP POLICY IF EXISTS "Employees can view own enrollments" ON course_enrollments;
CREATE POLICY "Employees and admins can view own enrollments"
ON course_enrollments
FOR SELECT
TO authenticated
USING (employee_id = auth.uid());

-- Step 5: Test the fix by manually updating your enrollment
UPDATE course_enrollments
SET 
  modules_completed = 2,
  completion_percentage = 66,
  xp_earned = 500,
  status = 'in_progress',
  updated_at = NOW()
WHERE employee_id = (SELECT id FROM profiles WHERE email = 'francisco.blockstrand@gmail.com')
AND course_id = 'a1a1a1a1-1111-1111-1111-111111111111'::uuid;

-- Step 6: Verify the update worked
SELECT 
  'AFTER FIX' as section,
  p.email,
  ce.status,
  ce.completion_percentage,
  ce.modules_completed,
  ce.xp_earned,
  ce.updated_at
FROM course_enrollments ce
JOIN profiles p ON p.id = ce.employee_id
WHERE p.email = 'francisco.blockstrand@gmail.com';

-- Step 7: Reset to 0 so you can test the real flow
-- UNCOMMENT THIS to reset and test from scratch
/*
UPDATE course_enrollments
SET 
  modules_completed = 0,
  completion_percentage = 0,
  xp_earned = 0,
  status = 'not_started',
  updated_at = NOW()
WHERE employee_id = (SELECT id FROM profiles WHERE email = 'francisco.blockstrand@gmail.com')
AND course_id = 'a1a1a1a1-1111-1111-1111-111111111111'::uuid;
*/

