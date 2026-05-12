-- =====================================================
-- CHECK CURRENT RLS POLICIES
-- This will show us what policies are already in place
-- =====================================================

-- Check all RLS policies for key tables
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
WHERE tablename IN (
    'event_registrations', 
    'community_content', 
    'poll_votes', 
    'community_members',
    'comments'
)
ORDER BY tablename, cmd, policyname;

-- Check if RLS is enabled on these tables
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN (
    'event_registrations', 
    'community_content', 
    'poll_votes', 
    'community_members',
    'comments'
);

-- Check table structures to understand the relationships
\d public.event_registrations
\d public.community_content
\d public.poll_votes
\d public.community_members

-- Show some sample data to understand the structure
SELECT 'event_registrations' as table_name, count(*) as row_count FROM public.event_registrations
UNION ALL
SELECT 'community_content', count(*) FROM public.community_content
UNION ALL
SELECT 'poll_votes', count(*) FROM public.poll_votes
UNION ALL
SELECT 'community_members', count(*) FROM public.community_members;
