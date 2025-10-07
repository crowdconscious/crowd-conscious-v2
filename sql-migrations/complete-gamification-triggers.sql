-- =====================================================
-- COMPLETE GAMIFICATION TRIGGERS - Missing Pieces
-- =====================================================
-- This file adds missing triggers to complete the gamification system
-- Run this in Supabase SQL Editor AFTER gamification-and-comments.sql
-- =====================================================

-- =====================================================
-- Fix 1: Auto-Create user_stats on Signup
-- =====================================================

-- Create user_stats when a new user signs up
CREATE OR REPLACE FUNCTION create_user_stats_on_signup()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_stats (user_id, total_xp, level, current_streak, longest_streak, last_activity)
  VALUES (NEW.id, 0, 1, 0, 0, NOW())
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created_stats ON auth.users;
CREATE TRIGGER on_auth_user_created_stats
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_user_stats_on_signup();

-- =====================================================
-- Fix 2: Event RSVP XP Trigger
-- =====================================================

-- Award XP when user RSVPs to an event
CREATE OR REPLACE FUNCTION trigger_event_rsvp_xp()
RETURNS TRIGGER AS $$
BEGIN
  -- Award XP for RSVP
  PERFORM award_xp(NEW.user_id, 'event_rsvp', 10, NEW.content_id, 'RSVP to event');
  
  -- Update streak and check achievements
  PERFORM update_user_streak(NEW.user_id);
  PERFORM check_achievements(NEW.user_id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_event_rsvp_xp ON event_registrations;
CREATE TRIGGER trigger_event_rsvp_xp
  AFTER INSERT ON event_registrations
  FOR EACH ROW
  EXECUTE FUNCTION trigger_event_rsvp_xp();

-- =====================================================
-- Fix 3: Event Completion/Attendance XP
-- =====================================================

-- Award XP when event completes and users attended
CREATE OR REPLACE FUNCTION trigger_event_completion()
RETURNS TRIGGER AS $$
BEGIN
  -- If event just completed, award XP to all attendees
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    -- Award XP to all users who RSVP'd
    INSERT INTO xp_transactions (user_id, action_type, xp_amount, related_id, description)
    SELECT 
      er.user_id,
      'event_attended',
      30,
      NEW.id,
      'Attended event: ' || NEW.title
    FROM event_registrations er
    WHERE er.content_id = NEW.id
    AND er.status = 'attending';
    
    -- Update user stats for all attendees
    UPDATE user_stats us
    SET 
      total_xp = us.total_xp + 30,
      events_attended = us.events_attended + 1,
      level = FLOOR(SQRT((us.total_xp + 30) / 100.0)) + 1,
      updated_at = NOW()
    WHERE us.user_id IN (
      SELECT user_id FROM event_registrations 
      WHERE content_id = NEW.id AND status = 'attending'
    );
    
    -- Check achievements for all attendees
    PERFORM check_achievements(er.user_id) 
    FROM event_registrations er
    WHERE er.content_id = NEW.id AND er.status = 'attending';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_event_completion ON community_content;
CREATE TRIGGER trigger_event_completion
  AFTER UPDATE ON community_content
  FOR EACH ROW
  WHEN (NEW.type = 'event')
  EXECUTE FUNCTION trigger_event_completion();

-- =====================================================
-- Fix 4: Content Approval XP
-- =====================================================

-- Award bonus XP when content is approved by community
CREATE OR REPLACE FUNCTION trigger_content_approval()
RETURNS TRIGGER AS $$
BEGIN
  -- Award bonus XP when content moves from voting to approved
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status = 'voting') THEN
    PERFORM award_xp(
      NEW.created_by, 
      'content_approved', 
      50, 
      NEW.id, 
      'Content "' || NEW.title || '" approved by community'
    );
    
    PERFORM check_achievements(NEW.created_by);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_content_approval ON community_content;
CREATE TRIGGER trigger_content_approval
  AFTER UPDATE ON community_content
  FOR EACH ROW
  EXECUTE FUNCTION trigger_content_approval();

-- =====================================================
-- Fix 5: Poll Vote XP
-- =====================================================

