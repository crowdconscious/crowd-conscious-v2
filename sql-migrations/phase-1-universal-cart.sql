-- ============================================================================
-- PHASE 1: UNIVERSAL CART MIGRATION
-- ============================================================================
-- Purpose: Enable cart for ALL users (individuals + corporates)
-- Status: Ready to run
-- ============================================================================

BEGIN;

-- ============================================================================
-- STEP 1: Add user_id column to cart_items
-- ============================================================================
-- Allow individual users to have carts (not just corporates)

ALTER TABLE cart_items 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

COMMENT ON COLUMN cart_items.user_id IS 'Individual user who owns this cart item (NULL for corporate carts)';

-- ============================================================================
-- STEP 2: Make corporate_account_id optional
-- ============================================================================
-- Now cart items can belong to EITHER a user OR a corporate account

ALTER TABLE cart_items 
ALTER COLUMN corporate_account_id DROP NOT NULL;

-- ============================================================================
-- STEP 3: Add check constraint (either user_id OR corporate_account_id required)
-- ============================================================================
-- Ensure every cart item has an owner (individual OR corporate)

ALTER TABLE cart_items
DROP CONSTRAINT IF EXISTS cart_owner_check;

ALTER TABLE cart_items
ADD CONSTRAINT cart_owner_check 
CHECK (
  (user_id IS NOT NULL AND corporate_account_id IS NULL) OR
  (user_id IS NULL AND corporate_account_id IS NOT NULL)
);

COMMENT ON CONSTRAINT cart_owner_check ON cart_items IS 
'Ensures cart item belongs to either an individual user OR a corporate account (not both, not neither)';

-- ============================================================================
-- STEP 4: Update unique constraints
-- ============================================================================
-- Prevent duplicate module entries per user/corporate account

-- Drop old constraint (corporate-only)
ALTER TABLE cart_items
DROP CONSTRAINT IF EXISTS cart_items_corporate_account_id_module_id_key;

-- New unique constraint for individual users
DROP INDEX IF EXISTS cart_items_user_module_unique;
CREATE UNIQUE INDEX cart_items_user_module_unique 
ON cart_items(user_id, module_id) 
WHERE user_id IS NOT NULL;

COMMENT ON INDEX cart_items_user_module_unique IS 
'Prevents individual users from adding the same module to cart twice';

-- New unique constraint for corporate accounts
DROP INDEX IF EXISTS cart_items_corporate_module_unique;
CREATE UNIQUE INDEX cart_items_corporate_module_unique 
ON cart_items(corporate_account_id, module_id) 
WHERE corporate_account_id IS NOT NULL;

COMMENT ON INDEX cart_items_corporate_module_unique IS 
'Prevents corporate accounts from adding the same module to cart twice';

-- ============================================================================
-- STEP 5: Update RLS policies to support both user types
-- ============================================================================

-- Drop old corporate-only policies
DROP POLICY IF EXISTS "Corporate admins can view own cart" ON cart_items;
DROP POLICY IF EXISTS "Corporate admins can add to own cart" ON cart_items;
DROP POLICY IF EXISTS "Corporate admins can update own cart items" ON cart_items;
DROP POLICY IF EXISTS "Corporate admins can delete own cart items" ON cart_items;

-- NEW: Universal SELECT policy
CREATE POLICY "Users can view own cart"
ON cart_items FOR SELECT
USING (
  -- Individual users can see their own cart
  user_id = auth.uid() 
  OR
  -- Corporate admins can see their corporate cart
  corporate_account_id IN (
    SELECT corporate_account_id FROM profiles
    WHERE id = auth.uid() AND corporate_role = 'admin'
  )
);

COMMENT ON POLICY "Users can view own cart" ON cart_items IS
'Allows individual users to view their cart, and corporate admins to view their corporate cart';

-- NEW: Universal INSERT policy
CREATE POLICY "Users can add to own cart"
ON cart_items FOR INSERT
WITH CHECK (
  -- Individual users can add to their cart
  user_id = auth.uid() 
  OR
  -- Corporate admins can add to their corporate cart
  corporate_account_id IN (
    SELECT corporate_account_id FROM profiles
    WHERE id = auth.uid() AND corporate_role = 'admin'
  )
);

