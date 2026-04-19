-- FIX-FREE-PURCHASES-SIMPLE.sql
-- Simple version: Just drop the constraint blocking free purchases

-- Drop the constraint that prevents $0 purchases
ALTER TABLE public.module_sales 
DROP CONSTRAINT IF EXISTS module_sales_total_amount_check;

ALTER TABLE public.module_sales 
DROP CONSTRAINT IF EXISTS module_sales_check;

-- Verify it's gone
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.module_sales'::regclass
AND contype = 'c'
ORDER BY conname;

-- If the query above returns no rows (or doesn't show the constraint), you're good!
-- Free purchases (100% promo codes) now work!

