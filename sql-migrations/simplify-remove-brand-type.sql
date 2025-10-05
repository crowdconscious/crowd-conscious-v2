-- =====================================================
-- PLATFORM SIMPLIFICATION: Remove Brand User Type
-- =====================================================
-- This migration removes the confusing "brand" user type
-- while maintaining full sponsorship functionality.
-- Anyone can now sponsor as individual or business.
-- =====================================================

-- STEP 1: Update sponsorships table with sponsor details
-- =====================================================

ALTER TABLE sponsorships 
ADD COLUMN IF NOT EXISTS sponsor_type TEXT DEFAULT 'individual' CHECK (sponsor_type IN ('individual', 'business')),
ADD COLUMN IF NOT EXISTS brand_name TEXT,
ADD COLUMN IF NOT EXISTS brand_logo_url TEXT,
ADD COLUMN IF NOT EXISTS brand_website TEXT,
ADD COLUMN IF NOT EXISTS tax_id TEXT,
ADD COLUMN IF NOT EXISTS display_name TEXT,
ADD COLUMN IF NOT EXISTS sponsor_email TEXT,
ADD COLUMN IF NOT EXISTS sponsor_phone TEXT,
ADD COLUMN IF NOT EXISTS message TEXT,
ADD COLUMN IF NOT EXISTS anonymous BOOLEAN DEFAULT false;

-- Add helpful comments
COMMENT ON COLUMN sponsorships.sponsor_type IS 'Individual or business sponsorship';
COMMENT ON COLUMN sponsorships.brand_name IS 'Business name if sponsor_type is business';
COMMENT ON COLUMN sponsorships.display_name IS 'Public display name for sponsor';
COMMENT ON COLUMN sponsorships.message IS 'Optional message from sponsor to community';
COMMENT ON COLUMN sponsorships.anonymous IS 'Whether sponsor wants to remain anonymous';

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_sponsorships_brand_name 
  ON sponsorships(brand_name) 
  WHERE sponsor_type = 'business' AND brand_name IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_sponsorships_status_type 
  ON sponsorships(status, sponsor_type);

CREATE INDEX IF NOT EXISTS idx_sponsorships_paid_business 
  ON sponsorships(sponsor_type, status) 
  WHERE sponsor_type = 'business' AND status = 'paid';

-- =====================================================
-- STEP 2: Simplify profiles table
-- =====================================================

-- Remove brand-specific fields (data moved to sponsorships)
ALTER TABLE profiles 
DROP COLUMN IF EXISTS company_name CASCADE,
DROP COLUMN IF EXISTS company_description CASCADE,
DROP COLUMN IF EXISTS company_website CASCADE,
DROP COLUMN IF EXISTS company_size CASCADE,
DROP COLUMN IF EXISTS industry CASCADE,
DROP COLUMN IF EXISTS logo_url CASCADE,
DROP COLUMN IF EXISTS verified_brand CASCADE,
DROP COLUMN IF EXISTS total_sponsored CASCADE,
DROP COLUMN IF EXISTS sponsorship_count CASCADE;

-- Simplify user_type: only 'user' or 'admin'
ALTER TABLE profiles
DROP CONSTRAINT IF EXISTS profiles_user_type_check CASCADE;

ALTER TABLE profiles
ADD CONSTRAINT profiles_user_type_check 
  CHECK (user_type IN ('user', 'admin'));

-- Update existing 'brand' users to 'user'
UPDATE profiles 
SET user_type = 'user' 
WHERE user_type = 'brand';

-- =====================================================
-- STEP 3: Mark old brand tables as deprecated
-- =====================================================

-- Don't drop tables yet (keep historical data)
-- Just mark as deprecated for future cleanup

COMMENT ON TABLE brand_preferences IS 
  'DEPRECATED: Brand functionality moved to sponsorships table. Safe to drop after data migration verification.';

COMMENT ON TABLE brand_community_relationships IS 
  'DEPRECATED: Brand relationships now tracked through sponsorships table. Safe to drop after verification.';

COMMENT ON TABLE sponsorship_applications IS 
  'DEPRECATED: Using direct sponsorship flow only. Safe to drop after verification.';

-- =====================================================
-- STEP 4: Create Trusted Brands View
-- =====================================================

-- Drop existing view if it exists
DROP MATERIALIZED VIEW IF EXISTS trusted_brands CASCADE;

-- Create materialized view for trusted brands
CREATE MATERIALIZED VIEW trusted_brands AS
SELECT 
  brand_name,
  brand_logo_url,
  brand_website,
  COUNT(DISTINCT id) as sponsorship_count,
  SUM(amount) as total_sponsored,
  MIN(created_at) as first_sponsorship,
  MAX(created_at) as last_sponsorship,
  ARRAY_AGG(DISTINCT content_id) as sponsored_content_ids
