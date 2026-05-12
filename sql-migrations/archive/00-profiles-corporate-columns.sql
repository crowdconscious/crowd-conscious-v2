-- ============================================
-- Add Corporate Columns to Profiles Table
-- Run this BEFORE corporate-phase1-tables-FIXED.sql
-- ============================================

-- Add corporate columns to profiles if they don't exist
DO $$
BEGIN
  -- Add corporate_account_id
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'corporate_account_id'
  ) THEN
    ALTER TABLE profiles ADD COLUMN corporate_account_id UUID REFERENCES corporate_accounts(id) ON DELETE SET NULL;
    RAISE NOTICE 'Added corporate_account_id column to profiles';
  END IF;

  -- Add corporate_role
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'corporate_role'
  ) THEN
    ALTER TABLE profiles ADD COLUMN corporate_role TEXT CHECK (corporate_role IN ('admin', 'employee'));
    RAISE NOTICE 'Added corporate_role column to profiles';
  END IF;

  -- Add is_corporate_user
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'is_corporate_user'
  ) THEN
    ALTER TABLE profiles ADD COLUMN is_corporate_user BOOLEAN DEFAULT false;
    RAISE NOTICE 'Added is_corporate_user column to profiles';
  END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_corporate_account ON profiles(corporate_account_id);
CREATE INDEX IF NOT EXISTS idx_profiles_corporate_role ON profiles(corporate_role);
CREATE INDEX IF NOT EXISTS idx_profiles_is_corporate ON profiles(is_corporate_user);

-- Verify columns exist
DO $$
BEGIN
  RAISE NOTICE '✅ Corporate columns added to profiles table successfully!';
  RAISE NOTICE 'Columns: corporate_account_id, corporate_role, is_corporate_user';
END $$;

