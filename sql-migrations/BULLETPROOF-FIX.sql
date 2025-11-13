-- =====================================================
-- BULLETPROOF FIX - NO TRANSACTIONS, NO FAILURES
-- =====================================================
-- This will fix the communities.updated_at issue
-- Run each section separately if needed
-- =====================================================

-- STEP 1: Add updated_at column (if it doesn't exist)
-- =====================================================
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'communities' 
    AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE public.communities ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    RAISE NOTICE 'Added updated_at column to communities';
  ELSE
    RAISE NOTICE 'updated_at column already exists';
  END IF;
END $$;

-- STEP 2: Set default values for existing rows
-- =====================================================
UPDATE public.communities 
SET updated_at = COALESCE(created_at, NOW())
WHERE updated_at IS NULL;

-- STEP 3: Make it NOT NULL
-- =====================================================
DO $$
BEGIN
  ALTER TABLE public.communities ALTER COLUMN updated_at SET NOT NULL;
  ALTER TABLE public.communities ALTER COLUMN updated_at SET DEFAULT NOW();
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Could not set NOT NULL constraint: %', SQLERRM;
END $$;

-- STEP 4: Create trigger function
-- =====================================================
CREATE OR REPLACE FUNCTION update_communities_updated_at()
RETURNS TRIGGER 
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- STEP 5: Create trigger
-- =====================================================
DROP TRIGGER IF EXISTS update_communities_updated_at ON public.communities;
CREATE TRIGGER update_communities_updated_at
  BEFORE UPDATE ON public.communities
  FOR EACH ROW
  EXECUTE FUNCTION update_communities_updated_at();

-- STEP 6: Fix member_count trigger (don't reference updated_at)
-- =====================================================
CREATE OR REPLACE FUNCTION update_member_count()
RETURNS TRIGGER 
LANGUAGE plpgsql
AS $$
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
$$;

DROP TRIGGER IF EXISTS member_count_trigger ON community_members;
CREATE TRIGGER member_count_trigger
  AFTER INSERT OR DELETE ON community_members
  FOR EACH ROW
  EXECUTE FUNCTION update_member_count();

-- STEP 7: Verify the column exists
-- =====================================================
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'communities'
  AND column_name = 'updated_at';

-- If the above query returns a row, the column exists!
-- If it returns no rows, something went wrong

