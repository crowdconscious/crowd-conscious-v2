-- ================================================================
-- FIX: Add RLS policy for marketplace_modules
-- Error: "permission denied for table marketplace_modules"
-- ================================================================

-- Step 1: Check if RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename = 'marketplace_modules';

-- Step 2: Check current policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'marketplace_modules';

-- Step 3: Add SELECT policy for all authenticated users
-- Everyone should be able to VIEW modules (they're public in the marketplace)
CREATE POLICY "authenticated_users_can_view_modules" ON marketplace_modules
FOR SELECT
TO authenticated
USING (true);  -- All authenticated users can view all modules

-- Step 4: Verify the policy was created
SELECT 
  policyname,
  cmd as operation,
  'All authenticated users can view marketplace modules' as description
FROM pg_policies
WHERE tablename = 'marketplace_modules'
  AND policyname = 'authenticated_users_can_view_modules';

-- Step 5: Test the fix by simulating the dashboard query
-- Replace with your actual user_id from the debug output
/*
SELECT 
    ce.*,
    mm.id as "module.id",
    mm.title as "module.title",
    mm.description as "module.description",
    mm.core_value as "module.core_value",
    mm.slug as "module.slug"
FROM course_enrollments ce
LEFT JOIN marketplace_modules mm ON mm.id = ce.module_id
WHERE ce.user_id = '64b26179-f06a-4de7-9059-fe4e39797eca'
ORDER BY ce.purchased_at DESC;
*/

-- 🎉 After running this, the dashboard will work!

