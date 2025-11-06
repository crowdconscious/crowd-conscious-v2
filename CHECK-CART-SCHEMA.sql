-- Check cart_items table structure
SELECT 
  column_name, 
  data_type, 
  is_nullable, 
  column_default
FROM information_schema.columns
WHERE table_name = 'cart_items'
ORDER BY ordinal_position;
