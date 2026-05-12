-- =====================================================
-- FIX EVENT REGISTRATION RLS POLICIES
-- This fixes the issue where only founders can register for events
-- =====================================================

BEGIN;

-- Enable RLS on event_registrations table
ALTER TABLE public.event_registrations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can view event registrations" ON public.event_registrations;
DROP POLICY IF EXISTS "Community members can register for events" ON public.event_registrations;
DROP POLICY IF EXISTS "Users can manage their own registrations" ON public.event_registrations;
DROP POLICY IF EXISTS "Users can cancel their own registrations" ON public.event_registrations;

-- 1. Allow anyone to view event registrations (for displaying attendee counts)
CREATE POLICY "Anyone can view event registrations" ON public.event_registrations
    FOR SELECT USING (true);

-- 2. Allow ANY authenticated user to register for events (not just community members)
-- This is more permissive and allows broader participation
CREATE POLICY "Authenticated users can register for events" ON public.event_registrations
    FOR INSERT WITH CHECK (
        auth.uid() = user_id AND
        auth.uid() IS NOT NULL
    );

-- 3. Allow users to update their own registrations (change attendee info, etc.)
CREATE POLICY "Users can update their own registrations" ON public.event_registrations
    FOR UPDATE USING (
        auth.uid() = user_id
    ) WITH CHECK (
        auth.uid() = user_id
    );

-- 4. Allow users to cancel (delete) their own registrations
CREATE POLICY "Users can cancel their own registrations" ON public.event_registrations
    FOR DELETE USING (
        auth.uid() = user_id
    );

-- Also ensure community_content (events) can be viewed by everyone
ALTER TABLE public.community_content ENABLE ROW LEVEL SECURITY;

-- Drop and recreate community_content policies to be more permissive
DROP POLICY IF EXISTS "Anyone can view community content" ON public.community_content;
CREATE POLICY "Anyone can view community content" ON public.community_content
    FOR SELECT USING (true);

-- Allow community members to create content (events, needs, etc.)
DROP POLICY IF EXISTS "Community members can create content" ON public.community_content;
CREATE POLICY "Community members can create content" ON public.community_content
    FOR INSERT WITH CHECK (
        auth.uid() IS NOT NULL AND
        EXISTS (
            SELECT 1 FROM public.community_members cm
            WHERE cm.community_id = community_content.community_id
            AND cm.user_id = auth.uid()
        )
    );

-- Allow content creators and community founders to update content
DROP POLICY IF EXISTS "Content creators and founders can update content" ON public.community_content;
CREATE POLICY "Content creators and founders can update content" ON public.community_content
    FOR UPDATE USING (
        auth.uid() = created_by OR
        EXISTS (
            SELECT 1 FROM public.community_members cm
            WHERE cm.community_id = community_content.community_id
            AND cm.user_id = auth.uid()
            AND cm.role = 'founder'
        )
    ) WITH CHECK (
        auth.uid() = created_by OR
        EXISTS (
            SELECT 1 FROM public.community_members cm
            WHERE cm.community_id = community_content.community_id
            AND cm.user_id = auth.uid()
            AND cm.role = 'founder'
        )
    );

-- Verify the policies were created
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename IN ('event_registrations', 'community_content')
ORDER BY tablename, policyname;

COMMIT;

-- =====================================================
-- TESTING QUERIES (Run these to verify the fix works)
-- =====================================================

-- Test 1: Check if event_registrations table has proper RLS
-- SELECT * FROM public.event_registrations LIMIT 5;

-- Test 2: Try to insert a registration (replace with real IDs)
-- INSERT INTO public.event_registrations (content_id, user_id, attendee_info, status)
-- VALUES ('your-event-id', auth.uid(), '{"name": "Test User"}', 'registered');

-- Test 3: Check community_content visibility
-- SELECT id, title, type FROM public.community_content WHERE type = 'event' LIMIT 5;
