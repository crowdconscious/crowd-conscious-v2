-- ============================================================================
-- CHECK AND CREATE ENROLLMENT - Debug webhook issue
-- ============================================================================
-- Run this to check if enrollment was created and manually create if needed
-- ============================================================================

-- Step 1: Find your user ID
SELECT 
  id as user_id,
  email,
  created_at
FROM auth.users
WHERE email ILIKE '%francisco%'
ORDER BY created_at DESC
LIMIT 1;

-- Step 2: Check if enrollment exists
SELECT 
  ce.id,
  ce.user_id,
  ce.module_id,
  ce.purchase_type,
  ce.purchased_at,
  ce.purchase_price_snapshot,
  ce.progress_percentage,
  ce.enrolled_at,
  mm.title as module_title
FROM course_enrollments ce
LEFT JOIN marketplace_modules mm ON ce.module_id = mm.id
WHERE ce.user_id IN (
  SELECT id FROM auth.users WHERE email ILIKE '%francisco%'
)
ORDER BY ce.enrolled_at DESC;

-- Step 3: Check recent Stripe checkout sessions (from cart_items)
-- This shows what modules you tried to purchase
SELECT 
  ci.id,
  ci.module_id,
  ci.employee_count,
  ci.price_snapshot,
  ci.discounted_price,
  ci.promo_code_id,
  mm.title as module_title
FROM cart_items ci
LEFT JOIN marketplace_modules mm ON ci.module_id = mm.id
WHERE ci.user_id IN (
  SELECT id FROM auth.users WHERE email ILIKE '%francisco%'
)
ORDER BY ci.added_at DESC
LIMIT 5;

-- Step 4: If NO enrollment exists, create it manually
-- REPLACE THE UUIDs BELOW WITH YOUR ACTUAL IDs FROM STEPS 1-3

-- Get your user_id from Step 1
-- Get module_id from Step 3 (the module you just purchased)

/*
INSERT INTO course_enrollments (
  user_id,
  corporate_account_id,
  module_id,
  purchase_type,
  purchased_at,
  purchase_price_snapshot,
  progress_percentage,
  completed,
  enrolled_at
)
VALUES (
  'YOUR_USER_ID_HERE',  -- From Step 1
  NULL,                  -- individual purchase
  'YOUR_MODULE_ID_HERE', -- From Step 3
  'individual',
  NOW(),
  0.00,                  -- paid with promo code
  0,
  false,
  NOW()
);
*/

-- Step 5: Verify enrollment was created
SELECT 
  ce.*,
  mm.title
FROM course_enrollments ce
LEFT JOIN marketplace_modules mm ON ce.module_id = mm.id
WHERE ce.user_id IN (
  SELECT id FROM auth.users WHERE email ILIKE '%francisco%'
)
ORDER BY ce.enrolled_at DESC;

-- Step 6: Clear your cart (after enrollment is confirmed)
/*
DELETE FROM cart_items
WHERE user_id IN (
  SELECT id FROM auth.users WHERE email ILIKE '%francisco%'
);
*/

