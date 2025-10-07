-- =====================================================
-- FIX CASCADE DELETIONS - Add ON DELETE CASCADE
-- =====================================================
-- Problem: Foreign key constraints block community deletion
-- Solution: Update foreign keys to CASCADE on delete
-- =====================================================

-- =====================================================
-- 1. COMMUNITY_MEMBERS - CASCADE when community deleted
-- =====================================================

-- Drop and recreate the foreign key with CASCADE
ALTER TABLE community_members 
DROP CONSTRAINT IF EXISTS community_members_community_id_fkey;

ALTER TABLE community_members
ADD CONSTRAINT community_members_community_id_fkey 
FOREIGN KEY (community_id) 
REFERENCES communities(id) 
ON DELETE CASCADE;

-- Also for user_id (if user is deleted)
ALTER TABLE community_members 
DROP CONSTRAINT IF EXISTS community_members_user_id_fkey;

ALTER TABLE community_members
ADD CONSTRAINT community_members_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES profiles(id) 
ON DELETE CASCADE;

-- =====================================================
-- 2. COMMUNITY_CONTENT - CASCADE when community deleted
-- =====================================================

ALTER TABLE community_content 
DROP CONSTRAINT IF EXISTS community_content_community_id_fkey;

ALTER TABLE community_content
ADD CONSTRAINT community_content_community_id_fkey 
FOREIGN KEY (community_id) 
REFERENCES communities(id) 
ON DELETE CASCADE;

ALTER TABLE community_content 
DROP CONSTRAINT IF EXISTS community_content_created_by_fkey;

ALTER TABLE community_content
ADD CONSTRAINT community_content_created_by_fkey 
FOREIGN KEY (created_by) 
REFERENCES profiles(id) 
ON DELETE CASCADE;

-- =====================================================
-- 3. VOTES - CASCADE when content deleted
-- =====================================================

ALTER TABLE votes 
DROP CONSTRAINT IF EXISTS votes_content_id_fkey;

ALTER TABLE votes
ADD CONSTRAINT votes_content_id_fkey 
FOREIGN KEY (content_id) 
REFERENCES community_content(id) 
ON DELETE CASCADE;

ALTER TABLE votes 
DROP CONSTRAINT IF EXISTS votes_user_id_fkey;

ALTER TABLE votes
ADD CONSTRAINT votes_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES profiles(id) 
ON DELETE CASCADE;

-- =====================================================
-- 4. SPONSORSHIPS - CASCADE when content deleted
-- =====================================================

ALTER TABLE sponsorships 
DROP CONSTRAINT IF EXISTS sponsorships_content_id_fkey;

ALTER TABLE sponsorships
ADD CONSTRAINT sponsorships_content_id_fkey 
FOREIGN KEY (content_id) 
REFERENCES community_content(id) 
ON DELETE CASCADE;

ALTER TABLE sponsorships 
DROP CONSTRAINT IF EXISTS sponsorships_sponsor_id_fkey;

ALTER TABLE sponsorships
ADD CONSTRAINT sponsorships_sponsor_id_fkey 
FOREIGN KEY (sponsor_id) 
REFERENCES profiles(id) 
ON DELETE SET NULL; -- Keep sponsorship record but nullify sponsor if user deleted

-- =====================================================
-- 5. IMPACT_METRICS - CASCADE when community/content deleted
-- =====================================================

ALTER TABLE impact_metrics 
DROP CONSTRAINT IF EXISTS impact_metrics_community_id_fkey;

ALTER TABLE impact_metrics
ADD CONSTRAINT impact_metrics_community_id_fkey 
FOREIGN KEY (community_id) 
REFERENCES communities(id) 
ON DELETE CASCADE;

ALTER TABLE impact_metrics 
DROP CONSTRAINT IF EXISTS impact_metrics_content_id_fkey;

ALTER TABLE impact_metrics
ADD CONSTRAINT impact_metrics_content_id_fkey 
FOREIGN KEY (content_id) 
REFERENCES community_content(id) 
ON DELETE CASCADE;

-- =====================================================
-- 6. SHARE_LINKS - CASCADE when content deleted
-- =====================================================

ALTER TABLE share_links 
DROP CONSTRAINT IF EXISTS share_links_content_id_fkey;

ALTER TABLE share_links
ADD CONSTRAINT share_links_content_id_fkey 
FOREIGN KEY (content_id) 
REFERENCES community_content(id) 
ON DELETE CASCADE;

-- =====================================================
-- 7. COMMENTS - CASCADE when content deleted
-- =====================================================

