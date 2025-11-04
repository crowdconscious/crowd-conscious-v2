-- FINAL COMPREHENSIVE FIX FOR CART SYSTEM
-- This addresses ALL potential RLS permission issues

-- ============================================
-- PART 1: Fix cart_items table (disable RLS temporarily for testing)
-- ============================================

-- Disable RLS on cart_items (we'll re-enable with better policies)
ALTER TABLE cart_items DISABLE ROW LEVEL SECURITY;

-- ============================================
-- PART 2: Check and fix profiles table RLS
-- ============================================

-- Check current profiles policies
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'profiles';

-- The profiles table RLS might be causing the "permission denied for table users" error
-- Let's make sure profiles can be read by authenticated users

-- Drop problematic policies on profiles (if they exist)
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

-- Create simple, working policies for profiles
CREATE POLICY "Enable read access for authenticated users"
ON profiles FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Enable update for users based on id"
ON profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id);

-- ============================================
-- PART 3: Test cart API
-- ============================================

-- Now test in browser console:
-- fetch('/api/cart').then(r => r.json()).then(console.log)
-- Should return: {items: [], summary: {...}}

-- ============================================
-- PART 4: If step 3 works, re-enable RLS with simple policies
-- ============================================

-- Re-enable RLS on cart_items
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;

-- Create VERY SIMPLE policies that don't cause permission issues
CREATE POLICY "cart_select_policy"
ON cart_items FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND p.corporate_account_id = cart_items.corporate_account_id
    AND p.corporate_role = 'admin'
  )
);

CREATE POLICY "cart_insert_policy"
ON cart_items FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND p.corporate_account_id = cart_items.corporate_account_id
    AND p.corporate_role = 'admin'
  )
);

CREATE POLICY "cart_update_policy"
ON cart_items FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND p.corporate_account_id = cart_items.corporate_account_id
    AND p.corporate_role = 'admin'
  )
);

CREATE POLICY "cart_delete_policy"
ON cart_items FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND p.corporate_account_id = cart_items.corporate_account_id
    AND p.corporate_role = 'admin'
  )
);

-- ============================================
-- PART 5: Verify everything
-- ============================================

-- Check cart_items RLS is enabled
SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'cart_items';

-- Check cart_items policies
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'cart_items';

-- Check profiles policies
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'profiles';

-- Test query as your user
SELECT 
  ci.*,
  mm.title
FROM cart_items ci
LEFT JOIN marketplace_modules mm ON mm.id = ci.module_id
WHERE ci.corporate_account_id = (
  SELECT corporate_account_id FROM profiles WHERE id = auth.uid()
);

-- If you see results or "0 rows", SUCCESS!
-- If you see "permission denied", there's still an RLS issue somewhere

