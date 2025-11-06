-- Check if cart_items has the promo code columns we need
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'cart_items'
AND column_name IN ('promo_code_id', 'discount_amount', 'discounted_price', 'final_price')
ORDER BY column_name;

