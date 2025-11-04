-- FIX: Update cart_items RLS policies to avoid auth.users permission error
-- The issue: RLS policies can't directly query auth.users table
-- Solution: Use auth.uid() which is always available

-- Drop all existing policies
DROP POLICY IF EXISTS "Corporate admins can view own cart" ON cart_items;
DROP POLICY IF EXISTS "Corporate admins can add to own cart" ON cart_items;
DROP POLICY IF EXISTS "Corporate admins can update own cart items" ON cart_items;
DROP POLICY IF EXISTS "Corporate admins can delete own cart items" ON cart_items;

-- Recreate policies with simpler logic that doesn't query auth.users

-- Policy 1: SELECT (view cart)
CREATE POLICY "Corporate admins can view own cart"
ON cart_items FOR SELECT
USING (
  corporate_account_id IN (
    SELECT corporate_account_id 
    FROM profiles 
    WHERE id = auth.uid() 
    AND corporate_role = 'admin'
  )
);

-- Policy 2: INSERT (add to cart)
CREATE POLICY "Corporate admins can add to own cart"
ON cart_items FOR INSERT
WITH CHECK (
  corporate_account_id IN (
    SELECT corporate_account_id 
    FROM profiles 
    WHERE id = auth.uid() 
    AND corporate_role = 'admin'
  )
);

-- Policy 3: UPDATE (update cart items)
CREATE POLICY "Corporate admins can update own cart items"
ON cart_items FOR UPDATE
USING (
  corporate_account_id IN (
    SELECT corporate_account_id 
    FROM profiles 
    WHERE id = auth.uid() 
    AND corporate_role = 'admin'
  )
);

-- Policy 4: DELETE (remove from cart)
CREATE POLICY "Corporate admins can delete own cart items"
ON cart_items FOR DELETE
USING (
  corporate_account_id IN (
    SELECT corporate_account_id 
    FROM profiles 
    WHERE id = auth.uid() 
    AND corporate_role = 'admin'
  )
);

-- Verify policies were created
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  cmd
FROM pg_policies
WHERE tablename = 'cart_items'
ORDER BY policyname;

-- Test: Try to select from cart_items (should work now)
SELECT COUNT(*) as cart_item_count FROM cart_items;

