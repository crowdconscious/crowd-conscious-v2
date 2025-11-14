-- Fix RLS policy for user_settings to allow INSERT during signup
-- The trigger create_user_settings() needs to be able to INSERT when a profile is created
-- 
-- ISSUE: The existing policy "Users can update own settings" uses "FOR ALL USING" 
-- which doesn't properly handle INSERT operations. PostgreSQL RLS requires 
-- "WITH CHECK" for INSERT operations, not just "USING".

-- Drop all existing policies to recreate them properly
DROP POLICY IF EXISTS "Users can view own settings" ON user_settings;
DROP POLICY IF EXISTS "Users can update own settings" ON user_settings;
DROP POLICY IF EXISTS "Users can insert own settings" ON user_settings;
DROP POLICY IF EXISTS "Users can delete own settings" ON user_settings;

-- Create separate policies for better control
-- SELECT policy: Users can view their own settings
CREATE POLICY "Users can view own settings" ON user_settings
  FOR SELECT USING (auth.uid() = user_id);

-- INSERT policy: Allow users to create their own settings (needed for trigger)
-- WITH CHECK is required for INSERT operations in PostgreSQL RLS
CREATE POLICY "Users can insert own settings" ON user_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- UPDATE policy: Users can update their own settings
CREATE POLICY "Users can update own settings" ON user_settings
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- DELETE policy: Users can delete their own settings
CREATE POLICY "Users can delete own settings" ON user_settings
  FOR DELETE USING (auth.uid() = user_id);

