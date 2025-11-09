-- =====================================================
-- FIX: Promo codes not showing in admin panel
-- =====================================================

-- Step 1: Verify promo codes exist
SELECT 
  'Step 1: Verifying promo codes exist' as step;

SELECT 
  id,
  code,
  description,
  discount_type,
  discount_value,
  current_uses,
  max_uses,
  active,
  created_at
FROM promo_codes
ORDER BY created_at DESC;

-- Step 2: Check RLS policies on promo_codes
SELECT 
  'Step 2: Checking RLS policies' as step;

SELECT 
  schemaname,
  tablename,
  policyname,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'promo_codes'
ORDER BY policyname;

-- Step 3: Check if Francisco's profile exists with correct email
SELECT 
  'Step 3: Checking Francisco admin profile' as step;

SELECT 
  p.id,
  p.email,
  p.full_name,
  u.email as auth_email
FROM profiles p
JOIN auth.users u ON p.id = u.id
WHERE p.email LIKE '%francisco%' OR u.email LIKE '%francisco%';

-- Step 4: Test if Francisco can see promo codes (simulate RLS)
SELECT 
  'Step 4: Simulating Francisco query (with RLS)' as step;

SET LOCAL "request.jwt.claims" TO '{"email": "francisco@crowdconscious.app"}';

SELECT 
  code,
  active,
  current_uses
FROM promo_codes
WHERE EXISTS (
  SELECT 1 FROM profiles 
  WHERE profiles.id = auth.uid() 
  AND profiles.email = 'francisco@crowdconscious.app'
);

RESET "request.jwt.claims";

-- =====================================================
-- DIAGNOSIS
-- =====================================================

SELECT 
  'DIAGNOSIS:' as section,
  
  CASE 
    WHEN (SELECT COUNT(*) FROM promo_codes) = 0
    THEN '❌ NO promo codes in database - Need to create them'
    ELSE '✅ Promo codes exist (' || (SELECT COUNT(*)::text FROM promo_codes) || ' total)'
  END as promo_codes_exist,
  
  CASE 
    WHEN (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'promo_codes' AND cmd = 'SELECT') = 0
    THEN '❌ NO SELECT policies - Admin cannot view codes'
    ELSE '✅ SELECT policies exist'
  END as rls_policies_exist,
  
  CASE 
    WHEN (SELECT COUNT(*) FROM profiles p JOIN auth.users u ON p.id = u.id WHERE u.email = 'francisco@crowdconscious.app') = 0
    THEN '❌ Francisco profile not found - Cannot bypass RLS'
    ELSE '✅ Francisco profile exists'
  END as admin_profile_exists;

-- =====================================================
-- QUICK FIX: Re-create promo codes if missing
-- =====================================================

-- Only run if promo codes are missing
DO $$
DECLARE
  francisco_id UUID;
BEGIN
  -- Get Francisco's user ID
  SELECT id INTO francisco_id FROM auth.users WHERE email = 'francisco@crowdconscious.app';
  
  IF francisco_id IS NULL THEN
    RAISE WARNING 'Francisco user not found - cannot set creator';
    francisco_id := (SELECT id FROM auth.users LIMIT 1); -- Use any user as fallback
  END IF;
  
  -- Delete and recreate promo codes
  DELETE FROM promo_codes WHERE code IN ('DEMOJAVI', 'DEMOPUNKY', 'DOMINGO1');
  
  -- Insert DEMOJAVI
  INSERT INTO promo_codes (
    code, description, discount_type, discount_value,
    max_uses, max_uses_per_user, current_uses,
    valid_from, valid_until, active,
    partner_name, campaign_name, minimum_purchase_amount,
    created_by, created_at
  ) VALUES (
    'DEMOJAVI',
    'Demo access for Javi - 100% discount on all modules',
    'percentage', 100,
    100, 10, 0,
    NOW(), NOW() + INTERVAL '1 year', true,
    'Javi Rodriguez', 'Partner Demo Campaign', 0,
    francisco_id, NOW()
  );
  
  -- Insert DEMOPUNKY
  INSERT INTO promo_codes (
    code, description, discount_type, discount_value,
    max_uses, max_uses_per_user, current_uses,
    valid_from, valid_until, active,
    partner_name, campaign_name, minimum_purchase_amount,
    created_by, created_at
  ) VALUES (
    'DEMOPUNKY',
    'Demo access for Punky - 100% discount on all modules',
    'percentage', 100,
    100, 10, 0,
    NOW(), NOW() + INTERVAL '1 year', true,
    'Punky Martinez', 'Partner Demo Campaign', 0,
    francisco_id, NOW()
  );
  
  -- Insert DOMINGO1
  INSERT INTO promo_codes (
    code, description, discount_type, discount_value,
    max_uses, max_uses_per_user, current_uses,
    valid_from, valid_until, active,
    partner_name, campaign_name, minimum_purchase_amount,
    created_by, created_at
  ) VALUES (
    'DOMINGO1',
    'Sunday Launch Special - 100% discount for early adopters',
    'percentage', 100,
    1000, 2, 0,
    NOW(), NOW() + INTERVAL '30 days', true,
    NULL, 'Launch Campaign', 0,
    francisco_id, NOW()
  );
  
  RAISE NOTICE 'Promo codes recreated successfully';
END $$;

-- Verify creation
SELECT 
  '✅ PROMO CODES RECREATED' as status,
  code,
  active,
  current_uses || '/' || max_uses as usage
FROM promo_codes
WHERE code IN ('DEMOJAVI', 'DEMOPUNKY', 'DOMINGO1')
ORDER BY code;

