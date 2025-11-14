-- ============================================================================
-- FIX: Update all triggers to use correct award_xp function signature
-- ============================================================================
-- The award_xp function signature is:
-- award_xp(p_user_id UUID, p_action_type VARCHAR(50), p_action_id UUID, p_description TEXT)
-- It does NOT take p_xp_amount - it looks it up from xp_rewards table
-- ============================================================================

-- Fix 1: Content Creation Trigger
-- ============================================================================
CREATE OR REPLACE FUNCTION trigger_content_xp()
RETURNS TRIGGER AS $$
BEGIN
  -- Award XP for creating content (XP amount comes from xp_rewards table)
  PERFORM public.award_xp(
    NEW.created_by, 
    'create_content',  -- Action type (must match xp_rewards table)
    NEW.id,            -- Action ID (content ID)
    'Created ' || COALESCE(NEW.type, 'content') || ': ' || COALESCE(NEW.title, 'Untitled')
  );
  
  -- Update content count in user stats
  UPDATE public.user_stats 
  SET content_created = content_created + 1,
      updated_at = NOW()
  WHERE user_id = NEW.created_by;
  
  -- Update streak and check achievements
  PERFORM public.update_user_streak(NEW.created_by);
  PERFORM public.check_achievements(NEW.created_by);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_content_xp ON public.community_content;
CREATE TRIGGER trigger_content_xp
  AFTER INSERT ON public.community_content
  FOR EACH ROW
  EXECUTE FUNCTION trigger_content_xp();

