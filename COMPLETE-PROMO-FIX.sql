-- ============================================================================
-- COMPLETE PROMO CODE FIX - Run this ENTIRE script
-- ============================================================================
-- This will set up everything needed for promo codes to work
-- ============================================================================

-- PART 1: Add columns to cart_items table
-- ============================================================================

-- Check and add promo_code_id
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public'
    AND table_name = 'cart_items' 
    AND column_name = 'promo_code_id'
  ) THEN
    ALTER TABLE cart_items 
    ADD COLUMN promo_code_id UUID;
    
    RAISE NOTICE '✅ Added promo_code_id column';
  ELSE
    RAISE NOTICE 'ℹ️  promo_code_id already exists';
  END IF;
END $$;

-- Check and add discounted_price
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public'
    AND table_name = 'cart_items' 
    AND column_name = 'discounted_price'
  ) THEN
    ALTER TABLE cart_items 
    ADD COLUMN discounted_price NUMERIC(10, 2);
    
    RAISE NOTICE '✅ Added discounted_price column';
  ELSE
    RAISE NOTICE 'ℹ️  discounted_price already exists';
  END IF;
END $$;

-- Add foreign key constraint if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'cart_items_promo_code_id_fkey'
  ) THEN
    -- Only add if promo_codes table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'promo_codes') THEN
      ALTER TABLE cart_items 
      ADD CONSTRAINT cart_items_promo_code_id_fkey 
      FOREIGN KEY (promo_code_id) REFERENCES promo_codes(id) ON DELETE SET NULL;
      
      RAISE NOTICE '✅ Added foreign key constraint';
    ELSE
      RAISE NOTICE '⚠️  promo_codes table does not exist - run promo code system setup first';
    END IF;
  ELSE
    RAISE NOTICE 'ℹ️  Foreign key already exists';
  END IF;
END $$;

-- PART 2: Verify columns
-- ============================================================================

SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'cart_items'
AND column_name IN ('promo_code_id', 'discounted_price')
ORDER BY column_name;

-- PART 3: Check current cart (for debugging)
-- ============================================================================

SELECT 
  ci.id,
  ci.module_id,
  ci.price_snapshot,
  ci.promo_code_id,
  ci.discounted_price,
  ci.user_id IS NOT NULL as has_user,
  ci.corporate_account_id IS NOT NULL as has_corporate,
  mm.title
FROM cart_items ci
LEFT JOIN marketplace_modules mm ON ci.module_id = mm.id
ORDER BY ci.added_at DESC
LIMIT 10;

-- PART 4: Success message
-- ============================================================================

DO $$ 
BEGIN 
  RAISE NOTICE '✅ DONE! Columns added successfully.';
  RAISE NOTICE '📋 Next steps:';
  RAISE NOTICE '1. Clear your cart completely (remove all items)';
  RAISE NOTICE '2. Re-add modules from marketplace';
  RAISE NOTICE '3. Apply promo code DEMOJAVI';
  RAISE NOTICE '4. Verify discount shows in cart';
  RAISE NOTICE '5. Go to checkout - should show discounted price';
END $$;

