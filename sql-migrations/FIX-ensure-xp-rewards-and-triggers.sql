-- ============================================================================
-- COMPREHENSIVE FIX: Ensure xp_rewards table has all action types
-- and fix all triggers to use correct award_xp signature
-- ============================================================================
-- This script:
-- 1. Ensures all required action types exist in xp_rewards
-- 2. Fixes all triggers to use correct award_xp signature (no p_xp_amount parameter)
-- ============================================================================

-- Step 1: Ensure all action types exist in xp_rewards
-- ============================================================================
INSERT INTO public.xp_rewards (action_type, xp_amount, description) VALUES
  ('lesson_completed', 50, 'Complete a lesson'),
  ('module_completed', 200, 'Complete an entire module'),
  ('sponsor_need', 100, 'Sponsor a community need'),
  ('vote_content', 25, 'Vote on community content'),
  ('create_content', 75, 'Create community content'),
  ('daily_login', 10, 'Daily login streak'),
  ('week_streak', 50, '7-day streak bonus'),
  ('month_streak', 200, '30-day streak bonus'),
  ('first_module', 100, 'Complete your first module'),
  ('first_sponsor', 150, 'Make your first sponsorship'),
  ('review_module', 30, 'Leave a module review or comment'),
  ('share_achievement', 20, 'Share an achievement'),
  ('certificate_earned', 150, 'Earn a module certificate')
ON CONFLICT (action_type) DO UPDATE SET
  xp_amount = EXCLUDED.xp_amount,
  description = EXCLUDED.description;

-- Step 2: Fix Content Creation Trigger
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
  
  -- Update streak and check achievements (pass action_type for content creation)
  PERFORM public.update_user_streak(NEW.created_by);
  PERFORM public.check_achievements(NEW.created_by, 'create_content', NEW.id);
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the insert
    RAISE WARNING 'Error in trigger_content_xp: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_content_xp ON public.community_content;
CREATE TRIGGER trigger_content_xp
  AFTER INSERT ON public.community_content
  FOR EACH ROW
  EXECUTE FUNCTION trigger_content_xp();

-- Step 3: Fix Vote Trigger
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
  
  -- Update streak and check achievements (pass action_type for voting)
  PERFORM public.update_user_streak(NEW.user_id);
  PERFORM public.check_achievements(NEW.user_id, 'vote_content', NEW.content_id);
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error in trigger_vote_xp: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_vote_xp ON public.votes;
CREATE TRIGGER trigger_vote_xp
  AFTER INSERT ON public.votes
  FOR EACH ROW
  EXECUTE FUNCTION trigger_vote_xp();

-- Step 4: Fix Comment Trigger
-- ============================================================================
CREATE OR REPLACE FUNCTION trigger_comment_xp()
RETURNS TRIGGER AS $$
BEGIN
  -- Award XP for commenting (using review_module action type)
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
  
  -- Update streak and check achievements (pass action_type for voting)
  PERFORM public.update_user_streak(NEW.user_id);
  PERFORM public.check_achievements(NEW.user_id, 'vote_content', NEW.content_id);
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error in trigger_comment_xp: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_comment_xp ON public.comments;
CREATE TRIGGER trigger_comment_xp
  AFTER INSERT ON public.comments
  FOR EACH ROW
  EXECUTE FUNCTION trigger_comment_xp();

-- Step 5: Fix Content Approval Trigger
-- ============================================================================
CREATE OR REPLACE FUNCTION trigger_content_approval()
RETURNS TRIGGER AS $$
BEGIN
  -- Award bonus XP when content moves from voting to approved
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status = 'voting') THEN
    PERFORM public.award_xp(
      NEW.created_by, 
      'create_content',  -- Use same action type as creation
      NEW.id, 
      'Content "' || COALESCE(NEW.title, 'Untitled') || '" approved by community'
    );
    
    PERFORM public.check_achievements(NEW.created_by);
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error in trigger_content_approval: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_content_approval ON public.community_content;
CREATE TRIGGER trigger_content_approval
  AFTER UPDATE ON public.community_content
  FOR EACH ROW
  EXECUTE FUNCTION trigger_content_approval();

