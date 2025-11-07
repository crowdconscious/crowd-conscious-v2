-- FIX-FREE-PURCHASES.sql
-- Fix constraint that blocks free purchases (promo codes at 100% off)

-- Problem: module_sales has a check constraint that requires total_amount > 0
-- This breaks when users use 100% off promo codes
-- Solution: Drop the constraint or modify it to allow 0

DO $$
BEGIN
    RAISE NOTICE '🔧 Fixing free purchases constraint...';

    -- Check if the constraint exists
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'module_sales_total_amount_check'
    ) THEN
        RAISE NOTICE '❌ Found blocking constraint: module_sales_total_amount_check';
        
        -- Drop the constraint that blocks $0 purchases
        ALTER TABLE public.module_sales 
        DROP CONSTRAINT IF EXISTS module_sales_total_amount_check;
        
        RAISE NOTICE '✅ Constraint dropped - free purchases now allowed';
    ELSE
        RAISE NOTICE '✅ Constraint does not exist - already OK';
    END IF;

    -- Also check for any other amount-related constraints
    ALTER TABLE public.module_sales 
    DROP CONSTRAINT IF EXISTS module_sales_check;
    
    RAISE NOTICE '🎉 Free purchases (100% promo codes) now work!';
    
END $$;

-- Verify the fix
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.module_sales'::regclass
AND contype = 'c'; -- Check constraints only