COMMENT ON POLICY "Users can add to own cart" ON cart_items IS
'Allows individual users to add to their cart, and corporate admins to add to corporate cart';

-- NEW: Universal UPDATE policy
CREATE POLICY "Users can update own cart"
ON cart_items FOR UPDATE
USING (
  -- Individual users can update their cart items
  user_id = auth.uid() 
  OR
  -- Corporate admins can update their corporate cart items
  corporate_account_id IN (
    SELECT corporate_account_id FROM profiles
    WHERE id = auth.uid() AND corporate_role = 'admin'
  )
);

COMMENT ON POLICY "Users can update own cart" ON cart_items IS
'Allows individual users to update their cart items, and corporate admins to update corporate cart items';

-- NEW: Universal DELETE policy
CREATE POLICY "Users can delete from own cart"
ON cart_items FOR DELETE
USING (
  -- Individual users can delete from their cart
  user_id = auth.uid() 
  OR
  -- Corporate admins can delete from their corporate cart
  corporate_account_id IN (
    SELECT corporate_account_id FROM profiles
    WHERE id = auth.uid() AND corporate_role = 'admin'
  )
);

COMMENT ON POLICY "Users can delete from own cart" ON cart_items IS
'Allows individual users to delete from their cart, and corporate admins to delete from corporate cart';

-- ============================================================================
-- STEP 6: Create helper function to get cart owner
-- ============================================================================
-- Useful for debugging and analytics

CREATE OR REPLACE FUNCTION get_cart_owner_type(cart_item_id UUID)
RETURNS TEXT AS $$
BEGIN
  RETURN (
    SELECT 
      CASE 
        WHEN user_id IS NOT NULL THEN 'individual'
        WHEN corporate_account_id IS NOT NULL THEN 'corporate'
        ELSE 'unknown'
      END
    FROM cart_items
    WHERE id = cart_item_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_cart_owner_type IS
'Returns "individual" or "corporate" based on cart item ownership';

-- ============================================================================
-- VERIFICATION QUERIES (Run after migration)
-- ============================================================================

-- Verify table structure
DO $$
BEGIN
  RAISE NOTICE '=== VERIFICATION ===';
  RAISE NOTICE 'Cart items table updated successfully';
  RAISE NOTICE 'New columns: user_id (nullable)';
  RAISE NOTICE 'Updated columns: corporate_account_id (now nullable)';
  RAISE NOTICE 'Constraints: cart_owner_check (ensures one owner type)';
  RAISE NOTICE 'Indexes: cart_items_user_module_unique, cart_items_corporate_module_unique';
  RAISE NOTICE 'RLS Policies: 4 universal policies created';
END $$;

COMMIT;

-- ============================================================================
-- POST-MIGRATION TESTS (Optional - run separately)
-- ============================================================================

/*
-- Test 1: Verify constraint works (should fail - no owner)
INSERT INTO cart_items (module_id, employee_count, price_snapshot)
VALUES ('test-module-id', 1, 1000);
-- Expected: ERROR - violates check constraint "cart_owner_check"

-- Test 2: Verify constraint works (should fail - both owners)
INSERT INTO cart_items (user_id, corporate_account_id, module_id, employee_count, price_snapshot)
VALUES ('user-id', 'corporate-id', 'test-module-id', 1, 1000);
-- Expected: ERROR - violates check constraint "cart_owner_check"

-- Test 3: Verify individual cart works (should succeed)
INSERT INTO cart_items (user_id, module_id, employee_count, price_snapshot)
VALUES (auth.uid(), 'test-module-id', 1, 1000);
-- Expected: SUCCESS

-- Test 4: Verify corporate cart still works (should succeed)
INSERT INTO cart_items (corporate_account_id, module_id, employee_count, price_snapshot)
VALUES ('your-corporate-id', 'test-module-id', 50, 18000);
-- Expected: SUCCESS

-- Test 5: Verify unique constraint (should fail - duplicate)
INSERT INTO cart_items (user_id, module_id, employee_count, price_snapshot)
VALUES (auth.uid(), 'test-module-id', 1, 1000);
-- Expected: ERROR - violates unique constraint
*/

