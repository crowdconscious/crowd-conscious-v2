-- Fix RLS policy for user_settings to allow INSERT during signup
-- The trigger create_user_settings() needs to be able to INSERT when a profile is created
-- 
-- ISSUE: The existing policy "Users can update own settings" uses "FOR ALL USING" 
-- which doesn't properly handle INSERT operations. PostgreSQL RLS requires 
-- "WITH CHECK" for INSERT operations, not just "USING".

-- Drop ALL existing policies on user_settings to avoid conflicts
-- Using a DO block to drop all policies dynamically
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'user_settings' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON user_settings', r.policyname);
    END LOOP;
END $$;

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

-- CRITICAL FIX: Make the trigger function SECURITY DEFINER
-- This allows the trigger to bypass RLS when inserting user_settings
-- The trigger runs during profile creation when auth context might not be fully established
CREATE OR REPLACE FUNCTION create_user_settings()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_settings (user_id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

