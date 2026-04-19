-- =====================================================
-- FIX: Allow $0 transactions for free promo code purchases
-- =====================================================
-- SIMPLE VERSION (no DO blocks for Supabase compatibility)

-- Step 1: Check current constraint
SELECT 
  conname as constraint_name,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conname LIKE '%wallet_transactions%amount%'
  AND conrelid = 'wallet_transactions'::regclass;

-- Step 2: Drop the restrictive constraint
ALTER TABLE wallet_transactions 
DROP CONSTRAINT IF EXISTS wallet_transactions_amount_check;

-- Step 3: Add new constraint that allows $0 for completed transactions
ALTER TABLE wallet_transactions
ADD CONSTRAINT wallet_transactions_amount_check 
CHECK (
  (status = 'completed' AND amount >= 0) OR
  (status != 'completed' AND amount > 0)
);

-- Step 4: Verify new constraint was created
SELECT 
  conname as constraint_name,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conname = 'wallet_transactions_amount_check';

-- =====================================================
-- SUMMARY
-- =====================================================

SELECT 
  '✅ CONSTRAINT FIXED' as status,
  'Free purchases (100% promo codes) will now work' as result,
  'Webhook will successfully create enrollments' as outcome,
  'Test a purchase with DEMOJAVI to verify' as next_step;

