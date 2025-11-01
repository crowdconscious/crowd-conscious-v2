-- =====================================================
-- CHECK USER STATS TRIGGER - This is likely the problem
-- =====================================================

-- Step 1: Check if the function exists
SELECT 
  proname as function_name,
  prosrc as function_code
FROM pg_proc 
WHERE proname = 'create_user_stats_on_signup';

-- Step 2: Check if user_stats table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'user_stats'
) as user_stats_table_exists;

-- Step 3: Check user_stats table structure
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'user_stats'
ORDER BY ordinal_position;

-- Step 4: Check RLS on user_stats
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename = 'user_stats';

-- Step 5: Check policies on user_stats
SELECT 
  policyname,
  cmd,
  with_check
FROM pg_policies
WHERE tablename = 'user_stats';

-- =====================================================
-- EMERGENCY FIX: Disable the stats trigger temporarily
-- =====================================================
-- If this trigger is causing the issue, we can disable it
-- and re-enable it after fixing the user_stats table/policies

-- Uncomment to disable:
-- DROP TRIGGER IF EXISTS on_auth_user_created_stats ON auth.users;

-- This will allow signups to work while we fix user_stats

