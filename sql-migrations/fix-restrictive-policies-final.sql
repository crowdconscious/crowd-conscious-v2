-- =====================================================
-- FINAL FIX FOR RESTRICTIVE RLS POLICIES
-- This removes restrictive policies and adds permissive ones
-- =====================================================

BEGIN;

-- =====================================================
-- 1. EVENT REGISTRATIONS - Fix the restrictive policy
-- =====================================================

-- Remove the restrictive policy
DROP POLICY IF EXISTS "Community members can register for events" ON public.event_registrations;

-- Add a permissive policy for authenticated users
CREATE POLICY "Authenticated users can register for events" ON public.event_registrations
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- 2. POLL VOTES - Fix the restrictive policy
-- =====================================================

-- Remove the restrictive policy
DROP POLICY IF EXISTS "Community members can vote on polls" ON public.poll_votes;

-- Add a permissive policy for authenticated users
CREATE POLICY "Authenticated users can vote on polls" ON public.poll_votes
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- 3. COMMENTS - Fix the restrictive policy
-- =====================================================

-- Remove the restrictive policy
DROP POLICY IF EXISTS "Community members can create comments" ON public.comments;

-- The permissive policy "Users can create comments" already exists, so we're good

-- =====================================================
-- 4. COMMUNITY CONTENT - Keep existing permissive policy
-- =====================================================

-- The existing policy is fine for content creation

COMMIT;

-- =====================================================
-- VERIFICATION - Check the final policies
-- =====================================================

SELECT 
    tablename,
    policyname,
    cmd,
    CASE 
        WHEN with_check LIKE '%community_members%' THEN '❌ RESTRICTIVE'
        WHEN with_check LIKE '%auth.uid() = user_id%' THEN '✅ PERMISSIVE'
        ELSE '? UNKNOWN'
    END as policy_type,
    with_check
FROM pg_policies 
WHERE tablename IN ('event_registrations', 'poll_votes', 'comments', 'community_content')
AND cmd = 'INSERT'
ORDER BY tablename, policyname;

-- =====================================================
-- TEST QUERIES (Run these to verify the fix works)
-- =====================================================

-- Test 1: Check if you can now see the permissive policies
SELECT 'Testing event_registrations policies' as test;
SELECT policyname, cmd, with_check 
FROM pg_policies 
WHERE tablename = 'event_registrations' AND cmd = 'INSERT';

-- Test 2: Check poll votes policies  
SELECT 'Testing poll_votes policies' as test;
SELECT policyname, cmd, with_check 
FROM pg_policies 
WHERE tablename = 'poll_votes' AND cmd = 'INSERT';

-- Test 3: Check comments policies
SELECT 'Testing comments policies' as test;
SELECT policyname, cmd, with_check 
FROM pg_policies 
WHERE tablename = 'comments' AND cmd = 'INSERT';
