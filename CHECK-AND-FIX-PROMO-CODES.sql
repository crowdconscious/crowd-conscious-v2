-- Check existing promo codes and their status
SELECT 
  code,
  active,
  discount_type,
  discount_value,
  max_uses,
  current_uses,
  valid_until,
  partner_name,
  created_at
FROM promo_codes
WHERE code IN ('DEMOJAVI', 'DEMOPUNKY', 'DOMINGO1')
ORDER BY code;

-- If codes don't exist, this will return empty
-- If codes exist but are inactive, you'll see active = false

-- ============================================
-- FIX: Activate the promo codes
-- ============================================

UPDATE promo_codes
SET 
  active = true,
  valid_until = NULL  -- Remove expiry date if any
WHERE code IN ('DEMOJAVI', 'DEMOPUNKY', 'DOMINGO1');

-- Verify the update
SELECT 
  code,
  active,
  discount_type,
  discount_value,
  current_uses,
  partner_name
FROM promo_codes
WHERE code IN ('DEMOJAVI', 'DEMOPUNKY', 'DOMINGO1')
ORDER BY code;

-- ============================================
-- IF CODES DON'T EXIST, CREATE THEM:
-- ============================================

-- First, get your user ID (replace with your email)
DO $$
DECLARE
  v_user_id UUID;
BEGIN
  SELECT id INTO v_user_id 
  FROM auth.users 
  WHERE email = 'francisco@crowdconscious.app'
  LIMIT 1;

  -- Insert DEMOJAVI if it doesn't exist
  INSERT INTO promo_codes (
    code,
    description,
    discount_type,
    discount_value,
    max_uses,
    max_uses_per_user,
    active,
    partner_name,
    created_by
  )
  SELECT 
    'DEMOJAVI',
    'Demo code for Javi',
    'percentage',
    100,
    NULL,  -- Unlimited uses
    1,
    true,
    'Demo',
    v_user_id
  WHERE NOT EXISTS (
    SELECT 1 FROM promo_codes WHERE code = 'DEMOJAVI'
  );

  -- Insert DEMOPUNKY if it doesn't exist
  INSERT INTO promo_codes (
    code,
    description,
    discount_type,
    discount_value,
    max_uses,
    max_uses_per_user,
    active,
    partner_name,
    created_by
  )
  SELECT 
    'DEMOPUNKY',
    'Demo code for Punky',
    'percentage',
    100,
    NULL,
    1,
    true,
    'Demo',
    v_user_id
  WHERE NOT EXISTS (
    SELECT 1 FROM promo_codes WHERE code = 'DEMOPUNKY'
  );

  -- Insert DOMINGO1 if it doesn't exist
  INSERT INTO promo_codes (
    code,
    description,
    discount_type,
    discount_value,
    max_uses,
    max_uses_per_user,
    active,
    partner_name,
    created_by
  )
  SELECT 
    'DOMINGO1',
    'Promo code for Sunday launch',
    'percentage',
    100,
    NULL,
    1,
    true,
    'Launch Campaign',
    v_user_id
  WHERE NOT EXISTS (
    SELECT 1 FROM promo_codes WHERE code = 'DOMINGO1'
  );

  RAISE NOTICE 'Promo codes checked/created successfully';
END $$;

-- Final verification
SELECT 
  code,
  active,
  discount_type,
  discount_value,
  max_uses,
  current_uses,
  partner_name,
  description
FROM promo_codes
WHERE code IN ('DEMOJAVI', 'DEMOPUNKY', 'DOMINGO1')
ORDER BY code;

