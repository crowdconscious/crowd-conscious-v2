-- =====================================================
-- SIMPLE DIRECT FIX - NO TRANSACTIONS, NO COMPLEXITY
-- =====================================================
-- Just add the column. That's it.
-- =====================================================

-- Add the column
ALTER TABLE public.communities 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

-- Set default for existing rows
UPDATE public.communities 
SET updated_at = NOW()
WHERE updated_at IS NULL;

-- Make it have a default
ALTER TABLE public.communities 
ALTER COLUMN updated_at SET DEFAULT NOW();

-- Verify it exists
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'communities' 
AND column_name = 'updated_at';

-- If you see "updated_at" in the results, it worked!