-- Fix 2: Vote Trigger
-- ============================================================================
CREATE OR REPLACE FUNCTION trigger_vote_xp()
RETURNS TRIGGER AS $$
BEGIN
  -- Award XP for voting (XP amount comes from xp_rewards table)
  PERFORM public.award_xp(
    NEW.user_id, 
    'vote_content',  -- Action type (must match xp_rewards table)
    NEW.content_id, -- Action ID (content ID)
    'Voted on content'
  );
  
  -- Update vote count in user stats
  UPDATE public.user_stats 
  SET votes_cast = votes_cast + 1,
      updated_at = NOW()
  WHERE user_id = NEW.user_id;
  
  -- Update streak and check achievements
  PERFORM public.update_user_streak(NEW.user_id);
  PERFORM public.check_achievements(NEW.user_id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_vote_xp ON public.votes;
CREATE TRIGGER trigger_vote_xp
  AFTER INSERT ON public.votes
  FOR EACH ROW
  EXECUTE FUNCTION trigger_vote_xp();

-- Fix 3: Comment Trigger
-- ============================================================================
CREATE OR REPLACE FUNCTION trigger_comment_xp()
RETURNS TRIGGER AS $$
BEGIN
  -- Award XP for commenting (XP amount comes from xp_rewards table)
  -- Note: Using 'review_module' as closest match - adjust if 'comment_posted' exists in xp_rewards
  PERFORM public.award_xp(
    NEW.user_id, 
    'review_module',  -- Action type (must match xp_rewards table)
    NEW.id,           -- Action ID (comment ID)
    'Posted comment'
  );
  
  -- Update comment count in user stats
  UPDATE public.user_stats 
  SET comments_posted = comments_posted + 1,
      updated_at = NOW()
  WHERE user_id = NEW.user_id;
  
  -- Update streak and check achievements
  PERFORM public.update_user_streak(NEW.user_id);
  PERFORM public.check_achievements(NEW.user_id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_comment_xp ON public.comments;
CREATE TRIGGER trigger_comment_xp
  AFTER INSERT ON public.comments
  FOR EACH ROW
  EXECUTE FUNCTION trigger_comment_xp();

-- Fix 4: Content Approval Trigger
-- ============================================================================
CREATE OR REPLACE FUNCTION trigger_content_approval()
RETURNS TRIGGER AS $$
BEGIN
  -- Award bonus XP when content moves from voting to approved
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status = 'voting') THEN
    PERFORM public.award_xp(
      NEW.created_by, 
      'create_content',  -- Or use a specific approval action type if it exists
      NEW.id, 
      'Content "' || COALESCE(NEW.title, 'Untitled') || '" approved by community'
    );
    
    PERFORM public.check_achievements(NEW.created_by);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_content_approval ON public.community_content;
CREATE TRIGGER trigger_content_approval
  AFTER UPDATE ON public.community_content
  FOR EACH ROW
  EXECUTE FUNCTION trigger_content_approval();

-- Fix 5: Poll Vote Trigger
-- ============================================================================
CREATE OR REPLACE FUNCTION trigger_poll_vote_xp()
RETURNS TRIGGER AS $$
BEGIN
  -- Award XP for poll vote (XP amount comes from xp_rewards table)
  PERFORM public.award_xp(
    NEW.user_id, 
    'vote_content',  -- Action type (must match xp_rewards table)
    NEW.content_id, -- Action ID (content ID)
    'Voted on poll'
  );
  
  -- Update vote count (poll votes also count toward achievement)
  UPDATE public.user_stats 
  SET votes_cast = votes_cast + 1,
      updated_at = NOW()
  WHERE user_id = NEW.user_id;
  
  -- Update streak and check achievements
  PERFORM public.update_user_streak(NEW.user_id);
  PERFORM public.check_achievements(NEW.user_id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_poll_vote_xp ON public.poll_votes;
CREATE TRIGGER trigger_poll_vote_xp
  AFTER INSERT ON public.poll_votes
  FOR EACH ROW
  EXECUTE FUNCTION trigger_poll_vote_xp();

-- Fix 6: Community Join Trigger
-- ============================================================================
CREATE OR REPLACE FUNCTION trigger_community_join_xp()
RETURNS TRIGGER AS $$
BEGIN
  -- Award small XP for joining a community
  PERFORM public.award_xp(
    NEW.user_id, 
    'daily_login',  -- Action type (or use a specific 'join_community' if exists)
    NEW.community_id, -- Action ID (community ID)
    'Joined community'
  );
  
  -- Update streak
  PERFORM public.update_user_streak(NEW.user_id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_community_join_xp ON public.community_members;
CREATE TRIGGER trigger_community_join_xp
  AFTER INSERT ON public.community_members
  FOR EACH ROW
  EXECUTE FUNCTION trigger_community_join_xp();

-- Fix 7: Event RSVP Trigger
-- ============================================================================
CREATE OR REPLACE FUNCTION trigger_event_rsvp_xp()
RETURNS TRIGGER AS $$
BEGIN
  -- Award XP for RSVP (XP amount comes from xp_rewards table)
  PERFORM public.award_xp(
    NEW.user_id, 
    'daily_login',  -- Action type (or use a specific 'event_rsvp' if exists)
    NEW.content_id, -- Action ID (content ID)
    'RSVP to event'
  );
  
  -- Update streak and check achievements
  PERFORM public.update_user_streak(NEW.user_id);
  PERFORM public.check_achievements(NEW.user_id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_event_rsvp_xp ON public.event_registrations;
CREATE TRIGGER trigger_event_rsvp_xp
  AFTER INSERT ON public.event_registrations
  FOR EACH ROW
  EXECUTE FUNCTION trigger_event_rsvp_xp();

-- Fix 8: Sponsorship Trigger
-- ============================================================================
CREATE OR REPLACE FUNCTION trigger_sponsorship_xp()
RETURNS TRIGGER AS $$
BEGIN
  -- Award XP when sponsorship is paid
  IF NEW.status = 'paid' AND (OLD.status IS NULL OR OLD.status != 'paid') THEN
    PERFORM public.award_xp(
      NEW.sponsor_id, 
      'sponsor_need',  -- Action type (must match xp_rewards table)
      NEW.id,          -- Action ID (sponsorship ID)
      'Sponsored with $' || NEW.amount::text || ' MXN'
    );
    
    PERFORM public.check_achievements(NEW.sponsor_id);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_sponsorship_xp ON public.sponsorships;
CREATE TRIGGER trigger_sponsorship_xp
  AFTER UPDATE ON public.sponsorships
  FOR EACH ROW
  EXECUTE FUNCTION trigger_sponsorship_xp();

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- Check that all triggers are created correctly
SELECT 
  trigger_name, 
  event_object_table, 
  action_timing, 
  event_manipulation
FROM information_schema.triggers
WHERE trigger_name LIKE '%xp%' 
   OR trigger_name LIKE '%achievement%'
ORDER BY event_object_table, trigger_name;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION trigger_content_xp TO authenticated;
GRANT EXECUTE ON FUNCTION trigger_vote_xp TO authenticated;
GRANT EXECUTE ON FUNCTION trigger_comment_xp TO authenticated;
GRANT EXECUTE ON FUNCTION trigger_content_approval TO authenticated;
GRANT EXECUTE ON FUNCTION trigger_poll_vote_xp TO authenticated;
GRANT EXECUTE ON FUNCTION trigger_community_join_xp TO authenticated;
GRANT EXECUTE ON FUNCTION trigger_event_rsvp_xp TO authenticated;
GRANT EXECUTE ON FUNCTION trigger_sponsorship_xp TO authenticated;

