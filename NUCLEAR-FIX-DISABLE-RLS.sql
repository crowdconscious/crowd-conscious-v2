-- NUCLEAR OPTION: Temporarily disable RLS on cart_items to test
-- This will help us identify if RLS is the problem

-- Step 1: Disable RLS temporarily
ALTER TABLE cart_items DISABLE ROW LEVEL SECURITY;

-- Step 2: Test if cart works now
-- Go to browser and run: fetch('/api/cart').then(r => r.json()).then(console.log)
-- If it works, the problem is RLS policies

-- Step 3: Check what's in the cart_items table
SELECT * FROM cart_items;

-- Step 4: Check profiles table RLS (this might be the real culprit)
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'profiles';

-- Step 5: If cart works with RLS disabled, we'll create simpler policies
-- For now, let's just test without RLS to confirm that's the issue

