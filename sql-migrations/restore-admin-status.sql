-- =====================================================
-- RESTORE ADMIN STATUS
-- =====================================================
-- Run this to restore admin status for your account

-- Step 1: First, let's check your current status
-- Replace 'your@email.com' with your actual email
SELECT 
  id,
  email,
  full_name,
  user_type,
  created_at
FROM profiles
WHERE email = 'YOUR_EMAIL_HERE';  -- ⚠️ REPLACE THIS!

-- Step 2: Restore admin status
-- Replace 'your@email.com' with your actual email
UPDATE profiles
SET user_type = 'admin'
WHERE email = 'YOUR_EMAIL_HERE';  -- ⚠️ REPLACE THIS!

-- Step 3: Verify the change
SELECT 
  id,
  email,
  full_name,
  user_type,
  created_at
FROM profiles
WHERE email = 'YOUR_EMAIL_HERE';  -- ⚠️ REPLACE THIS!

-- Step 4: Check all admins
SELECT 
  id,
  email,
  full_name,
  user_type,
  created_at
FROM profiles
WHERE user_type = 'admin'
ORDER BY created_at;

-- =====================================================
-- ALTERNATIVE: Set admin by user ID
-- =====================================================
-- If you know your user ID, use this instead:

-- UPDATE profiles
-- SET user_type = 'admin'
-- WHERE id = 'your-user-id-here';

