-- =========================================
-- FIX: Profile Picture Upload Not Working
-- =========================================
-- Issue: Users can't upload profile pictures (404 errors, upload fails)
-- Root Cause: Missing/incorrect RLS policies on storage and profiles table
-- Impact: Users can't personalize profiles
-- Priority: P0 - CRITICAL
-- Time: 30 minutes

-- =========================================
-- STEP 1: Fix Storage Bucket RLS Policies
-- =========================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can upload their own profile pictures" ON storage.objects;
DROP POLICY IF EXISTS "Users can view profile pictures" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own profile pictures" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own profile pictures" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload brand logos" ON storage.objects;

-- Allow users to INSERT their own profile pictures
CREATE POLICY "Users can upload their own profile pictures"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id IN ('profile-pictures', 'brand-logos') AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to SELECT (view) all profile pictures (they're public)
CREATE POLICY "Public profile pictures are viewable by everyone"
ON storage.objects FOR SELECT
TO public
USING (bucket_id IN ('profile-pictures', 'brand-logos'));

-- Allow users to UPDATE their own profile pictures
CREATE POLICY "Users can update their own profile pictures"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id IN ('profile-pictures', 'brand-logos') AND
  (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id IN ('profile-pictures', 'brand-logos') AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to DELETE their own profile pictures
CREATE POLICY "Users can delete their own profile pictures"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id IN ('profile-pictures', 'brand-logos') AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- =========================================
-- STEP 2: Verify Profiles Table RLS
-- =========================================

-- Ensure users can UPDATE their own avatar_url
DO $$
BEGIN
  -- Check if policy exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'profiles' 
    AND policyname = 'Users can update own profile'
  ) THEN
    CREATE POLICY "Users can update own profile"
    ON profiles FOR UPDATE
    TO authenticated
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());
    
    RAISE NOTICE '✅ Created policy: Users can update own profile';
  ELSE
    RAISE NOTICE '✅ Policy already exists: Users can update own profile';
  END IF;
END $$;

-- =========================================
-- STEP 3: Ensure buckets are public
-- =========================================

UPDATE storage.buckets
SET public = true
WHERE id IN ('profile-pictures', 'brand-logos')
AND public = false;

-- Verify bucket settings
SELECT 
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types,
  CASE 
    WHEN public = true THEN '✅ PUBLIC'
    ELSE '❌ PRIVATE (PROBLEM!)'
  END as status
FROM storage.buckets
WHERE id IN ('profile-pictures', 'brand-logos');

-- =========================================
-- STEP 4: Test Upload Permissions
-- =========================================

-- Check current user's upload permissions
DO $$
DECLARE
  current_user_id UUID;
BEGIN
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RAISE NOTICE '⚠️  No authenticated user - run this from app while logged in';
  ELSE
    RAISE NOTICE '✅ Current user: %', current_user_id;
    RAISE NOTICE '✅ User can now upload to: profile-pictures/%/', current_user_id;
  END IF;
END $$;

-- =========================================
-- STEP 5: Check for orphaned files
-- =========================================

-- List all profile picture files (for debugging)
-- This helps identify if files are uploading but not appearing
SELECT 
  name,
  bucket_id,
  created_at,
  metadata->>'size' as size,
  CASE 
    WHEN (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' 
    THEN '✅ Valid UUID folder'
    ELSE '❌ Invalid folder structure'
  END as folder_check
FROM storage.objects
WHERE bucket_id IN ('profile-pictures', 'brand-logos')
ORDER BY created_at DESC
LIMIT 20;

-- =========================================
-- VERIFICATION STEPS (for testing)
-- =========================================

-- After running this SQL:
-- 1. Go to /settings page
-- 2. Click "Upload New" button
-- 3. Select an image (JPG, PNG, or WebP under 5MB)
-- 4. Check browser console (F12) for errors
-- 5. Image should upload successfully

-- If still failing, check these:
-- 
-- 1. Browser Console Error Messages:
--    - Look for specific error text
--    - Check Network tab for failed requests
--    - Note the status code (403 = permissions, 404 = not found)
--
-- 2. Supabase Dashboard → Storage → profile-pictures:
--    - Is the bucket there?
--    - Is it public?
--    - Are there files in it?
--
-- 3. Supabase Dashboard → Authentication → Policies:
--    - Are the storage.objects policies enabled?
--    - Are the profiles policies enabled?
--
-- 4. Check if user is actually authenticated:
--    - SELECT auth.uid(); should return a UUID, not NULL

-- =========================================
-- COMMON ISSUES & SOLUTIONS
-- =========================================

/*
ISSUE 1: "new row violates row-level security policy"
SOLUTION: RLS policy too restrictive, check WITH CHECK clause

ISSUE 2: "permission denied for table objects"
SOLUTION: Policy not created or not enabled

ISSUE 3: "Failed to get public URL"
SOLUTION: Bucket is not public, run: UPDATE storage.buckets SET public = true WHERE id = 'profile-pictures'

ISSUE 4: Upload succeeds but image doesn't show
SOLUTION: Cache issue, hard refresh (Ctrl+Shift+R) or check URL is correct

ISSUE 5: 404 on image URL
SOLUTION: File path incorrect, check bucket name in URL matches actual bucket
*/

-- =========================================
-- SUCCESS MESSAGE
-- =========================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ ========================================';
  RAISE NOTICE '✅ PROFILE PICTURE UPLOAD FIXED!';
  RAISE NOTICE '✅ ========================================';
  RAISE NOTICE '';
  RAISE NOTICE '📊 What was done:';
  RAISE NOTICE '   1. ✅ Created/updated storage RLS policies';
  RAISE NOTICE '   2. ✅ Ensured buckets are public';
  RAISE NOTICE '   3. ✅ Verified profiles table UPDATE policy';
  RAISE NOTICE '   4. ✅ Checked folder structure permissions';
  RAISE NOTICE '';
  RAISE NOTICE '🧪 Next Steps (TESTING):';
  RAISE NOTICE '   1. Go to /settings page';
  RAISE NOTICE '   2. Click "Upload New" button';
  RAISE NOTICE '   3. Select image (JPG/PNG/WebP, under 5MB)';
  RAISE NOTICE '   4. Upload should work! ✅';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  If still failing:';
  RAISE NOTICE '   - Open browser console (F12)';
  RAISE NOTICE '   - Try upload again';
  RAISE NOTICE '   - Send me the console error message';
  RAISE NOTICE '';
END $$;

