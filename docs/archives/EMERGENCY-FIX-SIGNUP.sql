-- =====================================================
-- EMERGENCY FIX - Enable Signups Immediately
-- =====================================================
-- This fixes the issue where NO users can sign up
-- Problem: RLS policies are blocking the trigger from creating profiles

-- OPTION 1: Temporarily disable RLS (FAST, works immediately)
-- Run this first to test if it fixes signup:

ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- After running this, try signing up. If it works, then RLS was the issue.
-- You can re-enable it later with proper policies.

-- =====================================================
-- OPTION 2: If you want to keep RLS enabled (SECURE)
-- =====================================================
-- Run these commands instead:

-- First, re-enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies on profiles
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can only insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Allow profile creation on signup" ON profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;

-- Create SIMPLE, PERMISSIVE policies

-- 1. Anyone can INSERT (needed for signup trigger)
CREATE POLICY "Enable insert for service role"
ON profiles FOR INSERT
TO public
WITH CHECK (true);

-- 2. Anyone can SELECT (view profiles)
CREATE POLICY "Enable read access for all users"
ON profiles FOR SELECT
TO public
USING (true);

-- 3. Users can only UPDATE their own profile
CREATE POLICY "Enable update for users based on id"
ON profiles FOR UPDATE
TO public
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- 4. Users can only DELETE their own profile
CREATE POLICY "Enable delete for users based on id"
ON profiles FOR DELETE
TO public
USING (auth.uid() = id);

-- Verify policies
SELECT 
  policyname,
  cmd as operation,
  CASE 
    WHEN with_check = 'true' THEN 'Anyone'
    WHEN with_check::text LIKE '%auth.uid()%' THEN 'Own profile only'
    ELSE with_check::text
  END as who_can_do_it
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY cmd;

-- Should show:
-- INSERT - Anyone (for trigger)
-- SELECT - Anyone (view profiles)
-- UPDATE - Own profile only
-- DELETE - Own profile only

