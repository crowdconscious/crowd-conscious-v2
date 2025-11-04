-- NUCLEAR OPTION: Disable RLS on both tables to test
-- This will help us identify exactly where the permission error is coming from

-- Disable RLS on cart_items
ALTER TABLE cart_items DISABLE ROW LEVEL SECURITY;

-- Disable RLS on profiles (this is likely the culprit)
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- Verify both are disabled
SELECT 
  tablename, 
  rowsecurity 
FROM pg_tables 
WHERE tablename IN ('cart_items', 'profiles')
ORDER BY tablename;

-- Should show:
-- cart_items | false
-- profiles   | false

-- Now test in browser console:
-- fetch('/api/cart').then(r => r.json()).then(console.log)

-- If this works, the problem was profiles table RLS
-- If it still fails, the problem is somewhere else in the code

