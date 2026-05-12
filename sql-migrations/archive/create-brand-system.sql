-- Create Brand Profile System with Storage
-- This follows the rebuild strategy's user_type enum approach

-- First, ensure profiles table has the user_type column and brand-specific fields
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS user_type TEXT DEFAULT 'user' CHECK (user_type IN ('user', 'brand', 'admin')),
ADD COLUMN IF NOT EXISTS company_name TEXT,
ADD COLUMN IF NOT EXISTS company_description TEXT,
ADD COLUMN IF NOT EXISTS company_website TEXT,
ADD COLUMN IF NOT EXISTS company_size TEXT CHECK (company_size IN ('startup', 'small', 'medium', 'large', 'enterprise')),
ADD COLUMN IF NOT EXISTS industry TEXT,
ADD COLUMN IF NOT EXISTS logo_url TEXT,
ADD COLUMN IF NOT EXISTS verified_brand BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS total_sponsored DECIMAL DEFAULT 0,
ADD COLUMN IF NOT EXISTS sponsorship_count INTEGER DEFAULT 0;

-- Create brand_preferences table for brand-specific settings
CREATE TABLE IF NOT EXISTS brand_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  sponsorship_budget_min DECIMAL DEFAULT 0,
  sponsorship_budget_max DECIMAL,
  preferred_impact_types TEXT[] DEFAULT ARRAY['clean_air', 'clean_water', 'safe_cities', 'zero_waste', 'fair_trade'],
  preferred_community_size TEXT CHECK (preferred_community_size IN ('small', 'medium', 'large', 'any')),
  auto_approve_under DECIMAL DEFAULT 0, -- Auto-approve sponsorships under this amount
  notification_frequency TEXT DEFAULT 'immediate' CHECK (notification_frequency IN ('immediate', 'daily', 'weekly')),
  public_profile BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for brand_preferences
ALTER TABLE brand_preferences ENABLE ROW LEVEL SECURITY;

-- Policies for brand_preferences
DROP POLICY IF EXISTS "Brands can manage their own preferences" ON brand_preferences;
CREATE POLICY "Brands can manage their own preferences" ON brand_preferences
  FOR ALL USING (auth.uid() = brand_id);

-- Create sponsorship_applications table (brands apply to sponsor needs)
CREATE TABLE IF NOT EXISTS sponsorship_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id UUID REFERENCES community_content(id) ON DELETE CASCADE,
  brand_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  proposed_amount DECIMAL NOT NULL,
  message TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'withdrawn')),
  community_response TEXT,
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '30 days'),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(content_id, brand_id)
);

-- Enable RLS for sponsorship_applications
ALTER TABLE sponsorship_applications ENABLE ROW LEVEL SECURITY;

-- Policies for sponsorship_applications
DROP POLICY IF EXISTS "Anyone can view sponsorship applications" ON sponsorship_applications;
CREATE POLICY "Anyone can view sponsorship applications" ON sponsorship_applications
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Brands can create applications" ON sponsorship_applications;
CREATE POLICY "Brands can create applications" ON sponsorship_applications
  FOR INSERT WITH CHECK (auth.uid() = brand_id);

DROP POLICY IF EXISTS "Brands can update their applications" ON sponsorship_applications;
CREATE POLICY "Brands can update their applications" ON sponsorship_applications
  FOR UPDATE USING (auth.uid() = brand_id);

DROP POLICY IF EXISTS "Community members can respond to applications" ON sponsorship_applications;
CREATE POLICY "Community members can respond to applications" ON sponsorship_applications
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM community_members cm
      JOIN community_content cc ON cc.community_id = cm.community_id
      WHERE cc.id = content_id 
      AND cm.user_id = auth.uid() 
      AND cm.role IN ('founder', 'admin')
    )
  );

-- Create brand_community_relationships table (track brand engagement with communities)
CREATE TABLE IF NOT EXISTS brand_community_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  community_id UUID REFERENCES communities(id) ON DELETE CASCADE,
  relationship_type TEXT DEFAULT 'sponsor' CHECK (relationship_type IN ('sponsor', 'partner', 'supporter')),
  total_sponsored DECIMAL DEFAULT 0,
  sponsorship_count INTEGER DEFAULT 0,
  first_sponsorship_at TIMESTAMP WITH TIME ZONE,
  last_sponsorship_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(brand_id, community_id)
);

-- Enable RLS for brand_community_relationships
ALTER TABLE brand_community_relationships ENABLE ROW LEVEL SECURITY;

