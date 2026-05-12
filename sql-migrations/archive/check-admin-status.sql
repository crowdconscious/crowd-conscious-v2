-- =====================================================
-- CHECK ADMIN STATUS FOR USER
-- =====================================================

-- Step 1: Find your user account by email
SELECT 
  id,
  email,
  full_name,
  user_type,
  created_at
FROM profiles
WHERE email LIKE '%blockstrand%' OR email LIKE '%francisco%';

-- Step 2: Check all users with admin type
SELECT 
  id,
  email,
  full_name,
  user_type,
  created_at
FROM profiles
WHERE user_type = 'admin';

-- Step 3: Check if user_type column exists and its values
SELECT 
  user_type,
  COUNT(*) as count
FROM profiles
GROUP BY user_type;

-- Step 4: Check profiles table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'profiles'
ORDER BY ordinal_position;

