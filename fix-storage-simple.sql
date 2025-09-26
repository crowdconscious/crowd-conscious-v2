-- SIMPLIFIED STORAGE FIX - Run this in Supabase SQL Editor
-- This is the simplest possible approach

-- ============================================================================
-- STEP 1: Clean up existing policies (if they exist)
-- ============================================================================
DROP POLICY IF EXISTS "Public read access" ON storage.objects;
DROP POLICY IF EXISTS "Auth users can upload" ON storage.objects;
DROP POLICY IF EXISTS "Auth users can update own" ON storage.objects;
DROP POLICY IF EXISTS "Auth users can delete own" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow public downloads" ON storage.objects;
DROP POLICY IF EXISTS "Community founders can upload" ON storage.objects;
DROP POLICY IF EXISTS "Public access to community images" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated upload" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated update" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated delete" ON storage.objects;

-- ============================================================================
-- STEP 2: Ensure buckets exist with correct settings
-- ============================================================================

-- Delete existing buckets (this will fail if they don't exist, which is fine)
DELETE FROM storage.buckets WHERE id = 'community-images';
DELETE FROM storage.buckets WHERE id = 'content-media';
DELETE FROM storage.buckets WHERE id = 'profile-pictures';

-- Create buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('community-images', 'community-images', true, 52428800, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('content-media', 'content-media', true, 52428800, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('profile-pictures', 'profile-pictures', true, 52428800, ARRAY['image/jpeg', 'image/png', 'image/webp']);

-- ============================================================================
-- STEP 3: Create the simplest possible policies
-- ============================================================================

-- Allow everyone to read files
CREATE POLICY "Public read access" ON storage.objects
  FOR SELECT USING (true);

-- Allow any authenticated user to upload files
CREATE POLICY "Authenticated upload" ON storage.objects
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Allow any authenticated user to update files
CREATE POLICY "Authenticated update" ON storage.objects
  FOR UPDATE USING (auth.uid() IS NOT NULL);

-- Allow any authenticated user to delete files
CREATE POLICY "Authenticated delete" ON storage.objects
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- ============================================================================
-- STEP 4: Verify setup
-- ============================================================================

-- Check buckets
SELECT 'BUCKETS:' as check_type, id, name, public, file_size_limit
FROM storage.buckets
WHERE id IN ('community-images', 'content-media', 'profile-pictures')
UNION ALL
-- Check policies
SELECT 'POLICIES:' as check_type, policyname as id, cmd as name, 'true' as public, 0 as file_size_limit
FROM pg_policies
WHERE tablename = 'objects' AND schemaname = 'storage'
ORDER BY check_type, id;
