-- =====================================================
-- SAFE POLICY FIX - Check first, then fix
-- =====================================================

-- First, let's see exactly what INSERT policies exist
SELECT 'EVENT REGISTRATIONS - Current INSERT policies:' as table_info;
SELECT policyname, with_check 
FROM pg_policies 
WHERE tablename = 'event_registrations' AND cmd = 'INSERT';

SELECT 'POLL VOTES - Current INSERT policies:' as table_info;
SELECT policyname, with_check 
FROM pg_policies 
WHERE tablename = 'poll_votes' AND cmd = 'INSERT';

SELECT 'COMMENTS - Current INSERT policies:' as table_info;
SELECT policyname, with_check 
FROM pg_policies 
WHERE tablename = 'comments' AND cmd = 'INSERT';

-- =====================================================
-- Now let's fix them one by one
-- =====================================================

BEGIN;

-- Fix POLL VOTES (this one definitely exists from your list)
DROP POLICY IF EXISTS "Community members can vote on polls" ON public.poll_votes;

CREATE POLICY "Authenticated users can vote" ON public.poll_votes
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Fix COMMENTS (this one definitely exists from your list)  
DROP POLICY IF EXISTS "Community members can create comments" ON public.comments;
-- Note: "Users can create comments" already exists and is good

-- For EVENT REGISTRATIONS, let's be more careful
-- First check if the restrictive policy exists with a different name
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    -- Find any INSERT policy that requires community membership
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'event_registrations' 
        AND cmd = 'INSERT'
        AND with_check LIKE '%community_members%'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.event_registrations', policy_record.policyname);
        RAISE NOTICE 'Dropped restrictive policy: %', policy_record.policyname;
    END LOOP;
    
    -- Create the permissive policy
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'event_registrations' 
        AND cmd = 'INSERT'
        AND with_check = '(auth.uid() = user_id)'
    ) THEN
        CREATE POLICY "Authenticated users can register" ON public.event_registrations
            FOR INSERT WITH CHECK (auth.uid() = user_id);
        RAISE NOTICE 'Created permissive event registration policy';
    END IF;
END $$;

COMMIT;

-- =====================================================
-- VERIFICATION
-- =====================================================

SELECT 'AFTER FIX - All INSERT policies:' as verification;
SELECT 
    tablename,
    policyname,
    CASE 
        WHEN with_check LIKE '%community_members%' THEN '❌ STILL RESTRICTIVE'
        WHEN with_check LIKE '%auth.uid() = user_id%' THEN '✅ PERMISSIVE'
        ELSE '? UNKNOWN'
    END as policy_type,
    with_check
FROM pg_policies 
WHERE tablename IN ('event_registrations', 'poll_votes', 'comments')
AND cmd = 'INSERT'
ORDER BY tablename, policyname;
