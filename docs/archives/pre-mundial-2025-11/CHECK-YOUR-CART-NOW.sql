-- ============================================================================
-- CHECK CURRENT CART STATUS
-- ============================================================================
-- This will show exactly what's in your cart right now
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

-- Step 2: Check your profile
SELECT 
  id,
  full_name,
  corporate_account_id,
  corporate_role,
  is_corporate_user
FROM profiles
WHERE id IN (
  SELECT id FROM auth.users WHERE email ILIKE '%francisco%'
);

-- Step 3: Check your cart items (CRITICAL CHECK)
SELECT 
  ci.id as cart_item_id,
  ci.module_id,
  ci.employee_count,
  ci.price_snapshot,
  ci.promo_code_id,
  ci.discounted_price,
  ci.user_id,
  ci.corporate_account_id,
  ci.added_at,
  mm.title as module_title,
  pc.code as promo_code,
  pc.discount_type,
  pc.discount_value
FROM cart_items ci
LEFT JOIN marketplace_modules mm ON ci.module_id = mm.id
LEFT JOIN promo_codes pc ON ci.promo_code_id = pc.id
WHERE ci.user_id IN (
  SELECT id FROM auth.users WHERE email ILIKE '%francisco%'
)
OR ci.corporate_account_id IN (
  SELECT corporate_account_id FROM profiles 
  WHERE id IN (SELECT id FROM auth.users WHERE email ILIKE '%francisco%')
)
ORDER BY ci.added_at DESC;

-- Step 4: Check if promo_code_id and discounted_price columns exist
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'cart_items'
AND column_name IN ('promo_code_id', 'discounted_price')
ORDER BY column_name;

-- Step 5: Check if DEMOJAVI promo code exists
SELECT 
  id,
  code,
  discount_type,
  discount_value,
  active,
  max_uses,
  current_uses,
  valid_from,
  valid_until
FROM promo_codes
WHERE code = 'DEMOJAVI';