-- Policies for brand_community_relationships
DROP POLICY IF EXISTS "Anyone can view brand relationships" ON brand_community_relationships;
CREATE POLICY "Anyone can view brand relationships" ON brand_community_relationships
  FOR SELECT USING (true);

-- Update the existing sponsorships table to include brand recognition fields
ALTER TABLE sponsorships 
ADD COLUMN IF NOT EXISTS brand_message TEXT,
ADD COLUMN IF NOT EXISTS logo_placement TEXT DEFAULT 'standard' CHECK (logo_placement IN ('standard', 'prominent', 'minimal')),
ADD COLUMN IF NOT EXISTS recognition_level TEXT DEFAULT 'public' CHECK (recognition_level IN ('anonymous', 'public', 'featured'));

-- Function to update brand statistics when sponsorship is paid
CREATE OR REPLACE FUNCTION update_brand_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'paid' AND OLD.status != 'paid' THEN
    -- Update brand profile stats
    UPDATE profiles 
    SET 
      total_sponsored = total_sponsored + NEW.amount,
      sponsorship_count = sponsorship_count + 1
    WHERE id = NEW.sponsor_id;
    
    -- Update brand-community relationship
    INSERT INTO brand_community_relationships (
      brand_id, 
      community_id, 
      total_sponsored, 
      sponsorship_count,
      first_sponsorship_at,
      last_sponsorship_at
    )
    SELECT 
      NEW.sponsor_id,
      cc.community_id,
      NEW.amount,
      1,
      NEW.created_at,
      NEW.created_at
    FROM community_content cc WHERE cc.id = NEW.content_id
    ON CONFLICT (brand_id, community_id) 
    DO UPDATE SET
      total_sponsored = brand_community_relationships.total_sponsored + NEW.amount,
      sponsorship_count = brand_community_relationships.sponsorship_count + 1,
      last_sponsorship_at = NEW.created_at;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for updating brand stats
DROP TRIGGER IF EXISTS trg_update_brand_stats ON sponsorships;
CREATE TRIGGER trg_update_brand_stats
  AFTER UPDATE ON sponsorships
  FOR EACH ROW
  EXECUTE FUNCTION update_brand_stats();

-- Create storage buckets for profile pictures and brand logos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('profile-pictures', 'profile-pictures', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp']),
  ('brand-logos', 'brand-logos', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'])
ON CONFLICT (id) DO NOTHING;

-- RLS policies for profile pictures bucket
DROP POLICY IF EXISTS "Anyone can view profile pictures" ON storage.objects;
CREATE POLICY "Anyone can view profile pictures" ON storage.objects
  FOR SELECT USING (bucket_id = 'profile-pictures');

DROP POLICY IF EXISTS "Users can upload their own profile picture" ON storage.objects;
CREATE POLICY "Users can upload their own profile picture" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'profile-pictures' 
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Users can update their own profile picture" ON storage.objects;
CREATE POLICY "Users can update their own profile picture" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'profile-pictures' 
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Users can delete their own profile picture" ON storage.objects;
CREATE POLICY "Users can delete their own profile picture" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'profile-pictures' 
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- RLS policies for brand logos bucket
DROP POLICY IF EXISTS "Anyone can view brand logos" ON storage.objects;
CREATE POLICY "Anyone can view brand logos" ON storage.objects
  FOR SELECT USING (bucket_id = 'brand-logos');

DROP POLICY IF EXISTS "Brands can upload their own logo" ON storage.objects;
CREATE POLICY "Brands can upload their own logo" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'brand-logos' 
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND user_type = 'brand'
    )
  );

DROP POLICY IF EXISTS "Brands can update their own logo" ON storage.objects;
CREATE POLICY "Brands can update their own logo" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'brand-logos' 
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND user_type = 'brand'
    )
  );

DROP POLICY IF EXISTS "Brands can delete their own logo" ON storage.objects;
CREATE POLICY "Brands can delete their own logo" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'brand-logos' 
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND user_type = 'brand'
    )
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_user_type ON profiles(user_type);
CREATE INDEX IF NOT EXISTS idx_profiles_verified_brand ON profiles(verified_brand) WHERE user_type = 'brand';
CREATE INDEX IF NOT EXISTS idx_sponsorship_applications_status ON sponsorship_applications(status);
CREATE INDEX IF NOT EXISTS idx_sponsorship_applications_content ON sponsorship_applications(content_id);
CREATE INDEX IF NOT EXISTS idx_brand_community_relationships_brand ON brand_community_relationships(brand_id);
CREATE INDEX IF NOT EXISTS idx_brand_community_relationships_community ON brand_community_relationships(community_id);
