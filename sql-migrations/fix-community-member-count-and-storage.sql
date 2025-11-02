-- =====================================================
-- FIX COMMUNITY MEMBER COUNT, STORAGE BUCKETS, AND RLS
-- Run this in Supabase SQL Editor
-- =====================================================

BEGIN;

-- =====================================================
-- 1. FIX MEMBER COUNT TRIGGER
-- =====================================================

-- Ensure the trigger function exists
CREATE OR REPLACE FUNCTION update_member_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE communities 
    SET member_count = member_count + 1 
    WHERE id = NEW.community_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE communities 
    SET member_count = GREATEST(member_count - 1, 0)
    WHERE id = OLD.community_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
DROP TRIGGER IF EXISTS member_count_trigger ON community_members;
CREATE TRIGGER member_count_trigger
  AFTER INSERT OR DELETE ON community_members
  FOR EACH ROW EXECUTE FUNCTION update_member_count();

-- Update all community member counts to be accurate RIGHT NOW
UPDATE communities 
SET member_count = (
    SELECT COUNT(*) 
    FROM community_members 
    WHERE community_id = communities.id
);

-- =====================================================
-- 2. ENSURE STORAGE BUCKETS EXIST
-- =====================================================

-- Note: Storage buckets must be created in Supabase Dashboard -> Storage
-- Required buckets:
-- 1. profile-pictures (for user avatars)
-- 2. brand-logos (for brand/company logos)
-- 3. content-images (for community content)
-- 4. evidence-uploads (for module evidence)

-- =====================================================
-- 3. ADD STRIPE CONNECT COLUMNS IF MISSING
-- =====================================================

-- Check if columns exist and add if missing
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'stripe_connect_id'
    ) THEN
        ALTER TABLE profiles ADD COLUMN stripe_connect_id TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'stripe_onboarding_complete'
    ) THEN
        ALTER TABLE profiles ADD COLUMN stripe_onboarding_complete BOOLEAN DEFAULT FALSE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'stripe_charges_enabled'
    ) THEN
        ALTER TABLE profiles ADD COLUMN stripe_charges_enabled BOOLEAN DEFAULT FALSE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'stripe_payouts_enabled'
    ) THEN
        ALTER TABLE profiles ADD COLUMN stripe_payouts_enabled BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- =====================================================
-- 4. VERIFY CURRENT STATE
-- =====================================================

-- Check member counts
SELECT 
    c.name,
    c.member_count as displayed_count,
    (SELECT COUNT(*) FROM community_members cm WHERE cm.community_id = c.id) as actual_count,
    CASE 
        WHEN c.member_count = (SELECT COUNT(*) FROM community_members cm WHERE cm.community_id = c.id) 
        THEN '✅ CORRECT' 
        ELSE '❌ MISMATCH' 
    END as status
FROM communities c
ORDER BY c.name;

-- Check Stripe Connect columns
SELECT 
    id,
    email,
    stripe_connect_id IS NOT NULL as has_stripe_connect,
    stripe_onboarding_complete,
    stripe_charges_enabled,
    stripe_payouts_enabled
FROM profiles
WHERE id IN (
    SELECT creator_id FROM communities
)
LIMIT 5;

COMMIT;

-- =====================================================
-- MANUAL STEPS REQUIRED IN SUPABASE DASHBOARD
-- =====================================================

/*

STEP 1: CREATE STORAGE BUCKETS
-------------------------------
Go to: Storage -> Create Bucket

Create these buckets if they don't exist:

1. profile-pictures
   - Public: YES
   - File size limit: 5MB
   - Allowed MIME types: image/jpeg, image/png, image/webp

2. brand-logos
   - Public: YES
   - File size limit: 5MB
   - Allowed MIME types: image/jpeg, image/png, image/webp, image/svg+xml

3. content-images (should already exist)
   - Public: YES
   - File size limit: 10MB

4. evidence-uploads (should already exist)
   - Public: NO
   - File size limit: 10MB


STEP 2: SET RLS POLICIES FOR STORAGE BUCKETS
---------------------------------------------
For profile-pictures bucket:

INSERT Policy:
- Policy name: Allow authenticated users to upload profile pictures
- Target roles: authenticated
- INSERT allowed with check:
  bucket_id = 'profile-pictures' AND auth.uid()::text = (storage.foldername(name))[1]

SELECT Policy:
- Policy name: Allow public access to profile pictures
- Target roles: public
- SELECT allowed for all

UPDATE Policy:
- Policy name: Allow users to update own profile pictures
- Target roles: authenticated
- UPDATE allowed with check:
  bucket_id = 'profile-pictures' AND auth.uid()::text = (storage.foldername(name))[1]

DELETE Policy:
- Policy name: Allow users to delete own profile pictures
- Target roles: authenticated
- DELETE allowed with check:
  bucket_id = 'profile-pictures' AND auth.uid()::text = (storage.foldername(name))[1]


For brand-logos bucket (same policies as profile-pictures):

INSERT Policy:
- Policy name: Allow authenticated users to upload brand logos
- Target roles: authenticated
- INSERT allowed with check:
  bucket_id = 'brand-logos' AND auth.uid()::text = (storage.foldername(name))[1]

SELECT Policy:
- Policy name: Allow public access to brand logos
- Target roles: public
- SELECT allowed for all

UPDATE Policy:
- Policy name: Allow users to update own brand logos
- Target roles: authenticated
- UPDATE allowed with check:
  bucket_id = 'brand-logos' AND auth.uid()::text = (storage.foldername(name))[1]

DELETE Policy:
- Policy name: Allow users to delete own brand logos
- Target roles: authenticated
- DELETE allowed with check:
  bucket_id = 'brand-logos' AND auth.uid()::text = (storage.foldername(name))[1]


STEP 3: VERIFY STRIPE ENVIRONMENT VARIABLES
--------------------------------------------
In Vercel Dashboard -> Settings -> Environment Variables, ensure:

- STRIPE_SECRET_KEY is set (starts with sk_live_ or sk_test_)
- NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is set (starts with pk_live_ or pk_test_)
- STRIPE_WEBHOOK_SECRET is set (starts with whsec_)

STEP 4: CHECK STRIPE CONNECT SETTINGS
--------------------------------------
In Stripe Dashboard:
1. Go to Connect -> Settings
2. Ensure "Express" account type is enabled
3. Set branding and redirects
4. Enable required capabilities: card_payments, transfers

*/

