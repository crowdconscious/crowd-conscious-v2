-- =====================================================
-- FIX: Database Triggers and Sponsorships Constraints
-- =====================================================
-- Fixes:
-- 1. Community join XP trigger (wrong function signature)
-- 2. Poll vote XP trigger (wrong function signature)
-- 3. Sponsorships amount constraint (allow 0 for non-financial)
-- =====================================================

-- =====================================================
-- Fix 1: Add Missing Action Types to xp_rewards
-- =====================================================

INSERT INTO public.xp_rewards (action_type, xp_amount, description) VALUES
  ('join_community', 25, 'Join a community'),
  ('vote_content', 25, 'Vote on community content') -- Already exists but ensure it's there
ON CONFLICT (action_type) DO UPDATE SET
  xp_amount = EXCLUDED.xp_amount,
  description = EXCLUDED.description;

-- =====================================================
-- Fix 2: Community Join XP Trigger
-- =====================================================
-- The trigger is calling award_xp with correct signature
-- award_xp(UUID, VARCHAR(50), UUID, TEXT)

DROP FUNCTION IF EXISTS trigger_community_join_xp() CASCADE;

CREATE OR REPLACE FUNCTION trigger_community_join_xp()
RETURNS TRIGGER AS $$
BEGIN
  -- Award XP for joining a community using correct function signature
  PERFORM award_xp(
    NEW.user_id::UUID, 
    'join_community'::VARCHAR(50), 
    NEW.community_id::UUID, 
    'Joined community'::TEXT
  );
  
  -- Update streak
  PERFORM update_user_streak(NEW.user_id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_community_join_xp ON community_members;
CREATE TRIGGER trigger_community_join_xp
  AFTER INSERT ON community_members
  FOR EACH ROW
  EXECUTE FUNCTION trigger_community_join_xp();

-- =====================================================
-- Fix 3: Poll Vote XP Trigger
-- =====================================================
-- The trigger is calling award_xp with correct signature

DROP FUNCTION IF EXISTS trigger_poll_vote_xp() CASCADE;

CREATE OR REPLACE FUNCTION trigger_poll_vote_xp()
RETURNS TRIGGER AS $$
BEGIN
  -- Award XP for poll vote using correct function signature
  PERFORM award_xp(
    NEW.user_id::UUID,
    'vote_content'::VARCHAR(50),
    NEW.content_id::UUID,
    'Voted on poll'::TEXT
  );
  
  -- Update streak and check achievements
  PERFORM update_user_streak(NEW.user_id);
  PERFORM check_achievements(NEW.user_id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_poll_vote_xp ON poll_votes;
CREATE TRIGGER trigger_poll_vote_xp
  AFTER INSERT ON poll_votes
  FOR EACH ROW
  EXECUTE FUNCTION trigger_poll_vote_xp();

-- =====================================================
-- Fix 4: Sponsorships Amount Constraint
-- =====================================================
-- Allow amount = 0 for non-financial sponsorships (volunteer/resources)
-- Current constraint likely requires amount > 0 or amount >= 100

-- First, drop the existing constraint if it exists
DO $$ 
BEGIN
  -- Try to drop constraint if it exists
  ALTER TABLE sponsorships DROP CONSTRAINT IF EXISTS sponsorships_amount_check;
  
  -- Add new constraint that allows 0 for non-financial sponsorships
  ALTER TABLE sponsorships 
  ADD CONSTRAINT sponsorships_amount_check 
  CHECK (
    (support_type = 'financial' AND amount >= 100) OR
    (support_type IN ('volunteer', 'resources') AND amount = 0) OR
    (support_type IS NULL AND amount >= 100) -- Backward compatibility
  );
EXCEPTION
  WHEN OTHERS THEN
    -- If constraint doesn't exist or other error, just add the new one
    BEGIN
      ALTER TABLE sponsorships 
      ADD CONSTRAINT sponsorships_amount_check 
      CHECK (
        (support_type = 'financial' AND amount >= 100) OR
        (support_type IN ('volunteer', 'resources') AND amount = 0) OR
        (support_type IS NULL AND amount >= 100)
      );
    EXCEPTION
      WHEN duplicate_object THEN
        -- Constraint already exists, update it
        NULL;
    END;
END $$;

-- =====================================================
-- Verification
-- =====================================================

-- Check triggers exist
SELECT 
  trigger_name, 
  event_object_table, 
  action_timing, 
  event_manipulation
FROM information_schema.triggers
WHERE trigger_name IN ('trigger_community_join_xp', 'trigger_poll_vote_xp')
ORDER BY event_object_table, trigger_name;

-- Check constraint exists
SELECT 
  conname AS constraint_name,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'sponsorships'::regclass
  AND conname = 'sponsorships_amount_check';

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION trigger_community_join_xp TO authenticated;
GRANT EXECUTE ON FUNCTION trigger_poll_vote_xp TO authenticated;

