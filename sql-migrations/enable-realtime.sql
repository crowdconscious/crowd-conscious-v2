-- =====================================================
-- ENABLE REAL-TIME SUBSCRIPTIONS
-- =====================================================
-- This script enables real-time functionality for key tables
-- Run this in your Supabase SQL Editor

-- Enable realtime for community_content table
ALTER PUBLICATION supabase_realtime ADD TABLE community_content;

-- Enable realtime for comments table
ALTER PUBLICATION supabase_realtime ADD TABLE comments;

-- Enable realtime for poll_votes table  
ALTER PUBLICATION supabase_realtime ADD TABLE poll_votes;

-- Enable realtime for event_registrations table
ALTER PUBLICATION supabase_realtime ADD TABLE event_registrations;

-- Enable realtime for community_members table (for member count updates)
ALTER PUBLICATION supabase_realtime ADD TABLE community_members;

-- Verify which tables have realtime enabled
SELECT schemaname, tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime'
ORDER BY tablename;

-- =====================================================
-- NOTES:
-- =====================================================
-- After running this script:
-- 1. Real-time subscriptions will work for all enabled tables
-- 2. Clients will receive instant updates when data changes
-- 3. No app restart needed - changes take effect immediately
-- 4. Monitor usage in Supabase dashboard under "Database > Realtime"
-- =====================================================
