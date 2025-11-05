-- =====================================================
-- AUTO-CREATE USER WALLET FUNCTION
-- Purpose: Automatically create a wallet for a user if it doesn't exist
-- Used when: User creates their first module as an individual creator
-- =====================================================

CREATE OR REPLACE FUNCTION ensure_user_wallet(p_user_id UUID)
RETURNS UUID AS $$
DECLARE
  v_wallet_id UUID;
BEGIN
  -- Try to insert, ignore if exists (ON CONFLICT DO NOTHING)
  INSERT INTO wallets (owner_type, owner_id, balance, currency, status)
  VALUES ('user', p_user_id, 0.00, 'MXN', 'active')
  ON CONFLICT (owner_type, owner_id) DO NOTHING
  RETURNING id INTO v_wallet_id;
  
  -- If wallet already existed, fetch it
  IF v_wallet_id IS NULL THEN
    SELECT id INTO v_wallet_id 
    FROM wallets
    WHERE owner_type = 'user' AND owner_id = p_user_id;
  END IF;
  
  RETURN v_wallet_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION ensure_user_wallet(UUID) TO authenticated;

-- Add comment
COMMENT ON FUNCTION ensure_user_wallet IS 'Automatically creates a wallet for a user if it doesn''t exist. Returns wallet ID.';

-- =====================================================
-- VERIFICATION
-- =====================================================

-- Test the function (replace with actual user ID from your database)
-- SELECT ensure_user_wallet('your-user-uuid-here');

-- Check if function exists
SELECT 
  routine_name,
  routine_type,
  routine_definition
FROM information_schema.routines 
WHERE routine_name = 'ensure_user_wallet';

-- Expected result: Should show the function definition

