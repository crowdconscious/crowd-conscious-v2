-- ============================================
-- CHECK WHAT COLUMNS ACTUALLY EXIST
-- ============================================
-- Run this first to see what we're working with

-- Check corporate_accounts table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'corporate_accounts'
ORDER BY ordinal_position;

-- Check profiles table for corporate fields
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'profiles'
  AND column_name LIKE '%corporate%'
ORDER BY ordinal_position;

