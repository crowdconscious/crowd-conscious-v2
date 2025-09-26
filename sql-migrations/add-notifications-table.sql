-- Create notifications table for real-time updates
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

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, read) WHERE read = FALSE;

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies (drop existing ones first to avoid conflicts)
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
DROP POLICY IF EXISTS "System can insert notifications" ON notifications;

CREATE POLICY "Users can view their own notifications" ON notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications" ON notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- Only system/triggers can insert notifications
CREATE POLICY "System can insert notifications" ON notifications
  FOR INSERT WITH CHECK (TRUE);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for notifications updated_at
DROP TRIGGER IF EXISTS update_notifications_updated_at ON notifications;
CREATE TRIGGER update_notifications_updated_at
  BEFORE UPDATE ON notifications
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to create notifications
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

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION create_notification TO authenticated;

-- Create trigger functions for automatic notifications

-- Notify when content is approved
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

-- Create trigger for content approval notifications
DROP TRIGGER IF EXISTS trigger_notify_content_approved ON community_content;
CREATE TRIGGER trigger_notify_content_approved
  AFTER UPDATE ON community_content
  FOR EACH ROW
  EXECUTE FUNCTION notify_content_approved();

-- Notify when someone votes on your content
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
      voter_name || ' voted on "' || content_title || '"',
      jsonb_build_object('content_id', NEW.content_id, 'voter_id', NEW.user_id, 'vote', NEW.vote)
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for vote notifications
DROP TRIGGER IF EXISTS trigger_notify_content_voted ON votes;
CREATE TRIGGER trigger_notify_content_voted
  AFTER INSERT ON votes
  FOR EACH ROW
  EXECUTE FUNCTION notify_content_voted();

-- Notify when someone RSVPs to your event
CREATE OR REPLACE FUNCTION notify_event_rsvp()
RETURNS TRIGGER AS $$
DECLARE
  event_creator UUID;
  event_title TEXT;
  rsvp_user_name TEXT;
BEGIN
  -- Get event details
  SELECT created_by, title INTO event_creator, event_title
  FROM community_content 
  WHERE id = NEW.content_id AND type = 'event';
  
  -- Get RSVP user name
  SELECT COALESCE(full_name, email) INTO rsvp_user_name
  FROM profiles 
  WHERE id = NEW.user_id;
  
  -- Don't notify if user RSVPed to their own event
  IF event_creator != NEW.user_id AND event_creator IS NOT NULL THEN
    PERFORM create_notification(
      event_creator,
      'event_rsvp',
      'New RSVP for Your Event! 📅',
      rsvp_user_name || ' registered for "' || event_title || '"',
      jsonb_build_object('content_id', NEW.content_id, 'user_id', NEW.user_id)
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for RSVP notifications (assumes event_rsvps table exists)
-- DROP TRIGGER IF EXISTS trigger_notify_event_rsvp ON event_rsvps;
-- CREATE TRIGGER trigger_notify_event_rsvp
--   AFTER INSERT ON event_rsvps
--   FOR EACH ROW
--   EXECUTE FUNCTION notify_event_rsvp();

-- Notify community members when new content is created
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
      creator_name || ' posted "' || NEW.title || '"',
      jsonb_build_object('content_id', NEW.id, 'community_id', NEW.community_id, 'creator_id', NEW.created_by)
    );
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for new content notifications
DROP TRIGGER IF EXISTS trigger_notify_new_content ON community_content;
CREATE TRIGGER trigger_notify_new_content
  AFTER INSERT ON community_content
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_content();
