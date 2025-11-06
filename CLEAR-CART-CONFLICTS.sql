-- ========================================================================
-- CLEAR CART AND ENROLLMENT CONFLICTS
-- ========================================================================
-- Run this if you're getting "conflict" errors when adding to cart
-- This will help diagnose and optionally clear test data
-- ========================================================================

-- STEP 1: Check your user ID (replace with your actual email)
SELECT 
  'your_user_info' as info_type,
  id as user_id,
  email,
  created_at
FROM auth.users
WHERE email = 'YOUR_EMAIL_HERE@example.com';  -- ← CHANGE THIS!

-- STEP 2: Check existing enrollments for this user
-- (These prevent adding the same module to cart again)
SELECT 
  'existing_enrollments' as info_type,
  ce.id as enrollment_id,
  ce.user_id,
  ce.module_id,
  m.title as module_title,
  ce.enrolled_at,
  ce.progress_percentage,
  ce.completed
FROM course_enrollments ce
JOIN marketplace_modules m ON ce.module_id = m.id
WHERE ce.user_id = 'YOUR_USER_ID_FROM_STEP_1';  -- ← PASTE USER ID HERE!

-- STEP 3: Check cart items for this user
SELECT 
  'cart_items' as info_type,
  ci.id as cart_item_id,
  ci.user_id,
  ci.module_id,
  m.title as module_title,
  ci.employee_count,
  ci.price_snapshot,
  ci.promo_code_id,
  ci.discounted_price,
  pc.code as promo_code
FROM cart_items ci
JOIN marketplace_modules m ON ci.module_id = m.id
LEFT JOIN promo_codes pc ON ci.promo_code_id = pc.id
WHERE ci.user_id = 'YOUR_USER_ID_FROM_STEP_1';  -- ← PASTE USER ID HERE!

-- ========================================================================
-- OPTIONAL: Clear test enrollments (USE WITH CAUTION!)
-- ========================================================================
-- Uncomment the following lines to delete test enrollments
-- WARNING: This will remove your course progress!

-- DELETE FROM course_enrollments
-- WHERE user_id = 'YOUR_USER_ID_FROM_STEP_1'  -- ← PASTE USER ID HERE!
-- AND module_id = 'MODULE_ID_YOU_WANT_TO_REMOVE';  -- ← PASTE MODULE ID HERE!

-- ========================================================================
-- OPTIONAL: Clear cart items
-- ========================================================================
-- Uncomment to clear your cart

-- DELETE FROM cart_items
-- WHERE user_id = 'YOUR_USER_ID_FROM_STEP_1';  -- ← PASTE USER ID HERE!

-- ========================================================================
-- VERIFICATION: Check if cleared successfully
-- ========================================================================
-- Run this after deleting to confirm

SELECT 
  'verification' as check_type,
  (SELECT COUNT(*) FROM course_enrollments WHERE user_id = 'YOUR_USER_ID_FROM_STEP_1') as remaining_enrollments,
  (SELECT COUNT(*) FROM cart_items WHERE user_id = 'YOUR_USER_ID_FROM_STEP_1') as remaining_cart_items;

