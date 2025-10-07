-- =====================================================
-- CLEAN DELETE USER - Remove all traces for testing
-- =====================================================
-- Use this to completely remove a test user and allow re-signup
-- Replace 'YOUR_EMAIL_HERE' with the actual email

-- Step 1: Find the user ID
-- Run this first to get the user_id
SELECT id, email, full_name 
FROM profiles 
WHERE email = 'YOUR_EMAIL_HERE';

-- Step 2: Delete all related data (replace USER_ID with actual UUID)
-- Copy the id from Step 1 and use it below

BEGIN;

-- Delete from user_stats (gamification)
DELETE FROM user_stats WHERE user_id = 'USER_ID';

-- Delete from xp_transactions
DELETE FROM xp_transactions WHERE user_id = 'USER_ID';

-- Delete from community_members (communities joined)
DELETE FROM community_members WHERE user_id = 'USER_ID';

-- Delete from comments
DELETE FROM comments WHERE user_id = 'USER_ID';

-- Delete from votes
DELETE FROM votes WHERE user_id = 'USER_ID';

-- Delete from event_registrations
DELETE FROM event_registrations WHERE user_id = 'USER_ID';

-- Delete from sponsorships (as sponsor)
DELETE FROM sponsorships WHERE user_id = 'USER_ID';

-- Delete content created by user
DELETE FROM community_content WHERE created_by = 'USER_ID';

-- Delete communities created by user (careful with this!)
-- DELETE FROM communities WHERE creator_id = 'USER_ID';

-- Finally, delete from profiles
DELETE FROM profiles WHERE id = 'USER_ID';

COMMIT;

-- Step 3: Verify deletion
SELECT COUNT(*) as remaining_records
FROM profiles 
WHERE email = 'YOUR_EMAIL_HERE';
-- Should return 0

-- Step 4: MANUAL - Delete from Supabase Auth
-- Go to Supabase Dashboard → Authentication → Users
-- Find the email and click Delete

-- =====================================================
-- QUICK VERSION - Delete by email (safer)
-- =====================================================
-- This version finds the user_id automatically

DO $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Get user ID
  SELECT id INTO v_user_id 
  FROM profiles 
  WHERE email = 'YOUR_EMAIL_HERE';
  
  IF v_user_id IS NOT NULL THEN
    -- Delete all related data
    DELETE FROM user_stats WHERE user_id = v_user_id;
    DELETE FROM xp_transactions WHERE user_id = v_user_id;
    DELETE FROM community_members WHERE user_id = v_user_id;
    DELETE FROM comments WHERE user_id = v_user_id;
    DELETE FROM votes WHERE user_id = v_user_id;
    DELETE FROM event_registrations WHERE user_id = v_user_id;
    DELETE FROM sponsorships WHERE user_id = v_user_id;
    DELETE FROM community_content WHERE created_by = v_user_id;
    -- Uncomment if you want to delete communities they created:
    -- DELETE FROM communities WHERE creator_id = v_user_id;
    DELETE FROM profiles WHERE id = v_user_id;
    
    RAISE NOTICE 'User % deleted successfully', v_user_id;
  ELSE
    RAISE NOTICE 'No user found with email: YOUR_EMAIL_HERE';
  END IF;
END $$;

-- =====================================================
-- PERMANENT FIX - Add CASCADE to foreign keys
-- =====================================================
-- Run this once to make future deletions easier

-- Drop and recreate foreign keys with CASCADE

-- user_stats
ALTER TABLE user_stats
DROP CONSTRAINT IF EXISTS user_stats_user_id_fkey;

ALTER TABLE user_stats
ADD CONSTRAINT user_stats_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES profiles(id)
ON DELETE CASCADE;

-- xp_transactions
ALTER TABLE xp_transactions
DROP CONSTRAINT IF EXISTS xp_transactions_user_id_fkey;

ALTER TABLE xp_transactions
ADD CONSTRAINT xp_transactions_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES profiles(id)
ON DELETE CASCADE;

-- community_members
ALTER TABLE community_members
DROP CONSTRAINT IF EXISTS community_members_user_id_fkey;

ALTER TABLE community_members
ADD CONSTRAINT community_members_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES profiles(id)
ON DELETE CASCADE;

-- comments
ALTER TABLE comments
DROP CONSTRAINT IF EXISTS comments_user_id_fkey;

ALTER TABLE comments
ADD CONSTRAINT comments_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES profiles(id)
ON DELETE CASCADE;

-- votes
ALTER TABLE votes
DROP CONSTRAINT IF EXISTS votes_user_id_fkey;

ALTER TABLE votes
ADD CONSTRAINT votes_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES profiles(id)
ON DELETE CASCADE;

-- event_registrations
ALTER TABLE event_registrations
DROP CONSTRAINT IF EXISTS event_registrations_user_id_fkey;

ALTER TABLE event_registrations
ADD CONSTRAINT event_registrations_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES profiles(id)
ON DELETE CASCADE;

-- sponsorships
ALTER TABLE sponsorships
DROP CONSTRAINT IF EXISTS sponsorships_user_id_fkey;

ALTER TABLE sponsorships
ADD CONSTRAINT sponsorships_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES profiles(id)
ON DELETE CASCADE;

-- community_content (created_by)
ALTER TABLE community_content
DROP CONSTRAINT IF EXISTS community_content_created_by_fkey;

ALTER TABLE community_content
ADD CONSTRAINT community_content_created_by_fkey
FOREIGN KEY (created_by)
REFERENCES profiles(id)
ON DELETE CASCADE;

-- After running the CASCADE fix above, you can delete users with just:
-- DELETE FROM profiles WHERE email = 'YOUR_EMAIL_HERE';
-- And all related data will be automatically deleted!

RAISE NOTICE 'CASCADE foreign keys added. Future deletions will be automatic.';

