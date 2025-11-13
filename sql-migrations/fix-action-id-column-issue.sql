-- =====================================================
-- FIX: Column "action_id" does not exist
-- =====================================================
-- Issue: There are two different xp_transactions schemas:
-- 1. Old: xp_amount, related_id
-- 2. New: amount, action_id
-- 
-- The award_xp function uses the NEW schema (amount, action_id)
-- but the table might have the OLD schema (xp_amount, related_id)
-- =====================================================

-- Step 1: Check and migrate xp_transactions table to new schema
-- =====================================================

-- Check if old columns exist and migrate if needed
DO $$ 
DECLARE
  has_xp_amount BOOLEAN;
  has_related_id BOOLEAN;
  has_amount BOOLEAN;
  has_action_id BOOLEAN;
BEGIN
  -- Check which columns exist
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
  
  -- Migrate xp_amount to amount
  IF has_xp_amount AND NOT has_amount THEN
    RAISE NOTICE 'Renaming xp_amount to amount...';
    ALTER TABLE public.xp_transactions RENAME COLUMN xp_amount TO amount;
  ELSIF has_xp_amount AND has_amount THEN
    -- Both exist - copy data and drop old
    RAISE NOTICE 'Copying xp_amount to amount and dropping xp_amount...';
    UPDATE public.xp_transactions SET amount = xp_amount WHERE amount IS NULL;
    ALTER TABLE public.xp_transactions DROP COLUMN xp_amount;
  ELSIF NOT has_amount THEN
    -- Neither exists - create amount
    RAISE NOTICE 'Creating amount column...';
    ALTER TABLE public.xp_transactions ADD COLUMN amount INTEGER;
  END IF;
  
  -- Migrate related_id to action_id
  IF has_related_id AND NOT has_action_id THEN
    RAISE NOTICE 'Renaming related_id to action_id...';
    ALTER TABLE public.xp_transactions RENAME COLUMN related_id TO action_id;
  ELSIF has_related_id AND has_action_id THEN
    -- Both exist - copy data and drop old
    RAISE NOTICE 'Copying related_id to action_id and dropping related_id...';
    UPDATE public.xp_transactions SET action_id = related_id WHERE action_id IS NULL;
    ALTER TABLE public.xp_transactions DROP COLUMN related_id;
  ELSIF NOT has_action_id THEN
    -- Neither exists - create action_id
    RAISE NOTICE 'Creating action_id column...';
    ALTER TABLE public.xp_transactions ADD COLUMN action_id UUID;
  END IF;
  
  -- Ensure amount is NOT NULL (only if column exists and has no NULL values)
  IF has_amount OR EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'xp_transactions' 
    AND column_name = 'amount'
  ) THEN
    -- Check if there are any NULL values
    IF NOT EXISTS (SELECT 1 FROM public.xp_transactions WHERE amount IS NULL) THEN
      BEGIN
        ALTER TABLE public.xp_transactions ALTER COLUMN amount SET NOT NULL;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE NOTICE 'Could not set amount to NOT NULL (may already be nullable): %', SQLERRM;
      END;
    END IF;
  END IF;
  
END $$;

-- Step 2: Verify the schema
-- =====================================================

SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'xp_transactions'
ORDER BY ordinal_position;

-- Step 3: Drop old triggers that might be using wrong schema
-- =====================================================

DROP TRIGGER IF EXISTS trigger_community_join_xp ON community_members;
DROP TRIGGER IF EXISTS trigger_poll_vote_xp ON poll_votes;
DROP FUNCTION IF EXISTS trigger_community_join_xp() CASCADE;
DROP FUNCTION IF EXISTS trigger_poll_vote_xp() CASCADE;

-- Step 4: Recreate triggers with correct function calls
-- =====================================================

-- Community Join Trigger
CREATE OR REPLACE FUNCTION trigger_community_join_xp()
RETURNS TRIGGER AS $$
BEGIN
  -- Award XP for joining a community
  PERFORM award_xp(
    NEW.user_id::UUID, 
    'join_community'::VARCHAR(50), 
    NEW.community_id::UUID, 
    'Joined community'::TEXT
  );
  
  -- Update streak
  PERFORM update_user_streak(NEW.user_id);
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the insert
    RAISE WARNING 'Error awarding XP for community join: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_community_join_xp
  AFTER INSERT ON community_members
  FOR EACH ROW
  EXECUTE FUNCTION trigger_community_join_xp();

-- Poll Vote Trigger
CREATE OR REPLACE FUNCTION trigger_poll_vote_xp()
RETURNS TRIGGER AS $$
BEGIN
  -- Award XP for poll vote
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
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the insert
    RAISE WARNING 'Error awarding XP for poll vote: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_poll_vote_xp
  AFTER INSERT ON poll_votes
  FOR EACH ROW
  EXECUTE FUNCTION trigger_poll_vote_xp();

-- Step 5: Grant permissions
-- =====================================================

GRANT EXECUTE ON FUNCTION trigger_community_join_xp TO authenticated;
GRANT EXECUTE ON FUNCTION trigger_poll_vote_xp TO authenticated;

-- Step 6: Verification
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

