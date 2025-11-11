-- =========================================
-- FIX: Community Member Count Inconsistency
-- =========================================
-- Issue: Communities show wrong member counts
-- Root Cause: member_count column not auto-updating
-- Impact: Makes platform look broken, damages credibility
-- Priority: P0 - CRITICAL
-- Time: 15 minutes

-- =========================================
-- STEP 1: Update all member counts to match reality
-- =========================================

UPDATE communities c
SET member_count = (
  SELECT COUNT(*)
  FROM community_members cm
  WHERE cm.community_id = c.id
)
WHERE TRUE;

-- Verify the fix
SELECT 
  c.id,
  c.name,
  c.member_count as stored_count,
  COUNT(cm.id) as actual_count,
  CASE 
    WHEN c.member_count = COUNT(cm.id) THEN '✅ FIXED'
    ELSE '❌ MISMATCH'
  END as status
FROM communities c
LEFT JOIN community_members cm ON cm.community_id = c.id
GROUP BY c.id, c.name, c.member_count
ORDER BY actual_count DESC;

-- =========================================
-- STEP 2: Create trigger to auto-update member_count
-- =========================================

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS update_community_member_count_trigger ON community_members;
DROP FUNCTION IF EXISTS update_community_member_count();

-- Create function to update member count
CREATE OR REPLACE FUNCTION update_community_member_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Increment member_count when new member joins
    UPDATE communities
    SET member_count = member_count + 1,
        updated_at = NOW()
    WHERE id = NEW.community_id;
    RETURN NEW;
    
  ELSIF TG_OP = 'DELETE' THEN
    -- Decrement member_count when member leaves
    UPDATE communities
    SET member_count = GREATEST(member_count - 1, 0),
        updated_at = NOW()
    WHERE id = OLD.community_id;
    RETURN OLD;
    
  ELSIF TG_OP = 'UPDATE' THEN
    -- Handle case where member changes community (rare)
    IF OLD.community_id != NEW.community_id THEN
      -- Decrement old community
      UPDATE communities
      SET member_count = GREATEST(member_count - 1, 0),
          updated_at = NOW()
      WHERE id = OLD.community_id;
      
      -- Increment new community
      UPDATE communities
      SET member_count = member_count + 1,
          updated_at = NOW()
      WHERE id = NEW.community_id;
    END IF;
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Create trigger that fires on INSERT, UPDATE, DELETE
CREATE TRIGGER update_community_member_count_trigger
AFTER INSERT OR UPDATE OR DELETE ON community_members
FOR EACH ROW
EXECUTE FUNCTION update_community_member_count();

-- =========================================
-- STEP 3: Test the trigger
-- =========================================

-- Test with a fake insert (then rollback)
-- DO $$
-- DECLARE
--   test_community_id UUID;
--   test_user_id UUID;
--   before_count INT;
--   after_count INT;
-- BEGIN
--   -- Get first community
--   SELECT id INTO test_community_id FROM communities LIMIT 1;
--   SELECT id INTO test_user_id FROM auth.users LIMIT 1;
--   
--   -- Get before count
--   SELECT member_count INTO before_count FROM communities WHERE id = test_community_id;
--   RAISE NOTICE 'Before count: %', before_count;
--   
--   -- Insert test member
--   INSERT INTO community_members (community_id, user_id, role)
--   VALUES (test_community_id, test_user_id, 'member');
--   
--   -- Get after count
--   SELECT member_count INTO after_count FROM communities WHERE id = test_community_id;
--   RAISE NOTICE 'After count: %', after_count;
--   
--   -- Rollback test
--   RAISE EXCEPTION 'Test successful, rolling back';
-- END $$;

-- =========================================
-- VERIFICATION QUERIES
-- =========================================

-- Check all communities have correct counts
SELECT 
  c.name,
  c.member_count as stored,
  COUNT(cm.id) as actual,
  c.member_count - COUNT(cm.id) as difference
FROM communities c
LEFT JOIN community_members cm ON cm.community_id = c.id
GROUP BY c.id, c.name, c.member_count
HAVING c.member_count != COUNT(cm.id)
ORDER BY ABS(c.member_count - COUNT(cm.id)) DESC;

-- If above query returns 0 rows, all counts are correct! ✅

-- =========================================
-- SUCCESS MESSAGE
-- =========================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ ========================================';
  RAISE NOTICE '✅ COMMUNITY MEMBER COUNTS FIXED!';
  RAISE NOTICE '✅ ========================================';
  RAISE NOTICE '';
  RAISE NOTICE '📊 What was done:';
  RAISE NOTICE '   1. ✅ Updated all member_count columns to match reality';
  RAISE NOTICE '   2. ✅ Created auto-update trigger for future changes';
  RAISE NOTICE '   3. ✅ Counts will now update automatically on join/leave';
  RAISE NOTICE '';
  RAISE NOTICE '🧪 Next Steps:';
  RAISE NOTICE '   1. Refresh any community pages';
  RAISE NOTICE '   2. Join/leave a community to test trigger';
  RAISE NOTICE '   3. Verify counts update automatically';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  If counts are still wrong:';
  RAISE NOTICE '   - Check RLS policies on community_members table';
  RAISE NOTICE '   - Verify trigger is enabled: SELECT * FROM pg_trigger WHERE tgname LIKE ''%member_count%'';';
  RAISE NOTICE '';
END $$;

