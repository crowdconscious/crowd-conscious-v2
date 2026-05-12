-- Set up admin user (replace with your actual email)
-- Update this email to your actual email address
UPDATE profiles 
SET user_type = 'admin' 
WHERE email = 'your_email@example.com';

-- If the profile doesn't exist yet, you can create it manually:
-- INSERT INTO profiles (id, email, full_name, user_type) 
-- VALUES ('your-uuid-here', 'your_email@example.com', 'Your Name', 'admin');

-- Add admin-specific columns to profiles if not exists
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS admin_level TEXT DEFAULT 'standard' CHECK (admin_level IN ('standard', 'super'));

-- Update the specific user to super admin
UPDATE profiles 
SET admin_level = 'super' 
WHERE email = 'your_email@example.com' AND user_type = 'admin';

-- Create admin_actions table for audit trail
CREATE TABLE IF NOT EXISTS admin_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL CHECK (action_type IN (
    'approve_community', 'reject_community',
    'approve_sponsorship', 'reject_sponsorship',
    'suspend_user', 'unsuspend_user',
    'moderate_content', 'delete_content',
    'update_platform_settings'
  )),
  target_type TEXT NOT NULL CHECK (target_type IN (
    'community', 'sponsorship', 'user', 'content', 'setting'
  )),
  target_id UUID,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for admin_actions
ALTER TABLE admin_actions ENABLE ROW LEVEL SECURITY;

-- Policy: Only admins can view admin actions
DROP POLICY IF EXISTS "Admins can view admin actions" ON admin_actions;
CREATE POLICY "Admins can view admin actions" ON admin_actions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND user_type = 'admin'
    )
  );

-- Policy: Only admins can create admin actions
DROP POLICY IF EXISTS "Admins can create admin actions" ON admin_actions;
CREATE POLICY "Admins can create admin actions" ON admin_actions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND user_type = 'admin'
    ) AND admin_id = auth.uid()
  );

-- Add moderation fields to communities
ALTER TABLE communities 
ADD COLUMN IF NOT EXISTS moderation_status TEXT DEFAULT 'approved' CHECK (
  moderation_status IN ('pending', 'approved', 'rejected', 'suspended')
),
ADD COLUMN IF NOT EXISTS moderated_by UUID REFERENCES profiles(id),
ADD COLUMN IF NOT EXISTS moderated_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS moderation_notes TEXT;

-- Add moderation fields to sponsorships
ALTER TABLE sponsorships 
ADD COLUMN IF NOT EXISTS admin_notes TEXT,
ADD COLUMN IF NOT EXISTS requires_admin_review BOOLEAN DEFAULT FALSE;

-- Add suspension fields to profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS suspended BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS suspended_by UUID REFERENCES profiles(id),
ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS suspension_reason TEXT;

-- Create platform_settings table
CREATE TABLE IF NOT EXISTS platform_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key TEXT UNIQUE NOT NULL,
  setting_value JSONB NOT NULL,
  description TEXT,
  updated_by UUID REFERENCES profiles(id),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default platform settings
INSERT INTO platform_settings (setting_key, setting_value, description) VALUES
  ('platform_fee_percentage', '15', 'Platform fee percentage for sponsorships'),
  ('auto_approve_communities', 'false', 'Whether to auto-approve new communities'),
  ('min_sponsorship_amount', '50', 'Minimum sponsorship amount in USD'),
  ('max_sponsorship_amount', '10000', 'Maximum sponsorship amount in USD')
ON CONFLICT (setting_key) DO NOTHING;

-- Enable RLS for platform_settings
ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read settings, only admins can modify
DROP POLICY IF EXISTS "Anyone can read platform settings" ON platform_settings;
CREATE POLICY "Anyone can read platform settings" ON platform_settings
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Only admins can modify platform settings" ON platform_settings;
CREATE POLICY "Only admins can modify platform settings" ON platform_settings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND user_type = 'admin'
    )
  );
