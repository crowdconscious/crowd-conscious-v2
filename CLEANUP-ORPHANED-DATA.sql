-- =====================================================
-- CLEANUP ORPHANED DATA
-- =====================================================
-- This removes data for user IDs that no longer exist in auth.users
-- Safe to run - only deletes orphaned records

-- Step 1: Check for orphaned records
SELECT 'profiles' as table_name, COUNT(*) as orphaned_count
FROM profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM auth.users u WHERE u.id = p.id
)
UNION ALL
SELECT 'community_members', COUNT(*)
FROM community_members cm
WHERE NOT EXISTS (
  SELECT 1 FROM auth.users u WHERE u.id = cm.user_id
)
UNION ALL
SELECT 'user_stats', COUNT(*)
FROM user_stats us
WHERE NOT EXISTS (
  SELECT 1 FROM auth.users u WHERE u.id = us.user_id
)
UNION ALL
SELECT 'comments', COUNT(*)
FROM comments c
WHERE NOT EXISTS (
  SELECT 1 FROM auth.users u WHERE u.id = c.user_id
)
UNION ALL
SELECT 'votes', COUNT(*)
FROM votes v
WHERE NOT EXISTS (
  SELECT 1 FROM auth.users u WHERE u.id = v.user_id
);

-- Step 2: Delete all orphaned data
-- Run this after checking the counts above

BEGIN;

-- Delete orphaned profiles
DELETE FROM profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM auth.users u WHERE u.id = p.id
);

-- Delete orphaned community_members
DELETE FROM community_members cm
WHERE NOT EXISTS (
  SELECT 1 FROM auth.users u WHERE u.id = cm.user_id
);

-- Delete orphaned user_stats
DELETE FROM user_stats us
WHERE NOT EXISTS (
  SELECT 1 FROM auth.users u WHERE u.id = us.user_id
);

-- Delete orphaned xp_transactions
DELETE FROM xp_transactions xt
WHERE NOT EXISTS (
  SELECT 1 FROM auth.users u WHERE u.id = xt.user_id
);

-- Delete orphaned comments
DELETE FROM comments c
WHERE NOT EXISTS (
  SELECT 1 FROM auth.users u WHERE u.id = c.user_id
);

-- Delete orphaned votes
DELETE FROM votes v
WHERE NOT EXISTS (
  SELECT 1 FROM auth.users u WHERE u.id = v.user_id
);

-- Delete orphaned event_registrations
DELETE FROM event_registrations er
WHERE NOT EXISTS (
  SELECT 1 FROM auth.users u WHERE u.id = er.user_id
);

-- Delete orphaned sponsorships
DELETE FROM sponsorships s
WHERE NOT EXISTS (
  SELECT 1 FROM auth.users u WHERE u.id = s.user_id
);

-- Delete orphaned community_content
DELETE FROM community_content cc
WHERE NOT EXISTS (
  SELECT 1 FROM auth.users u WHERE u.id = cc.created_by
);

COMMIT;

-- Step 3: Verify cleanup
SELECT 'Cleanup complete!' as status;

SELECT 'profiles' as table_name, COUNT(*) as remaining_orphans
FROM profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM auth.users u WHERE u.id = p.id
)
UNION ALL
SELECT 'community_members', COUNT(*)
FROM community_members cm
WHERE NOT EXISTS (
  SELECT 1 FROM auth.users u WHERE u.id = cm.user_id
)
UNION ALL
SELECT 'user_stats', COUNT(*)
FROM user_stats us
WHERE NOT EXISTS (
  SELECT 1 FROM auth.users u WHERE u.id = us.user_id
);

-- Should all show 0 remaining orphans

