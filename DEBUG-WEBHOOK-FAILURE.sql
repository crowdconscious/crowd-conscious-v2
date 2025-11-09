-- =====================================================
-- DIAGNOSE: Why webhook is failing to create enrollments
-- =====================================================

-- Step 1: Check if Stripe sessions were recorded (module_sales table)
SELECT 
  'Step 1: Checking module_sales records' as step;

SELECT 
  ms.id,
  ms.module_id,
  mm.title as module_title,
  ms.total_amount,
  ms.payment_status,
  ms.sale_date,
  ms.corporate_account_id
FROM module_sales ms
LEFT JOIN marketplace_modules mm ON ms.module_id = mm.id
ORDER BY ms.sale_date DESC
LIMIT 10;

-- If empty, webhook isn't even reaching the process_module_sale RPC call

-- Step 2: Check cart_items (should be empty after successful purchase)
SELECT 
  'Step 2: Checking cart_items (should be cleared after purchase)' as step;

SELECT 
  ci.id,
  ci.user_id,
  ci.module_id,
  mm.title as module_title,
  ci.promo_code_id,
  pc.code as promo_code,
  ci.price_snapshot,
  ci.discounted_price,
  ci.created_at
FROM cart_items ci
LEFT JOIN marketplace_modules mm ON ci.module_id = mm.id
LEFT JOIN promo_codes pc ON ci.promo_code_id = pc.id
WHERE ci.user_id = (SELECT id FROM auth.users WHERE email = 'ximenaginsburg@hotmail.com')
ORDER BY ci.created_at DESC;

-- If cart_items still exist, webhook didn't clear them (failed before that step)

-- Step 3: Check promo_code_uses (should have records if codes were used)
SELECT 
  'Step 3: Checking promo_code_uses table' as step;

SELECT 
  pcu.id,
  pc.code as promo_code,
  pcu.user_id,
  pcu.cart_total_before_discount,
  pcu.discount_amount,
  pcu.cart_total_after_discount,
  pcu.stripe_session_id,
  pcu.used_at
FROM promo_code_uses pcu
JOIN promo_codes pc ON pcu.promo_code_id = pc.id
WHERE pcu.user_id = (SELECT id FROM auth.users WHERE email = 'ximenaginsburg@hotmail.com')
ORDER BY pcu.used_at DESC;

-- If empty, webhook never reached promo code tracking section

-- Step 4: Check promo_codes current_uses
SELECT 
  'Step 4: Checking promo codes current_uses' as step;

SELECT 
  code,
  current_uses,
  max_uses,
  active,
  created_at
FROM promo_codes
WHERE code IN ('DEMOJAVI', 'DEMOPUNKY', 'DOMINGO1')
ORDER BY code;

-- If current_uses = 0, the increment function either didn't run or failed

-- Step 5: Check if RPC function exists
SELECT 
  'Step 5: Checking if increment_promo_code_uses function exists' as step;

SELECT 
  proname as function_name,
  proargnames as argument_names,
  prosrc as function_body
FROM pg_proc
WHERE proname = 'increment_promo_code_uses';

-- If empty, function was never created

-- =====================================================
-- DIAGNOSIS SUMMARY
-- =====================================================

SELECT 
  'DIAGNOSIS RESULTS' as section,
  
  CASE 
    WHEN (SELECT COUNT(*) FROM module_sales WHERE sale_date > NOW() - INTERVAL '1 hour') = 0
    THEN '❌ NO module_sales records - Webhook not reaching process_module_sale'
    ELSE '✅ module_sales records exist'
  END as module_sales_status,
  
  CASE 
    WHEN (SELECT COUNT(*) FROM cart_items WHERE user_id = (SELECT id FROM auth.users WHERE email = 'ximenaginsburg@hotmail.com')) > 0
    THEN '⚠️ Cart NOT cleared - Webhook failed before clearing cart'
    ELSE '✅ Cart was cleared (or was already empty)'
  END as cart_status,
  
  CASE 
    WHEN (SELECT COUNT(*) FROM course_enrollments WHERE user_id = (SELECT id FROM auth.users WHERE email = 'ximenaginsburg@hotmail.com')) = 0
    THEN '❌ NO enrollments - Webhook failed to create enrollments'
    ELSE '✅ Enrollments exist'
  END as enrollment_status,
  
  CASE 
    WHEN (SELECT COUNT(*) FROM promo_code_uses WHERE user_id = (SELECT id FROM auth.users WHERE email = 'ximenaginsburg@hotmail.com')) = 0
    THEN '❌ NO promo code tracking - Webhook never reached that section'
    ELSE '✅ Promo code uses tracked'
  END as promo_tracking_status,
  
  CASE 
    WHEN (SELECT COUNT(*) FROM pg_proc WHERE proname = 'increment_promo_code_uses') = 0
    THEN '❌ RPC function NOT created - Run CREATE-PROMO-INCREMENT-FUNCTION.sql'
    ELSE '✅ RPC function exists'
  END as rpc_function_status;

-- =====================================================
-- LIKELY ISSUES
-- =====================================================

SELECT 
  'MOST LIKELY ISSUES:' as diagnosis,
  '1. Check Vercel webhook logs for errors' as step_1,
  '2. Webhook might be timing out' as step_2,
  '3. RLS policies blocking webhook inserts' as step_3,
  '4. process_module_sale RPC function failing' as step_4,
  '5. Stripe webhook secret mismatch' as step_5;

