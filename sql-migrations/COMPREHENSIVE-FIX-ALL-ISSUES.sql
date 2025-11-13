-- =====================================================
-- COMPREHENSIVE FIX FOR ALL GAMIFICATION ISSUES
-- =====================================================
-- Run this to fix:
-- 1. communities.updated_at column missing
-- 2. XP awarding not working
-- 3. Triggers failing silently
-- =====================================================

BEGIN;

-- =====================================================
-- FIX 1: Add communities.updated_at column
-- =====================================================
ALTER TABLE public.communities 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

UPDATE public.communities 
SET updated_at = COALESCE(created_at, NOW())
WHERE updated_at IS NULL;

ALTER TABLE public.communities 
ALTER COLUMN updated_at SET NOT NULL,
ALTER COLUMN updated_at SET DEFAULT NOW();

-- Auto-update trigger
CREATE OR REPLACE FUNCTION update_communities_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_communities_updated_at ON public.communities;
CREATE TRIGGER update_communities_updated_at
  BEFORE UPDATE ON public.communities
  FOR EACH ROW
  EXECUTE FUNCTION update_communities_updated_at();

-- =====================================================
-- FIX 2: Ensure xp_transactions has correct schema
-- =====================================================
DO $$ 
DECLARE
  has_xp_amount BOOLEAN;
  has_related_id BOOLEAN;
  has_amount BOOLEAN;
  has_action_id BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'xp_transactions' 
    AND column_name = 'xp_amount'
  ) INTO has_xp_amount;
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'xp_transactions' 
    AND column_name = 'related_id'
  ) INTO has_related_id;
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'xp_transactions' 
    AND column_name = 'amount'
  ) INTO has_amount;
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'xp_transactions' 
    AND column_name = 'action_id'
  ) INTO has_action_id;
  
  IF has_xp_amount AND NOT has_amount THEN
    ALTER TABLE public.xp_transactions RENAME COLUMN xp_amount TO amount;
  ELSIF has_xp_amount AND has_amount THEN
    UPDATE public.xp_transactions SET amount = xp_amount WHERE amount IS NULL;
    ALTER TABLE public.xp_transactions DROP COLUMN xp_amount;
  ELSIF NOT has_amount THEN
    ALTER TABLE public.xp_transactions ADD COLUMN amount INTEGER;
  END IF;
  
  IF has_related_id AND NOT has_action_id THEN
    ALTER TABLE public.xp_transactions RENAME COLUMN related_id TO action_id;
  ELSIF has_related_id AND has_action_id THEN
    UPDATE public.xp_transactions SET action_id = related_id WHERE action_id IS NULL;
    ALTER TABLE public.xp_transactions DROP COLUMN related_id;
  ELSIF NOT has_action_id THEN
    ALTER TABLE public.xp_transactions ADD COLUMN action_id UUID;
  END IF;
END $$;

-- =====================================================
-- FIX 3: Ensure action types exist
-- =====================================================
INSERT INTO public.xp_rewards (action_type, xp_amount, description) VALUES
  ('join_community', 25, 'Join a community'),
  ('vote_content', 25, 'Vote on community content')
ON CONFLICT (action_type) DO UPDATE SET
  xp_amount = EXCLUDED.xp_amount,
  description = EXCLUDED.description;

-- =====================================================
-- FIX 4: Fix member_count trigger (don't reference updated_at)
-- =====================================================
CREATE OR REPLACE FUNCTION update_member_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.communities 
    SET member_count = member_count + 1
    WHERE id = NEW.community_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.communities 
    SET member_count = GREATEST(member_count - 1, 0)
    WHERE id = OLD.community_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS member_count_trigger ON community_members;
CREATE TRIGGER member_count_trigger
  AFTER INSERT OR DELETE ON community_members
  FOR EACH ROW
  EXECUTE FUNCTION update_member_count();

-- =====================================================
-- FIX 5: Recreate XP triggers with better error handling
-- =====================================================

-- Community Join Trigger
DROP FUNCTION IF EXISTS trigger_community_join_xp() CASCADE;
CREATE OR REPLACE FUNCTION trigger_community_join_xp()
RETURNS TRIGGER AS $$
BEGIN
  BEGIN
    PERFORM award_xp(
      NEW.user_id::UUID, 
      'join_community'::VARCHAR(50), 
      NEW.community_id::UUID, 
      'Joined community'::TEXT
    );
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'XP award failed for community join: %', SQLERRM;
  END;
  
  BEGIN
    PERFORM update_user_streak(NEW.user_id);
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Streak update failed: %', SQLERRM;
  END;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_community_join_xp ON community_members;
CREATE TRIGGER trigger_community_join_xp
  AFTER INSERT ON community_members
  FOR EACH ROW
  EXECUTE FUNCTION trigger_community_join_xp();

-- Poll Vote Trigger
DROP FUNCTION IF EXISTS trigger_poll_vote_xp() CASCADE;
CREATE OR REPLACE FUNCTION trigger_poll_vote_xp()
RETURNS TRIGGER AS $$
BEGIN
  BEGIN
    PERFORM award_xp(
      NEW.user_id::UUID,
      'vote_content'::VARCHAR(50),
      NEW.content_id::UUID,
      'Voted on poll'::TEXT
    );
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'XP award failed for poll vote: %', SQLERRM;
  END;
  
  BEGIN
    PERFORM update_user_streak(NEW.user_id);
    PERFORM check_achievements(NEW.user_id);
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Streak/achievement update failed: %', SQLERRM;
  END;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_poll_vote_xp ON poll_votes;
CREATE TRIGGER trigger_poll_vote_xp
  AFTER INSERT ON poll_votes
  FOR EACH ROW
  EXECUTE FUNCTION trigger_poll_vote_xp();

-- =====================================================
-- FIX 6: Sponsorships constraint
-- =====================================================
ALTER TABLE sponsorships DROP CONSTRAINT IF EXISTS sponsorships_amount_check;
ALTER TABLE sponsorships 
ADD CONSTRAINT sponsorships_amount_check 
CHECK (
  (support_type = 'financial' AND amount >= 100) OR
  (support_type IN ('volunteer', 'resources') AND amount = 0) OR
  (support_type IS NULL AND amount >= 100)
);

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================
GRANT EXECUTE ON FUNCTION trigger_community_join_xp TO authenticated;
GRANT EXECUTE ON FUNCTION trigger_poll_vote_xp TO authenticated;
GRANT EXECUTE ON FUNCTION update_member_count TO authenticated;
-- Note: update_communities_updated_at is a trigger function, doesn't need explicit grant

COMMIT;

-- =====================================================
-- VERIFICATION
-- =====================================================
SELECT '✅ Migration completed successfully!' as status;

SELECT 
  trigger_name,
  event_object_table,
  action_timing
FROM information_schema.triggers
WHERE trigger_name IN ('trigger_community_join_xp', 'trigger_poll_vote_xp', 'member_count_trigger', 'update_communities_updated_at')
ORDER BY event_object_table;

SELECT action_type, xp_amount 
FROM public.xp_rewards 
WHERE action_type IN ('join_community', 'vote_content');

