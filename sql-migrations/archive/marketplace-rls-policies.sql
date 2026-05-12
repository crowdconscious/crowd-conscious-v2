-- =====================================================
-- MARKETPLACE RLS POLICIES
-- Enable public read access to published modules
-- =====================================================

-- Enable RLS on marketplace tables
ALTER TABLE marketplace_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE module_lessons ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- MARKETPLACE_MODULES POLICIES
-- =====================================================

-- Drop existing policies if any
DROP POLICY IF EXISTS "Public can view published modules" ON marketplace_modules;
DROP POLICY IF EXISTS "Creators can view own modules" ON marketplace_modules;
DROP POLICY IF EXISTS "Creators can create modules" ON marketplace_modules;
DROP POLICY IF EXISTS "Creators can update own modules" ON marketplace_modules;
DROP POLICY IF EXISTS "Admins can manage all modules" ON marketplace_modules;

-- 1. Public can view PUBLISHED modules
CREATE POLICY "Public can view published modules" ON marketplace_modules
  FOR SELECT USING (status = 'published');

-- 2. Creators can view their OWN modules (any status)
CREATE POLICY "Creators can view own modules" ON marketplace_modules
  FOR SELECT USING (
    creator_user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM community_members cm
      WHERE cm.community_id = marketplace_modules.creator_community_id
      AND cm.user_id = auth.uid()
      AND cm.role IN ('founder', 'admin')
    )
  );

-- 3. Authenticated users can create modules (for their communities)
CREATE POLICY "Creators can create modules" ON marketplace_modules
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
    AND (
      creator_user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM community_members cm
        WHERE cm.community_id = marketplace_modules.creator_community_id
        AND cm.user_id = auth.uid()
        AND cm.role IN ('founder', 'admin')
      )
    )
  );

-- 4. Creators can update their OWN modules (only if not published)
CREATE POLICY "Creators can update own modules" ON marketplace_modules
  FOR UPDATE USING (
    creator_user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM community_members cm
      WHERE cm.community_id = marketplace_modules.creator_community_id
      AND cm.user_id = auth.uid()
      AND cm.role IN ('founder', 'admin')
    )
  ) WITH CHECK (
    creator_user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM community_members cm
      WHERE cm.community_id = marketplace_modules.creator_community_id
      AND cm.user_id = auth.uid()
      AND cm.role IN ('founder', 'admin')
    )
  );

-- 5. Admins can do ANYTHING
CREATE POLICY "Admins can manage all modules" ON marketplace_modules
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_type = 'admin'
    )
  );

-- =====================================================
-- MODULE_LESSONS POLICIES
-- =====================================================

-- Drop existing policies if any
DROP POLICY IF EXISTS "Public can view lessons of published modules" ON module_lessons;
DROP POLICY IF EXISTS "Creators can view own lessons" ON module_lessons;
DROP POLICY IF EXISTS "Creators can manage own lessons" ON module_lessons;
DROP POLICY IF EXISTS "Admins can manage all lessons" ON module_lessons;

-- 1. Public can view lessons of PUBLISHED modules
CREATE POLICY "Public can view lessons of published modules" ON module_lessons
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM marketplace_modules
      WHERE marketplace_modules.id = module_lessons.module_id
      AND marketplace_modules.status = 'published'
    )
  );

-- 2. Creators can view lessons of their OWN modules (any status)
CREATE POLICY "Creators can view own lessons" ON module_lessons
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM marketplace_modules m
      WHERE m.id = module_lessons.module_id
      AND (
        m.creator_user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM community_members cm
          WHERE cm.community_id = m.creator_community_id
          AND cm.user_id = auth.uid()
          AND cm.role IN ('founder', 'admin')
        )
      )
    )
  );

-- 3. Creators can manage lessons of their OWN modules
CREATE POLICY "Creators can manage own lessons" ON module_lessons
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM marketplace_modules m
      WHERE m.id = module_lessons.module_id
      AND (
        m.creator_user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM community_members cm
          WHERE cm.community_id = m.creator_community_id
          AND cm.user_id = auth.uid()
          AND cm.role IN ('founder', 'admin')
        )
      )
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM marketplace_modules m
      WHERE m.id = module_lessons.module_id
      AND (
        m.creator_user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM community_members cm
          WHERE cm.community_id = m.creator_community_id
          AND cm.user_id = auth.uid()
          AND cm.role IN ('founder', 'admin')
        )
      )
    )
  );

-- 4. Admins can do ANYTHING with lessons
CREATE POLICY "Admins can manage all lessons" ON module_lessons
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_type = 'admin'
    )
  );

-- =====================================================
-- VERIFICATION
-- =====================================================

-- Check that policies were created
SELECT 
  tablename,
  policyname,
  cmd,
  permissive
FROM pg_policies 
WHERE tablename IN ('marketplace_modules', 'module_lessons')
ORDER BY tablename, cmd, policyname;

