-- =====================================================
-- FIX DELETION POLICIES
-- =====================================================
-- Problem: No DELETE policies exist, so even admins can't delete
-- Solution: Add proper DELETE policies for admins and community founders
-- =====================================================

-- =====================================================
-- 1. COMMUNITIES - Allow admins to delete
-- =====================================================

-- Drop any existing delete policies
DROP POLICY IF EXISTS "Admins can delete communities" ON communities;
DROP POLICY IF EXISTS "Platform admins can delete communities" ON communities;

-- Allow platform admins to delete any community
CREATE POLICY "Platform admins can delete communities" ON communities
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_type = 'admin'
    )
  );

-- =====================================================
-- 2. COMMUNITY_CONTENT - Allow admins and founders to delete
-- =====================================================

-- Drop any existing delete policies
DROP POLICY IF EXISTS "Admins can delete content" ON community_content;
DROP POLICY IF EXISTS "Founders can delete content" ON community_content;
DROP POLICY IF EXISTS "Admins and founders can delete content" ON community_content;

-- Allow platform admins OR community founders/admins to delete content
CREATE POLICY "Admins and founders can delete content" ON community_content
  FOR DELETE USING (
    -- Platform admin can delete anything
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_type = 'admin'
    )
    OR
    -- Community founder/admin can delete content in their community
    EXISTS (
      SELECT 1 FROM community_members
      WHERE community_members.user_id = auth.uid()
      AND community_members.community_id = community_content.community_id
      AND community_members.role IN ('founder', 'admin')
    )
  );

-- =====================================================
-- 3. COMMENTS - Allow platform admins and content creators to delete
-- =====================================================

-- Drop any existing delete policies
DROP POLICY IF EXISTS "Users can delete own comments" ON comments;
DROP POLICY IF EXISTS "Admins can delete any comments" ON comments;
DROP POLICY IF EXISTS "Users and admins can delete comments" ON comments;

-- Allow users to delete their own comments, or admins to delete any
CREATE POLICY "Users and admins can delete comments" ON comments
  FOR DELETE USING (
    -- User's own comment
    user_id = auth.uid()
    OR
    -- Platform admin can delete any comment
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_type = 'admin'
    )
    OR
    -- Community founder/admin can delete comments in their community
    EXISTS (
      SELECT 1 FROM community_members
      JOIN community_content ON community_content.id = comments.content_id
      WHERE community_members.user_id = auth.uid()
      AND community_members.community_id = community_content.community_id
      AND community_members.role IN ('founder', 'admin')
    )
  );

-- =====================================================
-- 4. COMMUNITY_MEMBERS - Allow founders to remove members
-- =====================================================

-- Drop any existing delete policies
DROP POLICY IF EXISTS "Founders can remove members" ON community_members;
DROP POLICY IF EXISTS "Admins can manage members" ON community_members;

-- Allow founders/admins to remove members from their community
CREATE POLICY "Founders and admins can remove members" ON community_members
  FOR DELETE USING (
    -- Platform admin can remove anyone
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_type = 'admin'
    )
    OR
    -- Community founder/admin can remove members from their community
    EXISTS (
      SELECT 1 FROM community_members cm
      WHERE cm.user_id = auth.uid()
      AND cm.community_id = community_members.community_id
      AND cm.role IN ('founder', 'admin')
    )
    OR
    -- Users can leave communities themselves
    user_id = auth.uid()
  );

-- =====================================================
-- 5. VOTES - Allow voters to delete their own votes
-- =====================================================

-- Drop any existing delete policies
DROP POLICY IF EXISTS "Users can delete own votes" ON votes;

CREATE POLICY "Users can delete own votes" ON votes
  FOR DELETE USING (
    user_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_type = 'admin'
    )
  );

-- =====================================================
-- 6. SPONSORSHIPS - Allow platform admins only
-- =====================================================

-- Drop any existing delete policies
DROP POLICY IF EXISTS "Admins can delete sponsorships" ON sponsorships;

CREATE POLICY "Platform admins can delete sponsorships" ON sponsorships
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_type = 'admin'
    )
  );

-- =====================================================
-- 7. IMPACT_METRICS - Allow platform admins and community founders
-- =====================================================

-- Drop any existing delete policies
DROP POLICY IF EXISTS "Admins can delete metrics" ON impact_metrics;

CREATE POLICY "Admins and founders can delete metrics" ON impact_metrics
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_type = 'admin'
    )
    OR
    EXISTS (
      SELECT 1 FROM community_members
      WHERE community_members.user_id = auth.uid()
      AND community_members.community_id = impact_metrics.community_id
      AND community_members.role IN ('founder', 'admin')
    )
  );

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Run these to verify the policies were created:
SELECT tablename, policyname, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'public' 
AND cmd = 'DELETE'
ORDER BY tablename, policyname;

-- Test deletion as admin (replace with your admin user ID):
-- SELECT auth.uid(); -- Get your user ID
-- DELETE FROM communities WHERE id = 'some-test-community-id';

-- =====================================================
-- IMPORTANT NOTES
-- =====================================================
-- 1. Make sure you have at least one admin user:
--    UPDATE profiles SET user_type = 'admin' WHERE email = 'your@email.com';
--
-- 2. Test deletions after running this migration
--
-- 3. CASCADE deletions are handled by foreign keys:
--    - Deleting a community deletes all its content, members, etc.
--    - Deleting content deletes all votes, comments, etc.
--
-- 4. If you still can't delete, check:
--    - You're logged in as admin (user_type = 'admin')
--    - The profile exists in the profiles table
--    - RLS is enabled on all tables
-- =====================================================
