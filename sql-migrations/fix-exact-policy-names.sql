-- =====================================================
-- FIX WITH EXACT POLICY NAMES
-- Using the exact policy names from your database
-- =====================================================

BEGIN;

-- =====================================================
-- 1. EVENT REGISTRATIONS
-- =====================================================
-- From your list, I see: "Community members can register for events"
-- But the error suggests it might not exist or have a different name
-- Let's check what INSERT policies exist for event_registrations:

SELECT 'Current event_registrations INSERT policies:' as info;
SELECT policyname, with_check 
FROM pg_policies 
WHERE tablename = 'event_registrations' AND cmd = 'INSERT';

-- Try to drop the restrictive policy (if it exists)
DROP POLICY IF EXISTS "Community members can register for events" ON public.event_registrations;

-- Add permissive policy (only if it doesn't already exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'event_registrations' 
        AND policyname = 'Anyone can register for events'
        AND cmd = 'INSERT'
    ) THEN
        EXECUTE 'CREATE POLICY "Anyone can register for events" ON public.event_registrations FOR INSERT WITH CHECK (auth.uid() = user_id)';
    END IF;
END $$;

-- =====================================================
-- 2. POLL VOTES  
-- =====================================================
-- From your list: "Community members can vote on polls"

SELECT 'Current poll_votes INSERT policies:' as info;
SELECT policyname, with_check 
FROM pg_policies 
WHERE tablename = 'poll_votes' AND cmd = 'INSERT';

-- Drop the restrictive policy
DROP POLICY IF EXISTS "Community members can vote on polls" ON public.poll_votes;

-- Add permissive policy
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'poll_votes' 
        AND policyname = 'Anyone can vote on polls'
        AND cmd = 'INSERT'
    ) THEN
        EXECUTE 'CREATE POLICY "Anyone can vote on polls" ON public.poll_votes FOR INSERT WITH CHECK (auth.uid() = user_id)';
    END IF;
END $$;

-- =====================================================
-- 3. COMMENTS
-- =====================================================
-- From your list: "Community members can create comments"

SELECT 'Current comments INSERT policies:' as info;
SELECT policyname, with_check 
FROM pg_policies 
WHERE tablename = 'comments' AND cmd = 'INSERT';

-- Drop the restrictive policy
DROP POLICY IF EXISTS "Community members can create comments" ON public.comments;

-- The good policy "Users can create comments" already exists, so we're good

COMMIT;

-- =====================================================
-- FINAL VERIFICATION
-- =====================================================

SELECT 'FINAL VERIFICATION - INSERT policies after fix:' as info;

SELECT 
    tablename,
    policyname,
    cmd,
    CASE 
        WHEN with_check LIKE '%community_members%' THEN '❌ STILL RESTRICTIVE'
        WHEN with_check LIKE '%auth.uid() = user_id%' THEN '✅ GOOD'
        ELSE '? CHECK MANUALLY'
    END as status,
    with_check
FROM pg_policies 
WHERE tablename IN ('event_registrations', 'poll_votes', 'comments')
AND cmd = 'INSERT'
ORDER BY tablename, policyname;
