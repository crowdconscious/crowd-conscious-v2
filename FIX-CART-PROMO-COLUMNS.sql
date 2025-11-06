-- ============================================================================
-- FIX CART PROMO COLUMNS - Add missing promo code fields
-- ============================================================================
-- Run this in Supabase SQL Editor to add missing columns for promo codes
-- ============================================================================

-- Step 1: Check current columns
DO $$ 
BEGIN 
  RAISE NOTICE '🔍 Checking cart_items table columns...';
END $$;

SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'cart_items'
ORDER BY ordinal_position;

-- Step 2: Add missing promo_code_id column if it doesn't exist
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'cart_items' AND column_name = 'promo_code_id'
  ) THEN
    ALTER TABLE cart_items 
    ADD COLUMN promo_code_id UUID REFERENCES promo_codes(id) ON DELETE SET NULL;
    RAISE NOTICE '✅ Added promo_code_id column';
  ELSE
    RAISE NOTICE 'ℹ️ promo_code_id column already exists';
  END IF;
END $$;

-- Step 3: Add missing discounted_price column if it doesn't exist
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'cart_items' AND column_name = 'discounted_price'
  ) THEN
    ALTER TABLE cart_items 
    ADD COLUMN discounted_price NUMERIC(10, 2) DEFAULT NULL;
    RAISE NOTICE '✅ Added discounted_price column';
  ELSE
    RAISE NOTICE 'ℹ️ discounted_price column already exists';
  END IF;
END $$;

-- Step 4: Verify columns were added
DO $$ 
BEGIN 
  RAISE NOTICE '✅ Verification: Checking all cart_items columns...';
END $$;

SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'cart_items'
AND column_name IN (
  'id', 'user_id', 'corporate_account_id', 'module_id', 
  'employee_count', 'price_snapshot', 'promo_code_id', 'discounted_price', 'added_at'
)
ORDER BY column_name;

-- Step 5: Check if promo_codes table exists
DO $$ 
BEGIN 
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'promo_codes') THEN
    RAISE NOTICE '✅ promo_codes table exists';
  ELSE
    RAISE NOTICE '❌ promo_codes table does NOT exist - run promo code setup first!';
  END IF;
END $$;

-- Step 6: Show sample cart data
SELECT 
  id,
  user_id,
  corporate_account_id,
  module_id,
  employee_count,
  price_snapshot,
  promo_code_id,
  discounted_price,
  added_at
FROM cart_items
ORDER BY added_at DESC
LIMIT 5;