FROM sponsorships
WHERE 
  sponsor_type = 'business' 
  AND status = 'paid'
  AND brand_name IS NOT NULL
  AND brand_name != ''
GROUP BY brand_name, brand_logo_url, brand_website
HAVING COUNT(*) >= 1  -- At least 1 paid sponsorship
ORDER BY total_sponsored DESC;

-- Create index on the materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_trusted_brands_name 
  ON trusted_brands(brand_name);

CREATE INDEX IF NOT EXISTS idx_trusted_brands_total 
  ON trusted_brands(total_sponsored DESC);

-- =====================================================
-- STEP 5: Create refresh function and trigger
-- =====================================================

-- Function to refresh trusted brands view
CREATE OR REPLACE FUNCTION refresh_trusted_brands()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY trusted_brands;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-refresh when sponsorships are paid
CREATE OR REPLACE FUNCTION trigger_refresh_trusted_brands()
RETURNS TRIGGER AS $$
BEGIN
  -- Only refresh if a business sponsorship becomes paid
  IF NEW.status = 'paid' 
     AND (OLD.status IS NULL OR OLD.status != 'paid')
     AND NEW.sponsor_type = 'business' 
     AND NEW.brand_name IS NOT NULL 
  THEN
    -- Use pg_notify to refresh asynchronously (better performance)
    PERFORM pg_notify('refresh_trusted_brands', NEW.id::text);
    
    -- Optionally refresh immediately (comment out for async)
    PERFORM refresh_trusted_brands();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trg_refresh_trusted_brands ON sponsorships;
CREATE TRIGGER trg_refresh_trusted_brands
  AFTER INSERT OR UPDATE ON sponsorships
  FOR EACH ROW
  EXECUTE FUNCTION trigger_refresh_trusted_brands();

-- =====================================================
-- STEP 6: Helper functions for sponsorship queries
-- =====================================================

-- Function to get sponsor display name
CREATE OR REPLACE FUNCTION get_sponsor_display_name(sponsorship_id UUID)
RETURNS TEXT AS $$
DECLARE
  result TEXT;
BEGIN
  SELECT 
    CASE 
      WHEN s.sponsor_type = 'business' THEN s.brand_name
      WHEN s.display_name IS NOT NULL THEN s.display_name
      ELSE p.full_name
    END INTO result
  FROM sponsorships s
  LEFT JOIN profiles p ON p.id = s.sponsor_id
  WHERE s.id = sponsorship_id;
  
  RETURN COALESCE(result, 'Anonymous Sponsor');
END;
$$ LANGUAGE plpgsql STABLE;

-- =====================================================
-- STEP 7: Update RLS policies
-- =====================================================

-- Allow public to read paid sponsorships (for display)
DROP POLICY IF EXISTS "Anyone can view paid sponsorships" ON sponsorships;
CREATE POLICY "Anyone can view paid sponsorships" ON sponsorships
  FOR SELECT 
  USING (status = 'paid' OR auth.uid() = sponsor_id);

-- Users can create their own sponsorships
DROP POLICY IF EXISTS "Users can create sponsorships" ON sponsorships;
CREATE POLICY "Users can create sponsorships" ON sponsorships
  FOR INSERT 
  WITH CHECK (auth.uid() = sponsor_id);

-- Users can update their own pending sponsorships
DROP POLICY IF EXISTS "Users can update own pending sponsorships" ON sponsorships;
CREATE POLICY "Users can update own pending sponsorships" ON sponsorships
  FOR UPDATE 
  USING (auth.uid() = sponsor_id AND status = 'pending');

-- =====================================================
-- STEP 8: Initial refresh of trusted brands
-- =====================================================

-- Refresh the materialized view with current data
REFRESH MATERIALIZED VIEW trusted_brands;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Check that user_type only has 'user' and 'admin'
-- SELECT DISTINCT user_type FROM profiles;

-- Check sponsorships have new columns
-- SELECT sponsor_type, brand_name FROM sponsorships LIMIT 5;

-- Check trusted brands view
-- SELECT * FROM trusted_brands LIMIT 10;

-- Verify indexes created
-- SELECT indexname FROM pg_indexes WHERE tablename = 'sponsorships';

-- =====================================================
-- ROLLBACK (if needed)
-- =====================================================

-- To rollback this migration:
-- 1. Re-add brand user type: ALTER TABLE profiles ADD CONSTRAINT ...
-- 2. Re-add brand columns to profiles
-- 3. Drop new sponsorship columns
-- 4. Drop trusted_brands view
-- Note: Keep a backup before running this migration!

-- =====================================================
-- SUCCESS!
-- =====================================================

SELECT 'Platform simplification migration completed successfully!' as status;
