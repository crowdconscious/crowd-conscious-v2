-- Safe notifications setup - can be run multiple times
-- This script is idempotent and won't error if run multiple times

-- Step 1: Create notifications table if it doesn't exist
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('vote', 'content_approved', 'event_rsvp', 'community_invite', 'content_created', 'funding_milestone', 'activity_completed')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB DEFAULT '{}',
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 2: Create indexes (IF NOT EXISTS prevents duplicates)
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, read) WHERE read = FALSE;

-- Step 3: Enable RLS (safe to run multiple times)
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Step 4: Drop existing policies (IF EXISTS prevents errors)
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
DROP POLICY IF EXISTS "System can insert notifications" ON notifications;

-- Step 5: Create new policies
CREATE POLICY "Users can view their own notifications" ON notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications" ON notifications
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "System can insert notifications" ON notifications
  FOR INSERT WITH CHECK (TRUE);

-- Step 6: Create or replace functions (safe to run multiple times)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Step 7: Drop and recreate trigger
DROP TRIGGER IF EXISTS update_notifications_updated_at ON notifications;
CREATE TRIGGER update_notifications_updated_at
  BEFORE UPDATE ON notifications
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Step 8: Create notification helper function
CREATE OR REPLACE FUNCTION create_notification(
  p_user_id UUID,
  p_type TEXT,
  p_title TEXT,
  p_message TEXT,
  p_data JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
  notification_id UUID;
BEGIN
  INSERT INTO notifications (user_id, type, title, message, data)
  VALUES (p_user_id, p_type, p_title, p_message, p_data)
  RETURNING id INTO notification_id;
  
  RETURN notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION create_notification TO authenticated;

-- Step 9: Create trigger functions for automatic notifications
CREATE OR REPLACE FUNCTION notify_content_approved()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
    PERFORM create_notification(
      NEW.created_by,
      'content_approved',
      'Content Approved! 🎉',
      'Your ' || NEW.type || ' "' || NEW.title || '" has been approved by the community.',
      jsonb_build_object('content_id', NEW.id, 'content_type', NEW.type)
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 10: Drop and recreate triggers for content events
DROP TRIGGER IF EXISTS trigger_notify_content_approved ON community_content;
CREATE TRIGGER trigger_notify_content_approved
  AFTER UPDATE ON community_content
  FOR EACH ROW
  EXECUTE FUNCTION notify_content_approved();

-- Step 11: Vote notification function
CREATE OR REPLACE FUNCTION notify_content_voted()
RETURNS TRIGGER AS $$
DECLARE
  content_creator UUID;
  content_title TEXT;
  content_type TEXT;
  voter_name TEXT;
BEGIN
  -- Get content details
  SELECT created_by, title, type INTO content_creator, content_title, content_type
  FROM community_content 
  WHERE id = NEW.content_id;
  
  -- Get voter name  
  SELECT COALESCE(full_name, email) INTO voter_name
  FROM profiles 
  WHERE id = NEW.user_id;
  
  -- Don't notify if user voted on their own content
  IF content_creator != NEW.user_id THEN
    PERFORM create_notification(
      content_creator,
      'vote',
      'New Vote on Your ' || INITCAP(content_type) || '! 🗳️',
      COALESCE(voter_name, 'Someone') || ' voted on "' || content_title || '"',
      jsonb_build_object('content_id', NEW.content_id, 'voter_id', NEW.user_id, 'vote', NEW.vote)
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 12: Drop and recreate vote trigger
DROP TRIGGER IF EXISTS trigger_notify_content_voted ON votes;
CREATE TRIGGER trigger_notify_content_voted
  AFTER INSERT ON votes
  FOR EACH ROW
  EXECUTE FUNCTION notify_content_voted();

-- Step 13: New content notification function
CREATE OR REPLACE FUNCTION notify_new_content()
RETURNS TRIGGER AS $$
DECLARE
  member_id UUID;
  creator_name TEXT;
BEGIN
  -- Get creator name
  SELECT COALESCE(full_name, email) INTO creator_name
  FROM profiles 
  WHERE id = NEW.created_by;
  
  -- Notify all community members except the creator
  FOR member_id IN 
    SELECT user_id 
    FROM community_members 
    WHERE community_id = NEW.community_id AND user_id != NEW.created_by
  LOOP
    PERFORM create_notification(
      member_id,
      'content_created',
      'New ' || INITCAP(NEW.type) || ' in Your Community! ✨',
      COALESCE(creator_name, 'Someone') || ' posted "' || NEW.title || '"',
      jsonb_build_object('content_id', NEW.id, 'community_id', NEW.community_id, 'creator_id', NEW.created_by)
    );
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 14: Drop and recreate new content trigger
DROP TRIGGER IF EXISTS trigger_notify_new_content ON community_content;
CREATE TRIGGER trigger_notify_new_content
  AFTER INSERT ON community_content
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_content();

-- Verification queries (run these to check everything is set up)
-- SELECT COUNT(*) FROM notifications; -- Should show existing notifications
-- SELECT schemaname, tablename, policyname FROM pg_policies WHERE tablename = 'notifications';
-- SELECT trigger_name FROM information_schema.triggers WHERE event_object_table = 'notifications';

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Notifications system setup completed successfully! 🎉';
  RAISE NOTICE 'You can now use create_notification() function and real-time subscriptions will work.';
END $$;