-- Award XP when user votes on a poll
CREATE OR REPLACE FUNCTION trigger_poll_vote_xp()
RETURNS TRIGGER AS $$
BEGIN
  -- Award XP for poll vote
  PERFORM award_xp(NEW.user_id, 'vote_cast', 5, NEW.content_id, 'Voted on poll');
  
  -- Update vote count (poll votes also count toward achievement)
  UPDATE user_stats 
  SET votes_cast = votes_cast + 1,
      updated_at = NOW()
  WHERE user_id = NEW.user_id;
  
  -- Update streak and check achievements
  PERFORM update_user_streak(NEW.user_id);
  PERFORM check_achievements(NEW.user_id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_poll_vote_xp ON poll_votes;
CREATE TRIGGER trigger_poll_vote_xp
  AFTER INSERT ON poll_votes
  FOR EACH ROW
  EXECUTE FUNCTION trigger_poll_vote_xp();

-- =====================================================
-- Fix 6: Community Join XP
-- =====================================================

-- Award XP when user joins a community
CREATE OR REPLACE FUNCTION trigger_community_join_xp()
RETURNS TRIGGER AS $$
BEGIN
  -- Award small XP for joining a community
  PERFORM award_xp(NEW.user_id, 'daily_login', 10, NEW.community_id, 'Joined community');
  
  -- Update streak
  PERFORM update_user_streak(NEW.user_id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_community_join_xp ON community_members;
CREATE TRIGGER trigger_community_join_xp
  AFTER INSERT ON community_members
  FOR EACH ROW
  EXECUTE FUNCTION trigger_community_join_xp();

-- =====================================================
-- Fix 7: Sponsorship XP
-- =====================================================

-- Award XP when user makes a sponsorship
CREATE OR REPLACE FUNCTION trigger_sponsorship_xp()
RETURNS TRIGGER AS $$
DECLARE
  xp_to_award INTEGER;
BEGIN
  -- Award XP based on sponsorship amount (1 XP per $10 MXN, max 100 XP)
  IF NEW.status = 'paid' AND (OLD.status IS NULL OR OLD.status != 'paid') THEN
    xp_to_award := LEAST(FLOOR(NEW.amount / 10), 100);
    
    PERFORM award_xp(
      NEW.sponsor_id, 
      'achievement_unlocked', 
      xp_to_award, 
      NEW.id, 
      'Sponsored with $' || NEW.amount::text || ' MXN'
    );
    
    PERFORM check_achievements(NEW.sponsor_id);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_sponsorship_xp ON sponsorships;
CREATE TRIGGER trigger_sponsorship_xp
  AFTER UPDATE ON sponsorships
  FOR EACH ROW
  EXECUTE FUNCTION trigger_sponsorship_xp();

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Check all triggers are created
SELECT 
  trigger_name, 
  event_object_table, 
  action_timing, 
  event_manipulation
FROM information_schema.triggers
WHERE trigger_name LIKE '%xp%' 
   OR trigger_name LIKE '%achievement%'
   OR trigger_name LIKE '%gamification%'
ORDER BY event_object_table, trigger_name;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION create_user_stats_on_signup TO authenticated;
GRANT EXECUTE ON FUNCTION trigger_event_rsvp_xp TO authenticated;
GRANT EXECUTE ON FUNCTION trigger_event_completion TO authenticated;
GRANT EXECUTE ON FUNCTION trigger_content_approval TO authenticated;
GRANT EXECUTE ON FUNCTION trigger_poll_vote_xp TO authenticated;
GRANT EXECUTE ON FUNCTION trigger_community_join_xp TO authenticated;
GRANT EXECUTE ON FUNCTION trigger_sponsorship_xp TO authenticated;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Complete gamification triggers installed successfully!';
  RAISE NOTICE '🎮 All user actions now automatically award XP';
  RAISE NOTICE '🏆 Achievements will unlock automatically';
  RAISE NOTICE '📊 Leaderboards are ready to use';
  RAISE NOTICE '';
  RAISE NOTICE '🧪 Test by: voting, creating content, commenting, joining communities';
  RAISE NOTICE '📈 Check your stats: SELECT * FROM user_stats WHERE user_id = auth.uid()';
END $$;
