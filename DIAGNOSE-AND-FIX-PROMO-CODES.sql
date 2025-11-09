-- ============================================
-- DIAGNOSE AND FIX PROMO CODES ISSUE
-- ============================================

-- Step 1: Check if promo codes exist in the table
SELECT 
  'STEP 1: Checking existing promo codes' as step;

SELECT 
  id,
  code,
  description,
  discount_type,
  discount_value,
  active,
  current_uses,
  max_uses,
  partner_name,
  campaign_name,
  valid_from,
  valid_until,
  created_at
FROM promo_codes
ORDER BY created_at DESC;

-- Step 2: Check RLS policies on promo_codes table
SELECT 
  'STEP 2: Checking RLS policies on promo_codes' as step;

SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'promo_codes'
ORDER BY policyname;

-- Step 3: Check if table has RLS enabled
SELECT 
  'STEP 3: Checking if RLS is enabled' as step;

SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE tablename = 'promo_codes';

-- ============================================
-- FIX: Ensure admins can see and manage promo codes
-- ============================================

-- Drop any restrictive policies
DROP POLICY IF EXISTS "admins_can_view_promo_codes" ON promo_codes;
DROP POLICY IF EXISTS "admins_can_manage_promo_codes" ON promo_codes;
DROP POLICY IF EXISTS "authenticated_can_view_active_codes" ON promo_codes;

-- Create comprehensive policies
-- Policy 1: Everyone can view active promo codes (for applying them at checkout)
CREATE POLICY "anyone_can_view_active_promo_codes" 
ON promo_codes FOR SELECT
USING (
  active = true
);

-- Policy 2: Super admins can view ALL promo codes (active + inactive)
CREATE POLICY "admins_can_view_all_promo_codes" 
ON promo_codes FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.email = 'francisco@crowdconscious.app'
  )
);

-- Policy 3: Super admins can insert promo codes
CREATE POLICY "admins_can_insert_promo_codes" 
ON promo_codes FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.email = 'francisco@crowdconscious.app'
  )
);

-- Policy 4: Super admins can update promo codes
CREATE POLICY "admins_can_update_promo_codes" 
ON promo_codes FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.email = 'francisco@crowdconscious.app'
  )
);

-- Policy 5: Super admins can delete promo codes
CREATE POLICY "admins_can_delete_promo_codes" 
ON promo_codes FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.email = 'francisco@crowdconscious.app'
  )
);

-- ============================================
-- RECREATE PROMO CODES (if they don't exist)
-- ============================================

-- Delete existing codes first (to avoid duplicates)
DELETE FROM promo_codes WHERE code IN ('DEMOJAVI', 'DEMOPUNKY', 'DOMINGO1');

-- Get Francisco's user ID
DO $$
DECLARE
  francisco_id UUID;
BEGIN
  SELECT id INTO francisco_id FROM auth.users WHERE email = 'francisco@crowdconscious.app';
  
  IF francisco_id IS NOT NULL THEN
    -- Insert DEMOJAVI (100% discount for Javi)
    INSERT INTO promo_codes (
      code,
      description,
      discount_type,
      discount_value,
      max_uses,
      max_uses_per_user,
      current_uses,
      valid_from,
      valid_until,
      active,
      partner_name,
      campaign_name,
      minimum_purchase_amount,
      created_by,
      created_at
    ) VALUES (
      'DEMOJAVI',
      'Demo access for Javi - 100% discount on all modules',
      'percentage',
      100,
      100,
      10,
      0,
      NOW(),
      NOW() + INTERVAL '1 year',
      true,
      'Javi Rodriguez',
      'Partner Demo Campaign',
      0,
      francisco_id,
      NOW()
    );

    -- Insert DEMOPUNKY (100% discount for Punky)
    INSERT INTO promo_codes (
      code,
      description,
      discount_type,
      discount_value,
      max_uses,
      max_uses_per_user,
      current_uses,
      valid_from,
      valid_until,
      active,
      partner_name,
      campaign_name,
      minimum_purchase_amount,
      created_by,
      created_at
    ) VALUES (
      'DEMOPUNKY',
      'Demo access for Punky - 100% discount on all modules',
      'percentage',
      100,
      100,
      10,
      0,
      NOW(),
      NOW() + INTERVAL '1 year',
      true,
      'Punky Martinez',
      'Partner Demo Campaign',
      0,
      francisco_id,
      NOW()
    );

    -- Insert DOMINGO1 (100% discount for Sunday launch)
    INSERT INTO promo_codes (
      code,
      description,
      discount_type,
      discount_value,
      max_uses,
      max_uses_per_user,
      current_uses,
      valid_from,
      valid_until,
      active,
      partner_name,
      campaign_name,
      minimum_purchase_amount,
      created_by,
      created_at
    ) VALUES (
      'DOMINGO1',
      'Sunday Launch Special - 100% discount for early adopters',
      'percentage',
      100,
      1000,
      2,
      0,
      NOW(),
      NOW() + INTERVAL '30 days',
      true,
      NULL,
      'Launch Campaign',
      0,
      francisco_id,
      NOW()
    );

    RAISE NOTICE 'Successfully created 3 promo codes: DEMOJAVI, DEMOPUNKY, DOMINGO1';
  ELSE
    RAISE WARNING 'Could not find Francisco user to set as creator';
  END IF;
END $$;

-- ============================================
-- VERIFY: Check if codes were created
-- ============================================

SELECT 
  'VERIFICATION: Promo codes now in database' as status;

SELECT 
  code,
  description,
  discount_value || '%' as discount,
  active,
  current_uses,
  max_uses,
  partner_name,
  campaign_name,
  valid_from::date as valid_from,
  valid_until::date as valid_until
FROM promo_codes
WHERE code IN ('DEMOJAVI', 'DEMOPUNKY', 'DOMINGO1')
ORDER BY code;

-- ============================================
-- CHECK: Promo code usage stats
-- ============================================

SELECT 
  'USAGE STATS: Checking promo_code_uses table' as status;

SELECT 
  pc.code,
  COUNT(pcu.id) as total_uses,
  SUM(pcu.discount_amount) as total_savings
FROM promo_codes pc
LEFT JOIN promo_code_uses pcu ON pc.id = pcu.promo_code_id
WHERE pc.code IN ('DEMOJAVI', 'DEMOPUNKY', 'DOMINGO1')
GROUP BY pc.code
ORDER BY pc.code;

-- ============================================
-- SUMMARY
-- ============================================

SELECT 
  'SUMMARY: RLS policies updated, codes recreated' as result,
  'Admins can now view/manage all codes' as admin_access,
  'Users can view active codes for checkout' as user_access,
  '3 demo codes created: DEMOJAVI, DEMOPUNKY, DOMINGO1' as codes_created;

