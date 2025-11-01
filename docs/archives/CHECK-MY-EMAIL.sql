-- =====================================================
-- CHECK IF EMAIL EXISTS ANYWHERE
-- =====================================================
-- Checks all tables for francisco.blockstrand@gmail.com

-- Check in profiles table
SELECT 'profiles' as table_name, id, email, full_name, created_at
FROM profiles 
WHERE email = 'francisco.blockstrand@gmail.com';

-- Check in auth.users (should be empty if deleted)
SELECT 'auth.users' as table_name, id, email, created_at
FROM auth.users
WHERE email = 'francisco.blockstrand@gmail.com';

-- If you see records in profiles but NOT in auth.users,
-- that's the problem! The profile is orphaned.

-- =====================================================
-- QUICK FIX: Delete by email directly
-- =====================================================
-- If the email exists in profiles, just delete it:

DELETE FROM profiles WHERE email = 'francisco.blockstrand@gmail.com';

-- Then check if it's gone:
SELECT 
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ Email completely removed! You can sign up now.'
    ELSE '❌ Email still exists somewhere'
  END as status
FROM profiles 
WHERE email = 'francisco.blockstrand@gmail.com';

