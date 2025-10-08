-- =====================================================
-- FIX PROFILES RLS - Allow Profile Creation on Signup
-- =====================================================

-- Step 1: Check current policies on profiles table
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
WHERE tablename = 'profiles';

-- Step 2: Check if RLS is enabled
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE tablename = 'profiles';

-- Step 3: Drop any restrictive INSERT policies
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can only insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON profiles;

-- Step 4: Create a permissive INSERT policy
CREATE POLICY "Allow profile creation on signup"
ON profiles
FOR INSERT
WITH CHECK (true);

-- This allows the trigger to insert profiles for new users

-- Step 5: Verify RLS is enabled (it should be)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Step 6: Ensure other policies exist for SELECT/UPDATE
CREATE POLICY "Users can view all profiles" ON profiles
FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON profiles
FOR UPDATE USING (auth.uid() = id);

-- Step 7: Verify policies
SELECT 
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'profiles';

RAISE NOTICE '✅ Profile RLS policies updated!';
RAISE NOTICE 'INSERT: Allowed for trigger (WITH CHECK = true)';
RAISE NOTICE 'SELECT: Public (anyone can view)';
RAISE NOTICE 'UPDATE: Users can only update their own profile';

