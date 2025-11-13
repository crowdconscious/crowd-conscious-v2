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
BEGIN
  -- Check if xp_amount column exists (old schema)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'xp_transactions' 
    AND column_name = 'xp_amount'
  ) THEN
    -- Old schema detected - migrate to new schema
    RAISE NOTICE 'Migrating xp_transactions table to new schema...';
    
    -- Rename columns if they exist
    ALTER TABLE public.xp_transactions 
    RENAME COLUMN IF EXISTS xp_amount TO amount;
    
    ALTER TABLE public.xp_transactions 
    RENAME COLUMN IF EXISTS related_id TO action_id;
  END IF;
  
  -- Ensure new columns exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'xp_transactions' 
    AND column_name = 'amount'
  ) THEN
    ALTER TABLE public.xp_transactions 
    ADD COLUMN amount INTEGER;
    
    -- Copy data from xp_amount if it exists
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'xp_transactions' 
      AND column_name = 'xp_amount'
    ) THEN
      UPDATE public.xp_transactions SET amount = xp_amount WHERE amount IS NULL;
      ALTER TABLE public.xp_transactions DROP COLUMN IF EXISTS xp_amount;
    END IF;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'xp_transactions' 
    AND column_name = 'action_id'
  ) THEN
    ALTER TABLE public.xp_transactions 
    ADD COLUMN action_id UUID;
    
    -- Copy data from related_id if it exists
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'xp_transactions' 
      AND column_name = 'related_id'
    ) THEN
      UPDATE public.xp_transactions SET action_id = related_id WHERE action_id IS NULL;
      ALTER TABLE public.xp_transactions DROP COLUMN IF EXISTS related_id;
    END IF;
  END IF;
  
  -- Ensure amount is NOT NULL
  ALTER TABLE public.xp_transactions 
  ALTER COLUMN amount SET NOT NULL;
  
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

