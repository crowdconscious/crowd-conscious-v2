-- ============================================
-- CHECK TEST USER ENROLLMENTS & PURCHASE HISTORY
-- ============================================

-- Step 1: Find the test user
SELECT 
  'STEP 1: Finding test user Ximena' as step;

SELECT 
  au.id as auth_user_id,
  au.email,
  p.full_name,
  p.is_corporate_user,
  p.corporate_role,
  p.corporate_account_id,
  p.created_at
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.id
WHERE au.email = 'ximenaginsburg@hotmail.com';

-- Step 2: Check enrollments for this user
SELECT 
  'STEP 2: Checking enrollments' as step;

SELECT 
  ce.id as enrollment_id,
  ce.user_id,
  ce.module_id,
  ce.course_id,
  ce.purchased_at,
  ce.purchase_type,
  ce.purchase_price_snapshot,
  ce.status,
  ce.progress_percentage,
  ce.completed,
  mm.title as module_title,
  mm.slug as module_slug,
  mm.core_value
FROM course_enrollments ce
LEFT JOIN marketplace_modules mm ON ce.module_id = mm.id
WHERE ce.user_id = (
  SELECT id FROM auth.users WHERE email = 'ximenaginsburg@hotmail.com'
)
ORDER BY ce.purchased_at DESC;

-- Step 3: Check module sales records
SELECT 
  'STEP 3: Checking module sales' as step;

-- NOTE: module_sales tracks corporate purchases (corporate_account_id)
-- Individual purchases are tracked in course_enrollments (user_id + module_id)
SELECT 
  ms.id,
  ms.module_id,
  ms.corporate_account_id,
  ms.total_amount,
  ms.community_share,
  ms.platform_fee,
  ms.sale_date,
  ms.payment_status,
  mm.title as module_title
FROM module_sales ms
LEFT JOIN marketplace_modules mm ON ms.module_id = mm.id
WHERE ms.corporate_account_id IS NOT NULL -- Only corporate sales have this
ORDER BY ms.sale_date DESC
LIMIT 10;

-- Step 4: Check promo code usage
SELECT 
  'STEP 4: Checking promo code usage' as step;

SELECT 
  pcu.id,
  pcu.user_id,
  pcu.promo_code_id,
  pc.code as promo_code,
  pcu.module_id,
  pcu.discount_amount,
  pcu.used_at,
  mm.title as module_title
FROM promo_code_uses pcu
LEFT JOIN promo_codes pc ON pcu.promo_code_id = pc.id
LEFT JOIN marketplace_modules mm ON pcu.module_id = mm.id
WHERE pcu.user_id = (
  SELECT id FROM auth.users WHERE email = 'ximenaginsburg@hotmail.com'
)
ORDER BY pcu.used_at DESC;

-- ============================================
-- DIAGNOSE: Why no enrollments?
-- ============================================

SELECT 
  'DIAGNOSIS' as section,
  CASE 
    WHEN (SELECT COUNT(*) FROM course_enrollments WHERE user_id = (SELECT id FROM auth.users WHERE email = 'ximenaginsburg@hotmail.com')) = 0
    THEN '❌ NO ENROLLMENTS FOUND - Webhook likely failed to create them'
    ELSE '✅ Enrollments exist - Check RLS policies'
  END as enrollment_status,
  
  CASE 
    WHEN (SELECT COUNT(*) FROM module_sales WHERE purchaser_user_id = (SELECT id FROM auth.users WHERE email = 'ximenaginsburg@hotmail.com')) = 0
    THEN '⚠️ NO SALES RECORDS - Payment may not have been processed'
    ELSE '✅ Sales records exist'
  END as sales_status,
  
  CASE 
    WHEN (SELECT COUNT(*) FROM promo_code_uses WHERE user_id = (SELECT id FROM auth.users WHERE email = 'ximenaginsburg@hotmail.com')) = 0
    THEN '⚠️ NO PROMO CODE USES - Did they use a promo code?'
    ELSE '✅ Promo code was used'
  END as promo_status;

-- ============================================
-- MANUAL FIX: Create enrollments if missing
-- (Only run this section if enrollments are missing)
-- ============================================

/*
-- Uncomment and modify this section to manually create enrollments:

DO $$
DECLARE
  test_user_id UUID;
  aire_module_id UUID;
  agua_module_id UUID;
BEGIN
  -- Get user ID
  SELECT id INTO test_user_id 
  FROM auth.users 
  WHERE email = 'ximenaginsburg@hotmail.com';
  
  -- Get module IDs (adjust titles if needed)
  SELECT id INTO aire_module_id 
  FROM marketplace_modules 
  WHERE title ILIKE '%Estrategias Avanzadas%Aire%'
  LIMIT 1;
  
  SELECT id INTO agua_module_id 
  FROM marketplace_modules 
  WHERE title ILIKE '%Gestión Sostenible%Agua%'
  LIMIT 1;
  
  -- Create enrollment for Module 1 (Aire)
  IF test_user_id IS NOT NULL AND aire_module_id IS NOT NULL THEN
    INSERT INTO course_enrollments (
      user_id,
      corporate_account_id,
      course_id,
      module_id,
      purchase_type,
      purchased_at,
      purchase_price_snapshot,
      status,
      progress_percentage,
      completion_percentage,
      completed,
      xp_earned,
      started_at,
      last_accessed_at
    ) VALUES (
      test_user_id,
      NULL,
      NULL,  -- Individual module purchase
      aire_module_id,
      'individual',
      NOW(),
      0.00,  -- Free with promo code
      'not_started',
      0,
      0,
      false,
      0,
      NOW(),
      NOW()
    )
    ON CONFLICT DO NOTHING;
    
    RAISE NOTICE 'Created enrollment for Aire module';
  END IF;
  
  -- Create enrollment for Module 2 (Agua)
  IF test_user_id IS NOT NULL AND agua_module_id IS NOT NULL THEN
    INSERT INTO course_enrollments (
      user_id,
      corporate_account_id,
      course_id,
      module_id,
      purchase_type,
      purchased_at,
      purchase_price_snapshot,
      status,
      progress_percentage,
      completion_percentage,
      completed,
      xp_earned,
      started_at,
      last_accessed_at
    ) VALUES (
      test_user_id,
      NULL,
      NULL,  -- Individual module purchase
      agua_module_id,
      'individual',
      NOW(),
      0.00,  -- Free with promo code
      'not_started',
      0,
      0,
      false,
      0,
      NOW(),
      NOW()
    )
    ON CONFLICT DO NOTHING;
    
    RAISE NOTICE 'Created enrollment for Agua module';
  END IF;
END $$;
*/

-- ============================================
-- SUMMARY
-- ============================================

SELECT 
  'Run this script to diagnose why test user cant see modules' as instructions,
  'If no enrollments exist, uncomment the MANUAL FIX section' as next_step,
  'Also check Vercel webhook logs for errors' as also_check;

