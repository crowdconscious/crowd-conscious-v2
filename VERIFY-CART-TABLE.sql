-- Run this in Supabase SQL Editor to verify cart_items table exists

-- 1. Check if table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'cart_items'
) as table_exists;

-- 2. Check table structure
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'cart_items'
ORDER BY ordinal_position;

-- 3. Check RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'cart_items';

-- 4. Check policies exist
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'cart_items';

-- 5. Check if you're a corporate admin
SELECT 
  id,
  email,
  corporate_role,
  corporate_account_id,
  user_type
FROM profiles 
WHERE id = auth.uid();

-- 6. Try to select from cart_items (should work if you're a corporate admin)
SELECT * FROM cart_items;

