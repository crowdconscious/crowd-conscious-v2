-- Check existing RLS policies on course_enrollments
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
ORDER BY policyname;

-- ============================================
-- FIX: Ensure users can see their own enrollments
-- ============================================

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can only see corporate enrollments" ON course_enrollments;
DROP POLICY IF EXISTS "Corporate admins can view their company enrollments" ON course_enrollments;
DROP POLICY IF EXISTS "Employees can view their own enrollments" ON course_enrollments;

-- Create comprehensive policies for ALL users
CREATE POLICY "authenticated_users_can_view_own_enrollments" 
ON course_enrollments FOR SELECT
USING (
  auth.uid() = user_id
);

CREATE POLICY "authenticated_users_can_insert_own_enrollments" 
ON course_enrollments FOR INSERT
WITH CHECK (
  auth.uid() = user_id
);

CREATE POLICY "authenticated_users_can_update_own_enrollments" 
ON course_enrollments FOR UPDATE
USING (
  auth.uid() = user_id
);

-- Also allow service role (for webhook)
CREATE POLICY "service_role_full_access" 
ON course_enrollments
USING (true)
WITH CHECK (true);

-- ============================================
-- TEST: Check if user can see their enrollments
-- ============================================

-- Replace with actual test user email
SELECT 
  ce.id,
  ce.user_id,
  ce.module_id,
  ce.course_id,
  ce.purchased_at,
  ce.progress_percentage,
  mm.title as module_title
FROM course_enrollments ce
LEFT JOIN marketplace_modules mm ON ce.module_id = mm.id
WHERE ce.user_id = (
  SELECT id FROM auth.users WHERE email = 'ximenaginsburg@hotmail.com'  -- Replace with test user email
)
ORDER BY ce.purchased_at DESC;

-- Check if profiles table has correct data
SELECT 
  id,
  email,
  full_name,
  is_corporate_user,
  corporate_role,
  corporate_account_id
FROM profiles
WHERE email = 'ximenaginsburg@hotmail.com';  -- Replace with test user email

-- ============================================
-- BONUS: Ensure marketplace_modules has RLS
-- ============================================

-- Allow everyone to view marketplace modules
DROP POLICY IF EXISTS "anyone_can_view_modules" ON marketplace_modules;

CREATE POLICY "anyone_can_view_modules" 
ON marketplace_modules FOR SELECT
USING (true);

-- ============================================
-- Summary
-- ============================================

SELECT 
  'RLS policies updated' as status,
  'All authenticated users can now view/update their own enrollments' as note,
  'Webhook (service role) can insert enrollments' as webhook_note;

