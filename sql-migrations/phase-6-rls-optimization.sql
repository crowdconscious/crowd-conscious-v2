-- =====================================================
-- PHASE 6: RLS POLICY OPTIMIZATION
-- =====================================================
-- 
-- This migration optimizes RLS policies by:
-- 1. Converting subqueries to cached functions
-- 2. Adding indexes for RLS checks
-- 3. Simplifying complex policies
-- 4. Using SECURITY DEFINER functions for complex logic
--
-- Expected Impact:
-- - Faster query execution (10-50% improvement)
-- - Reduced database load
-- - Better scalability
-- =====================================================

BEGIN;

-- =====================================================
-- 1. CREATE HELPER FUNCTIONS FOR COMMON RLS CHECKS
-- =====================================================

-- Function to check if user is admin (cached)
CREATE OR REPLACE FUNCTION is_admin(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = p_user_id
    AND (user_type = 'admin' OR email = 'francisco@crowdconscious.app')
  );
$$;

-- Function to check if user is community member
CREATE OR REPLACE FUNCTION is_community_member(p_user_id UUID, p_community_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM community_members
    WHERE user_id = p_user_id
    AND community_id = p_community_id
  );
$$;

-- Function to check if user is community admin/moderator
CREATE OR REPLACE FUNCTION is_community_admin(p_user_id UUID, p_community_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM community_members
    WHERE user_id = p_user_id
    AND community_id = p_community_id
    AND role IN ('admin', 'moderator', 'founder')
  );
$$;

-- Function to check if user owns content
CREATE OR REPLACE FUNCTION owns_content(p_user_id UUID, p_content_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM community_content
    WHERE id = p_content_id
    AND created_by = p_user_id
  );
$$;

-- Function to check corporate account membership
CREATE OR REPLACE FUNCTION is_corporate_member(p_user_id UUID, p_corporate_account_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = p_user_id
    AND corporate_account_id = p_corporate_account_id
  );
$$;

-- =====================================================
-- 2. ADD INDEXES FOR RLS CHECKS
-- =====================================================

-- Indexes for profiles table (used in many RLS checks)
CREATE INDEX IF NOT EXISTS idx_profiles_user_type ON profiles(user_type) WHERE user_type = 'admin';
CREATE INDEX IF NOT EXISTS idx_profiles_corporate_account_id ON profiles(corporate_account_id) WHERE corporate_account_id IS NOT NULL;

-- Indexes for community_members (used in RLS checks)
CREATE INDEX IF NOT EXISTS idx_community_members_user_community ON community_members(user_id, community_id);
CREATE INDEX IF NOT EXISTS idx_community_members_role ON community_members(community_id, role) WHERE role IN ('admin', 'moderator', 'founder');

-- Indexes for community_content (used in RLS checks)
CREATE INDEX IF NOT EXISTS idx_community_content_created_by ON community_content(created_by);
CREATE INDEX IF NOT EXISTS idx_community_content_community_id ON community_content(community_id);

-- Indexes for course_enrollments (used in RLS checks)
CREATE INDEX IF NOT EXISTS idx_course_enrollments_user_id ON course_enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_course_enrollments_corporate_account_id ON course_enrollments(corporate_account_id) WHERE corporate_account_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_course_enrollments_module_id ON course_enrollments(module_id) WHERE module_id IS NOT NULL;

-- Indexes for comments (used in RLS checks)
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_content_id ON comments(content_id);

-- Indexes for sponsorships (used in RLS checks)
CREATE INDEX IF NOT EXISTS idx_sponsorships_sponsor_id ON sponsorships(sponsor_id);
CREATE INDEX IF NOT EXISTS idx_sponsorships_content_id ON sponsorships(content_id);

-- =====================================================
-- 3. OPTIMIZE EXISTING POLICIES (Examples)
-- =====================================================

-- Note: These are examples. Actual policy updates should be done carefully
-- after auditing existing policies in production.

-- Example: Optimize deletion_requests policy
-- BEFORE: Uses subquery in policy
-- AFTER: Uses helper function

-- Drop old policy if exists
DROP POLICY IF EXISTS "Admins can view all deletion requests" ON deletion_requests;

-- Create optimized policy using helper function
CREATE POLICY "Admins can view all deletion requests" ON deletion_requests
  FOR SELECT
  USING (is_admin(auth.uid()));

-- =====================================================
-- 4. GRANT EXECUTE PERMISSIONS
-- =====================================================

GRANT EXECUTE ON FUNCTION is_admin(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION is_community_member(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION is_community_admin(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION owns_content(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION is_corporate_member(UUID, UUID) TO authenticated;

-- =====================================================
-- 5. ANALYZE TABLES FOR BETTER QUERY PLANNING
-- =====================================================

ANALYZE profiles;
ANALYZE community_members;
ANALYZE community_content;
ANALYZE course_enrollments;
ANALYZE comments;
ANALYZE sponsorships;

COMMIT;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Check if functions were created
SELECT 
  routine_name,
  routine_type,
  security_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN (
  'is_admin',
  'is_community_member',
  'is_community_admin',
  'owns_content',
  'is_corporate_member'
)
ORDER BY routine_name;

-- Check if indexes were created
SELECT 
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
AND (
  indexname LIKE 'idx_profiles%' OR
  indexname LIKE 'idx_community_members%' OR
  indexname LIKE 'idx_community_content%' OR
  indexname LIKE 'idx_course_enrollments%' OR
  indexname LIKE 'idx_comments%' OR
  indexname LIKE 'idx_sponsorships%'
)
ORDER BY tablename, indexname;

