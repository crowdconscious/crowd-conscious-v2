-- =====================================================
-- COMPREHENSIVE RLS POLICY FIX
-- This fixes all RLS issues preventing user interactions
-- =====================================================

BEGIN;

-- =====================================================
-- 1. EVENT REGISTRATIONS - Allow all authenticated users
-- =====================================================

-- Enable RLS
ALTER TABLE public.event_registrations ENABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies first
DROP POLICY IF EXISTS "Anyone can view event registrations" ON public.event_registrations;
DROP POLICY IF EXISTS "Community members can register for events" ON public.event_registrations;
DROP POLICY IF EXISTS "Users can manage their own registrations" ON public.event_registrations;
DROP POLICY IF EXISTS "Users can cancel their own registrations" ON public.event_registrations;
DROP POLICY IF EXISTS "Users can update their own registrations" ON public.event_registrations;
DROP POLICY IF EXISTS "Authenticated users can register for events" ON public.event_registrations;

-- Create new permissive policies
CREATE POLICY "Public can view event registrations" ON public.event_registrations
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can register" ON public.event_registrations
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own registrations" ON public.event_registrations
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own registrations" ON public.event_registrations
    FOR DELETE USING (auth.uid() = user_id);

-- =====================================================
-- 2. POLL VOTES - Allow all authenticated users
-- =====================================================

-- Enable RLS
ALTER TABLE public.poll_votes ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can view poll votes" ON public.poll_votes;
DROP POLICY IF EXISTS "Community members can vote on polls" ON public.poll_votes;
DROP POLICY IF EXISTS "Users can update their own votes" ON public.poll_votes;
DROP POLICY IF EXISTS "Users can delete their own votes" ON public.poll_votes;

-- Create new permissive policies
CREATE POLICY "Public can view poll votes" ON public.poll_votes
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can vote" ON public.poll_votes
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own votes" ON public.poll_votes
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own votes" ON public.poll_votes
    FOR DELETE USING (auth.uid() = user_id);

-- =====================================================
-- 3. COMMUNITY CONTENT - More permissive viewing
-- =====================================================

-- Enable RLS
ALTER TABLE public.community_content ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can view community content" ON public.community_content;
DROP POLICY IF EXISTS "Community members can create content" ON public.community_content;
DROP POLICY IF EXISTS "Content creators and founders can update content" ON public.community_content;

-- Create new permissive policies
CREATE POLICY "Public can view all content" ON public.community_content
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create content" ON public.community_content
    FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Content creators can update own content" ON public.community_content
    FOR UPDATE USING (auth.uid() = created_by) WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Content creators can delete own content" ON public.community_content
    FOR DELETE USING (auth.uid() = created_by);

-- =====================================================
-- 4. COMMENTS - Allow all authenticated users
-- =====================================================

-- Enable RLS
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can view comments" ON public.comments;
DROP POLICY IF EXISTS "Community members can comment" ON public.comments;
DROP POLICY IF EXISTS "Users can update their own comments" ON public.comments;
DROP POLICY IF EXISTS "Users can delete their own comments" ON public.comments;

-- Create new permissive policies
CREATE POLICY "Public can view comments" ON public.comments
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can comment" ON public.comments
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own comments" ON public.comments
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own comments" ON public.comments
    FOR DELETE USING (auth.uid() = user_id);

-- =====================================================
-- 5. COMMUNITY MEMBERS - Allow viewing and joining
-- =====================================================

-- Enable RLS
ALTER TABLE public.community_members ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can view community members" ON public.community_members;
DROP POLICY IF EXISTS "Users can join communities" ON public.community_members;
DROP POLICY IF EXISTS "Users can leave communities" ON public.community_members;
DROP POLICY IF EXISTS "Founders can manage members" ON public.community_members;

-- Create new permissive policies
CREATE POLICY "Public can view community members" ON public.community_members
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can join communities" ON public.community_members
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can leave communities" ON public.community_members
    FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Founders can manage all members" ON public.community_members
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.community_members cm
            WHERE cm.community_id = community_members.community_id
            AND cm.user_id = auth.uid()
            AND cm.role = 'founder'
        )
    );

-- =====================================================
-- 6. COMMUNITIES - Allow viewing and creation
-- =====================================================

-- Enable RLS
ALTER TABLE public.communities ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can view communities" ON public.communities;
DROP POLICY IF EXISTS "Authenticated users can create communities" ON public.communities;
DROP POLICY IF EXISTS "Founders can update their communities" ON public.communities;

-- Create new permissive policies
CREATE POLICY "Public can view communities" ON public.communities
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create communities" ON public.communities
    FOR INSERT WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Founders can update communities" ON public.communities
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.community_members cm
            WHERE cm.community_id = communities.id
            AND cm.user_id = auth.uid()
            AND cm.role = 'founder'
        )
    ) WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.community_members cm
            WHERE cm.community_id = communities.id
            AND cm.user_id = auth.uid()
            AND cm.role = 'founder'
        )
    );

COMMIT;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Check all policies were created correctly
SELECT 
    tablename,
    policyname,
    cmd,
    permissive,
    qual
FROM pg_policies 
WHERE tablename IN (
    'event_registrations', 
    'community_content', 
    'poll_votes', 
    'community_members',
    'comments',
    'communities'
)
ORDER BY tablename, cmd;

-- Test queries (uncomment to test after running the above)
-- SELECT 'Testing event_registrations' as test;
-- SELECT count(*) FROM public.event_registrations;

-- SELECT 'Testing community_content' as test;
-- SELECT count(*) FROM public.community_content;

-- SELECT 'Testing poll_votes' as test;
-- SELECT count(*) FROM public.poll_votes;
