-- Diagnose cart and enrollment issues

-- 1. Check cart_items structure and constraints
SELECT 
  'cart_items_constraints' as check_type,
  conname as constraint_name,
  contype as constraint_type,
  pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'cart_items'::regclass;

-- 2. Check for duplicate cart items for a user
SELECT 
  'cart_duplicates' as check_type,
  user_id,
  module_id,
  COUNT(*) as duplicate_count
FROM cart_items
WHERE user_id IS NOT NULL
GROUP BY user_id, module_id
HAVING COUNT(*) > 1;

-- 3. Check course_enrollments structure
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'course_enrollments'
ORDER BY ordinal_position;

-- 4. Check if there are enrollments blocking purchases
SELECT 
  'existing_enrollments' as check_type,
  user_id,
  module_id,
  enrolled_at,
  completed,
  progress_percentage
FROM course_enrollments
LIMIT 10;

-- 5. Check RLS policies on cart_items
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'cart_items';

-- 6. Check RLS policies on course_enrollments
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'course_enrollments';

