-- =====================================================
-- DIAGNOSE SIGNUP TRIGGER - Find What's Broken
-- =====================================================

-- Step 1: Check if the trigger function exists
SELECT 
  proname as function_name,
  prosrc as function_code
FROM pg_proc 
WHERE proname = 'handle_new_user';

-- Step 2: Check if the trigger exists
SELECT 
  trigger_name,
  event_object_table,
  action_statement,
  action_timing,
  event_manipulation
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';

-- Step 3: Check profiles table structure
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'profiles'
ORDER BY ordinal_position;

-- Step 4: Check if there are ANY triggers on auth.users
SELECT 
  trigger_name,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'users'
  AND trigger_schema = 'auth';

-- Step 5: Try to manually create a test profile
-- (This will tell us if the issue is with INSERT itself)
DO $$
DECLARE
  test_id uuid := gen_random_uuid();
BEGIN
  -- Try to insert a test profile
  INSERT INTO profiles (id, email, full_name, user_type)
  VALUES (test_id, 'test@example.com', 'Test User', 'user');
  
  RAISE NOTICE '✅ Manual insert works! Issue is with the trigger.';
  
  -- Clean up test data
  DELETE FROM profiles WHERE id = test_id;
  
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE '❌ Manual insert failed: %', SQLERRM;
  RAISE NOTICE 'This means RLS or constraints are blocking inserts.';
END $$;

-- Step 6: Check RLS status
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename = 'profiles';

-- Step 7: List all policies
SELECT 
  policyname,
  cmd,
  roles,
  qual as using_clause,
  with_check
FROM pg_policies
WHERE tablename = 'profiles';