-- Step 6: Fix Poll Vote Trigger
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
  
  -- Update streak and check achievements (pass action_type for voting)
  PERFORM public.update_user_streak(NEW.user_id);
  PERFORM public.check_achievements(NEW.user_id, 'vote_content', NEW.content_id);
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error in trigger_poll_vote_xp: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_poll_vote_xp ON public.poll_votes;
CREATE TRIGGER trigger_poll_vote_xp
  AFTER INSERT ON public.poll_votes
  FOR EACH ROW
  EXECUTE FUNCTION trigger_poll_vote_xp();

-- Step 7: Fix Community Join Trigger
-- ============================================================================
CREATE OR REPLACE FUNCTION trigger_community_join_xp()
RETURNS TRIGGER AS $$
BEGIN
  -- Award small XP for joining a community
  PERFORM public.award_xp(
    NEW.user_id, 
    'daily_login',  -- Action type (or could use a specific 'join_community' if added)
    NEW.community_id, -- Action ID (community ID)
    'Joined community'
  );
  
  -- Update streak
  PERFORM public.update_user_streak(NEW.user_id);
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error in trigger_community_join_xp: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_community_join_xp ON public.community_members;
CREATE TRIGGER trigger_community_join_xp
  AFTER INSERT ON public.community_members
  FOR EACH ROW
  EXECUTE FUNCTION trigger_community_join_xp();

-- Step 8: Fix Event RSVP Trigger
-- ============================================================================
CREATE OR REPLACE FUNCTION trigger_event_rsvp_xp()
RETURNS TRIGGER AS $$
BEGIN
  -- Award XP for RSVP (using daily_login as closest match)
  PERFORM public.award_xp(
    NEW.user_id, 
    'daily_login',  -- Action type (or could use a specific 'event_rsvp' if added)
    NEW.content_id, -- Action ID (content ID)
    'RSVP to event'
  );
  
  -- Update streak and check achievements (pass action_type for voting)
  PERFORM public.update_user_streak(NEW.user_id);
  PERFORM public.check_achievements(NEW.user_id, 'vote_content', NEW.content_id);
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error in trigger_event_rsvp_xp: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_event_rsvp_xp ON public.event_registrations;
CREATE TRIGGER trigger_event_rsvp_xp
  AFTER INSERT ON public.event_registrations
  FOR EACH ROW
  EXECUTE FUNCTION trigger_event_rsvp_xp();

-- Step 9: Fix Sponsorship Trigger
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
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error in trigger_sponsorship_xp: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_sponsorship_xp ON public.sponsorships;
CREATE TRIGGER trigger_sponsorship_xp
  AFTER UPDATE ON public.sponsorships
  FOR EACH ROW
  EXECUTE FUNCTION trigger_sponsorship_xp();

-- ============================================================================
-- VERIFICATION QUERIES
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

-- Check xp_rewards table has all required action types
SELECT action_type, xp_amount, description 
FROM public.xp_rewards 
ORDER BY action_type;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION trigger_content_xp TO authenticated;
GRANT EXECUTE ON FUNCTION trigger_vote_xp TO authenticated;
GRANT EXECUTE ON FUNCTION trigger_comment_xp TO authenticated;
GRANT EXECUTE ON FUNCTION trigger_content_approval TO authenticated;
GRANT EXECUTE ON FUNCTION trigger_poll_vote_xp TO authenticated;
GRANT EXECUTE ON FUNCTION trigger_community_join_xp TO authenticated;
GRANT EXECUTE ON FUNCTION trigger_event_rsvp_xp TO authenticated;
GRANT EXECUTE ON FUNCTION trigger_sponsorship_xp TO authenticated;

