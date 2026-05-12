-- =====================================================
-- REMOVE RESTRICTIVE RLS POLICIES
-- This removes the policies that require community membership
-- =====================================================

BEGIN;

-- Remove the restrictive event registration policy
DROP POLICY IF EXISTS "Community members can register for events" ON public.event_registrations;

-- Remove the restrictive poll voting policy  
DROP POLICY IF EXISTS "Community members can vote on polls" ON public.poll_votes;

-- Remove the restrictive comment creation policy
DROP POLICY IF EXISTS "Community members can create comments" ON public.comments;

-- Remove the restrictive content creation policy (if it exists)
DROP POLICY IF EXISTS "Community members can create content" ON public.community_content;

-- Verify the remaining policies are permissive
SELECT 
    tablename,
    policyname,
    cmd,
    with_check
FROM pg_policies 
WHERE tablename IN ('event_registrations', 'poll_votes', 'comments', 'community_content')
AND cmd = 'INSERT'
ORDER BY tablename, policyname;

COMMIT;

-- =====================================================
-- EXPECTED RESULT: Only these INSERT policies should remain:
-- =====================================================
-- event_registrations: No INSERT policies OR only permissive ones
-- poll_votes: No INSERT policies OR only permissive ones  
-- comments: "Users can create comments" (simple auth.uid() = user_id check)
-- community_content: Permissive policies only
