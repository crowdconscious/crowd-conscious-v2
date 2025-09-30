-- =====================================================
-- FIX COMMUNITY STATS AND MEMBER COUNT
-- This ensures member counts are accurate and fast
-- =====================================================

BEGIN;

-- Update all community member counts to be accurate
UPDATE communities 
SET member_count = (
    SELECT COUNT(*) 
    FROM community_members 
    WHERE community_id = communities.id
);

-- Ensure the trigger function exists and works properly
CREATE OR REPLACE FUNCTION update_member_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE communities 
    SET member_count = member_count + 1 
    WHERE id = NEW.community_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE communities 
    SET member_count = GREATEST(member_count - 1, 0)
    WHERE id = OLD.community_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
DROP TRIGGER IF EXISTS member_count_trigger ON community_members;
CREATE TRIGGER member_count_trigger
  AFTER INSERT OR DELETE ON community_members
  FOR EACH ROW EXECUTE FUNCTION update_member_count();

-- Add index for faster member count queries
CREATE INDEX IF NOT EXISTS idx_community_members_community_id ON community_members(community_id);
CREATE INDEX IF NOT EXISTS idx_communities_member_count ON communities(member_count);

-- Verify the counts are correct
SELECT 
    c.name,
    c.member_count as stored_count,
    (SELECT COUNT(*) FROM community_members cm WHERE cm.community_id = c.id) as actual_count
FROM communities c
ORDER BY c.name;

COMMIT;
