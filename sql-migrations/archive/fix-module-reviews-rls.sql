-- =====================================================
-- FIX MODULE REVIEWS RLS POLICIES
-- =====================================================
-- 
-- Issue: Reviews are saving but not visible to other users
-- Cause: Conflicting RLS policies - one requires 'approved = true'
-- Solution: Ensure policy allows anyone to read all reviews
-- =====================================================

BEGIN;

-- =====================================================
-- 1. DROP ALL EXISTING POLICIES
-- =====================================================

DROP POLICY IF EXISTS "Anyone can read module reviews" ON module_reviews;
DROP POLICY IF EXISTS "Anyone can view approved reviews" ON module_reviews;
DROP POLICY IF EXISTS "Users can create module reviews" ON module_reviews;
DROP POLICY IF EXISTS "Users can update own module reviews" ON module_reviews;
DROP POLICY IF EXISTS "Users can delete own module reviews" ON module_reviews;
DROP POLICY IF EXISTS "Employees can create their own reviews" ON module_reviews;
DROP POLICY IF EXISTS "Employees can update their own reviews" ON module_reviews;

-- =====================================================
-- 2. CREATE CORRECT POLICIES
-- =====================================================

-- Anyone can read ALL reviews (no approval required)
CREATE POLICY "Anyone can read module reviews" ON module_reviews
  FOR SELECT 
  USING (TRUE);

-- Users can create reviews if they're enrolled
CREATE POLICY "Users can create module reviews" ON module_reviews
  FOR INSERT 
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM course_enrollments
      WHERE user_id = auth.uid() 
      AND module_id = module_reviews.module_id
    )
  );

-- Users can update their own reviews
CREATE POLICY "Users can update own module reviews" ON module_reviews
  FOR UPDATE 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own reviews
CREATE POLICY "Users can delete own module reviews" ON module_reviews
  FOR DELETE 
  USING (auth.uid() = user_id);

-- =====================================================
-- 3. VERIFY POLICIES
-- =====================================================

-- Check policies were created
SELECT 
  tablename,
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'module_reviews'
ORDER BY cmd, policyname;

COMMIT;

-- =====================================================
-- VERIFICATION
-- =====================================================

-- Test query (should return all reviews)
-- SELECT * FROM module_reviews LIMIT 10;

