-- ============================================
-- MINIMAL SETUP: Barebones corporate account
-- ============================================
-- This uses only the most basic fields that should exist
-- Run CHECK-SCHEMA.sql first to see available columns
-- 
-- INSTRUCTIONS:
-- 1. Replace 'your-email@example.com' with your actual email
-- 2. Run this in Supabase SQL Editor
-- ============================================

DO $$
DECLARE
  v_user_id UUID;
  v_corporate_id UUID;
BEGIN
  -- Find your user by email (CHANGE THIS EMAIL!)
  SELECT id INTO v_user_id 
  FROM auth.users 
  WHERE email = 'your-email@example.com'; -- ⚠️ CHANGE THIS!

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not found. Check your email address.';
  END IF;

  -- Create corporate account with ONLY basic fields
  INSERT INTO corporate_accounts (
    company_name,
    program_tier,
    employee_limit,
    admin_user_id
  ) VALUES (
    'Mi Empresa Test',
    'completo',
    100,
    v_user_id
  )
  RETURNING id INTO v_corporate_id;

  -- Update your profile to be corporate admin
  UPDATE profiles 
  SET 
    is_corporate_user = true,
    corporate_account_id = v_corporate_id,
    corporate_role = 'admin'
  WHERE id = v_user_id;

  -- Show success message
  RAISE NOTICE 'SUCCESS! Corporate account created with ID: %', v_corporate_id;
  RAISE NOTICE 'You are now a corporate admin. Go to /corporate/dashboard';
  
END $$;

-- Verify it worked:
SELECT 
  p.email,
  p.full_name,
  p.is_corporate_user,
  p.corporate_role,
  ca.company_name,
  ca.program_tier,
  ca.employee_limit
FROM profiles p
LEFT JOIN corporate_accounts ca ON p.corporate_account_id = ca.id
WHERE p.email = 'your-email@example.com'; -- ⚠️ CHANGE THIS!

