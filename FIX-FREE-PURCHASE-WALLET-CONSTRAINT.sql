-- =====================================================
-- FIX: Allow $0 transactions for free promo code purchases
-- =====================================================

-- ISSUE: wallet_transactions has CHECK constraint preventing $0 amounts
-- CAUSE: Free purchases (100% promo codes) try to create $0 wallet transactions
-- RESULT: process_module_sale RPC fails, enrollments never created

-- Step 1: Check current constraint
SELECT 
  'Step 1: Checking current constraint' as step;

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
-- (Completed transactions can be $0, but pending/failed should have amounts)
ALTER TABLE wallet_transactions
ADD CONSTRAINT wallet_transactions_amount_check 
CHECK (
  (status = 'completed' AND amount >= 0) OR  -- Allow $0 for completed (free purchases)
  (status != 'completed' AND amount > 0)      -- Require > $0 for pending/failed
);

-- Step 4: Verify new constraint
SELECT 
  'Step 2: Verifying new constraint' as step;

SELECT 
  conname as constraint_name,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conname = 'wallet_transactions_amount_check';

-- =====================================================
-- TEST: Verify $0 transactions now allowed
-- =====================================================

-- This should now succeed (test with dummy data)
DO $$
DECLARE
  test_wallet_id UUID;
  test_transaction_id UUID;
BEGIN
  -- Get platform wallet (or any wallet)
  SELECT id INTO test_wallet_id 
  FROM wallets 
  WHERE wallet_type = 'platform' 
  LIMIT 1;
  
  IF test_wallet_id IS NULL THEN
    RAISE NOTICE 'No platform wallet found - skipping test';
    RETURN;
  END IF;
  
  -- Try to insert a $0 transaction (should succeed now)
  INSERT INTO wallet_transactions (
    wallet_id,
    transaction_type,
    amount,
    description,
    status,
    metadata
  ) VALUES (
    test_wallet_id,
    'credit',
    0.00,  -- $0 transaction
    'TEST: Free purchase via 100% promo code',
    'completed',
    '{"test": true}'::jsonb
  )
  RETURNING id INTO test_transaction_id;
  
  -- Clean up test transaction
  DELETE FROM wallet_transactions WHERE id = test_transaction_id;
  
  RAISE NOTICE '✅ Test passed: $0 transactions now allowed for completed status';
EXCEPTION
  WHEN check_violation THEN
    RAISE WARNING '❌ Test failed: Constraint still blocking $0 transactions';
END $$;

-- =====================================================
-- SUMMARY
-- =====================================================

SELECT 
  '✅ CONSTRAINT FIXED' as status,
  'Free purchases (100% promo codes) will now work' as result,
  'Webhook will successfully create enrollments' as outcome,
  'Test a purchase with DEMOJAVI to verify' as next_step;