-- Check if comments table exists first
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'comments') THEN
    ALTER TABLE comments 
    DROP CONSTRAINT IF EXISTS comments_content_id_fkey;

    ALTER TABLE comments
    ADD CONSTRAINT comments_content_id_fkey 
    FOREIGN KEY (content_id) 
    REFERENCES community_content(id) 
    ON DELETE CASCADE;

    ALTER TABLE comments 
    DROP CONSTRAINT IF EXISTS comments_user_id_fkey;

    ALTER TABLE comments
    ADD CONSTRAINT comments_user_id_fkey 
    FOREIGN KEY (user_id) 
    REFERENCES profiles(id) 
    ON DELETE CASCADE;
  END IF;
END $$;

-- =====================================================
-- 8. POLL_VOTES - CASCADE when content deleted
-- =====================================================

DO $$ 
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'poll_votes') THEN
    ALTER TABLE poll_votes 
    DROP CONSTRAINT IF EXISTS poll_votes_content_id_fkey;

    ALTER TABLE poll_votes
    ADD CONSTRAINT poll_votes_content_id_fkey 
    FOREIGN KEY (content_id) 
    REFERENCES community_content(id) 
    ON DELETE CASCADE;

    ALTER TABLE poll_votes 
    DROP CONSTRAINT IF EXISTS poll_votes_user_id_fkey;

    ALTER TABLE poll_votes
    ADD CONSTRAINT poll_votes_user_id_fkey 
    FOREIGN KEY (user_id) 
    REFERENCES profiles(id) 
    ON DELETE CASCADE;
  END IF;
END $$;

-- =====================================================
-- 9. EVENT_REGISTRATIONS - CASCADE when content deleted
-- =====================================================

DO $$ 
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'event_registrations') THEN
    ALTER TABLE event_registrations 
    DROP CONSTRAINT IF EXISTS event_registrations_content_id_fkey;

    ALTER TABLE event_registrations
    ADD CONSTRAINT event_registrations_content_id_fkey 
    FOREIGN KEY (content_id) 
    REFERENCES community_content(id) 
    ON DELETE CASCADE;

    ALTER TABLE event_registrations 
    DROP CONSTRAINT IF EXISTS event_registrations_user_id_fkey;

    ALTER TABLE event_registrations
    ADD CONSTRAINT event_registrations_user_id_fkey 
    FOREIGN KEY (user_id) 
    REFERENCES profiles(id) 
    ON DELETE CASCADE;
  END IF;
END $$;

-- =====================================================
-- 10. NOTIFICATIONS - CASCADE when related records deleted
-- =====================================================

DO $$ 
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'notifications') THEN
    -- Handle user_id foreign key
    ALTER TABLE notifications 
    DROP CONSTRAINT IF EXISTS notifications_user_id_fkey;

    ALTER TABLE notifications
    ADD CONSTRAINT notifications_user_id_fkey 
    FOREIGN KEY (user_id) 
    REFERENCES profiles(id) 
    ON DELETE CASCADE;

    -- Handle community_id foreign key ONLY if column exists
    IF EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_name = 'notifications' 
      AND column_name = 'community_id'
    ) THEN
      ALTER TABLE notifications 
      DROP CONSTRAINT IF EXISTS notifications_community_id_fkey;

      ALTER TABLE notifications
      ADD CONSTRAINT notifications_community_id_fkey 
      FOREIGN KEY (community_id) 
      REFERENCES communities(id) 
      ON DELETE CASCADE;
    END IF;
  END IF;
END $$;

-- =====================================================
-- VERIFICATION
-- =====================================================

-- Check all foreign keys now have ON DELETE CASCADE
SELECT
    tc.table_name, 
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    rc.delete_rule
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
JOIN information_schema.referential_constraints AS rc
    ON tc.constraint_name = rc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
AND tc.table_schema = 'public'
ORDER BY tc.table_name, kcu.column_name;

-- =====================================================
-- TEST DELETION (uncomment to test)
-- =====================================================

-- Find a test community to delete:
-- SELECT id, name, member_count FROM communities LIMIT 5;

-- Try deleting it:
-- DELETE FROM communities WHERE id = 'your-test-community-id';

-- =====================================================
-- WHAT THIS FIXES
-- =====================================================
-- Before: Deleting community fails with foreign key constraint error
-- After: Deleting community automatically deletes:
--   - All community_members
--   - All community_content
--   - All votes on that content
--   - All comments on that content
--   - All sponsorships for that content
--   - All impact_metrics
--   - All share_links
--   - All event_registrations
--   - All poll_votes
--   - All notifications
--
-- This is the expected behavior - when you delete a community,
-- everything related to it should be deleted too.
-- =====================================================
