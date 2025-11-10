-- =====================================================
-- FIX ALL CRITICAL ISSUES
-- =====================================================
-- Purpose: Fix review system and dashboard loading
-- Date: November 10, 2025
-- =====================================================

-- =====================================================
-- ISSUE 1: Review System Tables
-- =====================================================

-- Drop and recreate if needed
DROP TABLE IF EXISTS module_review_votes CASCADE;
DROP TABLE IF EXISTS community_review_votes CASCADE;
DROP TABLE IF EXISTS module_reviews CASCADE;
DROP TABLE IF EXISTS community_reviews CASCADE;

-- Create module_reviews table
CREATE TABLE module_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- What is being reviewed
  module_id UUID REFERENCES marketplace_modules(id) ON DELETE CASCADE NOT NULL,
  
  -- Who is reviewing
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Review content
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title TEXT,
  review_text TEXT,
  
  -- Review details
  would_recommend BOOLEAN DEFAULT TRUE,
  completion_status TEXT CHECK (completion_status IN ('completed', 'in_progress', 'not_started')) DEFAULT 'completed',
  
  -- Helpfulness (voted by other users)
  helpful_count INTEGER DEFAULT 0,
  not_helpful_count INTEGER DEFAULT 0,
  
  -- Moderation
  is_verified_purchase BOOLEAN DEFAULT FALSE,
  is_flagged BOOLEAN DEFAULT FALSE,
  flagged_reason TEXT,
  admin_response TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Prevent duplicate reviews
  UNIQUE(module_id, user_id)
);

-- Create indexes
CREATE INDEX idx_module_reviews_module ON module_reviews(module_id);
CREATE INDEX idx_module_reviews_user ON module_reviews(user_id);
CREATE INDEX idx_module_reviews_rating ON module_reviews(rating DESC);
CREATE INDEX idx_module_reviews_created ON module_reviews(created_at DESC);

-- =====================================================
-- RLS POLICIES FOR MODULE_REVIEWS
-- =====================================================

ALTER TABLE module_reviews ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can read module reviews" ON module_reviews;
DROP POLICY IF EXISTS "Users can create module reviews" ON module_reviews;
DROP POLICY IF EXISTS "Users can update own module reviews" ON module_reviews;
DROP POLICY IF EXISTS "Users can delete own module reviews" ON module_reviews;

-- Anyone can read reviews
CREATE POLICY "Anyone can read module reviews" ON module_reviews
  FOR SELECT USING (TRUE);

-- Users can create reviews if they're enrolled
CREATE POLICY "Users can create module reviews" ON module_reviews
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM course_enrollments
      WHERE user_id = auth.uid() AND module_id = module_reviews.module_id
    )
  );

-- Users can update their own reviews
CREATE POLICY "Users can update own module reviews" ON module_reviews
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own reviews
CREATE POLICY "Users can delete own module reviews" ON module_reviews
  FOR DELETE USING (auth.uid() = user_id);

-- =====================================================
-- ISSUE 2: Dashboard RLS - Ensure marketplace_modules readable
-- =====================================================

-- Drop and recreate marketplace_modules view policy
DROP POLICY IF EXISTS "authenticated_users_can_view_modules" ON marketplace_modules;
DROP POLICY IF EXISTS "Anyone can view published modules" ON marketplace_modules;

CREATE POLICY "Anyone can view published modules" ON marketplace_modules
  FOR SELECT USING (status = 'published' OR auth.uid() = creator_user_id);

-- =====================================================
-- ISSUE 3: Check RLS on course_enrollments
-- =====================================================

-- Ensure users can see their own enrollments
DROP POLICY IF EXISTS "Users can view own enrollments" ON course_enrollments;

CREATE POLICY "Users can view own enrollments" ON course_enrollments
  FOR SELECT USING (
    auth.uid() = user_id OR
    auth.uid() IN (
      SELECT id FROM profiles
      WHERE corporate_account_id = course_enrollments.corporate_account_id
      AND corporate_role = 'admin'
    )
  );

-- =====================================================
-- ISSUE 4: Ensure profiles table has proper columns
-- =====================================================

-- Add missing columns if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'full_name') THEN
    ALTER TABLE profiles ADD COLUMN full_name TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'avatar_url') THEN
    ALTER TABLE profiles ADD COLUMN avatar_url TEXT;
  END IF;
END $$;

-- =====================================================
-- PERMISSIONS
-- =====================================================

GRANT SELECT ON module_reviews TO authenticated;
GRANT INSERT ON module_reviews TO authenticated;
GRANT UPDATE ON module_reviews TO authenticated;
GRANT DELETE ON module_reviews TO authenticated;

GRANT SELECT ON marketplace_modules TO authenticated, anon;
GRANT SELECT ON course_enrollments TO authenticated;
GRANT SELECT ON profiles TO authenticated;

-- =====================================================
-- DIAGNOSTIC QUERIES
-- =====================================================

-- Check if module_reviews table was created
SELECT 
  'module_reviews table exists' as status,
  COUNT(*) as review_count
FROM module_reviews;

-- Check if RLS policies exist
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename IN ('module_reviews', 'course_enrollments', 'marketplace_modules')
ORDER BY tablename, policyname;

-- Check published modules count
SELECT 
  'Published modules' as category,
  COUNT(*) as count
FROM marketplace_modules
WHERE status = 'published';

-- Check total enrollments
SELECT 
  'Total enrollments' as category,
  COUNT(*) as count
FROM course_enrollments;

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '✅ ========================================';
  RAISE NOTICE '✅ CRITICAL FIXES APPLIED SUCCESSFULLY!';
  RAISE NOTICE '✅ ========================================';
  RAISE NOTICE '';
  RAISE NOTICE '✅ module_reviews table created';
  RAISE NOTICE '✅ RLS policies configured';
  RAISE NOTICE '✅ Dashboard permissions fixed';
  RAISE NOTICE '';
  RAISE NOTICE '🔄 NEXT STEPS:';
  RAISE NOTICE '1. Run CHECK-USER-ENROLLMENTS.sql to verify user data';
  RAISE NOTICE '2. Hard refresh browser (Ctrl+Shift+R)';
  RAISE NOTICE '3. Test review creation';
  RAISE NOTICE '4. Check dashboard loads courses';
  RAISE NOTICE '';
END $$;

