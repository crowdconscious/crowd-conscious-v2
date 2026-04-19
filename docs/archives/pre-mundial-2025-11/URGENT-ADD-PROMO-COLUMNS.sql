-- ============================================================================
-- URGENT: Add Promo Code Columns to cart_items
-- ============================================================================
-- This adds the missing columns needed for promo codes to work in checkout
-- ============================================================================

-- Step 1: Add promo_code_id column
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'cart_items' AND column_name = 'promo_code_id'
  ) THEN
    ALTER TABLE cart_items 
    ADD COLUMN promo_code_id UUID REFERENCES promo_codes(id) ON DELETE SET NULL;
    
    RAISE NOTICE '✅ Added promo_code_id column to cart_items';
  ELSE
    RAISE NOTICE 'ℹ️  promo_code_id column already exists';
  END IF;
END $$;

-- Step 2: Add discounted_price column
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'cart_items' AND column_name = 'discounted_price'
  ) THEN
    ALTER TABLE cart_items 
    ADD COLUMN discounted_price NUMERIC(10, 2) DEFAULT NULL;
    
    RAISE NOTICE '✅ Added discounted_price column to cart_items';
  ELSE
    RAISE NOTICE 'ℹ️  discounted_price column already exists';
  END IF;
END $$;

-- Step 3: Verify columns were added
DO $$ 
BEGIN 
  RAISE NOTICE '🔍 Verifying cart_items columns...';
END $$;

SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'cart_items'
ORDER BY ordinal_position;

-- Step 4: Show current cart data
SELECT 
  id,
  user_id IS NOT NULL as has_user_id,
  corporate_account_id IS NOT NULL as has_corporate_id,
  module_id,
  employee_count,
  price_snapshot,
  CASE 
    WHEN column_name = 'promo_code_id' THEN 'Column exists'
    ELSE 'Column missing'
  END as promo_status
FROM cart_items
CROSS JOIN (
  SELECT column_name 
  FROM information_schema.columns 
  WHERE table_name = 'cart_items' AND column_name = 'promo_code_id'
  LIMIT 1
) cols
LIMIT 10;

-- Step 5: Success message
DO $$ 
BEGIN 
  RAISE NOTICE '✅ Done! Now try applying a promo code in your cart.';
END $$;

