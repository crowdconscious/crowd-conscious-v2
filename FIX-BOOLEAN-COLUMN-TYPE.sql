-- ============================================
-- FIX: Ensure is_corporate_user is BOOLEAN, not TEXT
-- ============================================

-- If the column is TEXT (stores "true"/"false" as strings),
-- we need to convert it to proper BOOLEAN

-- Step 1: Check current type
SELECT 
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'profiles'
  AND column_name = 'is_corporate_user';

-- Step 2: If it's TEXT or VARCHAR, convert to BOOLEAN
-- This safely converts "true" string to true boolean, etc.
DO $$
BEGIN
  -- Only run if column exists and is not already boolean
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'profiles' 
      AND column_name = 'is_corporate_user'
      AND data_type NOT IN ('boolean', 'bool')
  ) THEN
    -- First, normalize any weird values to proper format
    UPDATE profiles
    SET is_corporate_user = 'true'
    WHERE is_corporate_user IN ('true', 't', '1', 'TRUE', 'True');
    
    UPDATE profiles
    SET is_corporate_user = 'false'
    WHERE is_corporate_user IN ('false', 'f', '0', 'FALSE', 'False', NULL)
      OR is_corporate_user IS NULL;
    
    -- Now alter the column type using USING clause
    ALTER TABLE profiles 
    ALTER COLUMN is_corporate_user 
    TYPE BOOLEAN 
    USING (is_corporate_user::text = 'true');
    
    RAISE NOTICE '✅ Successfully converted is_corporate_user to BOOLEAN type';
  ELSE
    RAISE NOTICE '✅ Column is_corporate_user is already BOOLEAN type';
  END IF;
END $$;

-- Step 3: Verify the fix
SELECT 
  email,
  is_corporate_user,
  pg_typeof(is_corporate_user) as column_type,
  corporate_role
FROM profiles
WHERE email = 'francisco.blockstrand@gmail.com';

-- Expected output:
-- is_corporate_user should be: true (not "true")
-- column_type should be: boolean

