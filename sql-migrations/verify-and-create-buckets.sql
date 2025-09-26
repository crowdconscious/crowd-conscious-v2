-- Verify and Create Storage Buckets with Simple Policies
-- Run this step by step in Supabase SQL Editor

-- Step 1: Check if buckets exist
SELECT id, name, public, file_size_limit, allowed_mime_types 
FROM storage.buckets 
WHERE id IN ('community-images', 'content-media', 'profile-pictures');

-- Step 2: Create buckets if they don't exist (manually in Dashboard is easier)
-- Go to Storage > Create bucket in Dashboard:
-- Name: community-images, Public: Yes, File size limit: 50MB, MIME types: image/*

-- Step 3: Set bucket permissions (run this after creating buckets)
UPDATE storage.buckets 
SET 
  public = true,
  file_size_limit = 52428800, -- 50MB
  allowed_mime_types = '{image/jpeg,image/png,image/webp,image/gif}'::text[]
WHERE id IN ('community-images', 'content-media', 'profile-pictures');

-- Step 4: Create simple storage policies
-- Delete existing policies first
DO $$
BEGIN
    -- Delete all existing policies on storage.objects
    DROP POLICY IF EXISTS "Public read access" ON storage.objects;
    DROP POLICY IF EXISTS "Authenticated users can upload" ON storage.objects;
    DROP POLICY IF EXISTS "Public can read all media" ON storage.objects;
    DROP POLICY IF EXISTS "Founders can upload community media" ON storage.objects;
    DROP POLICY IF EXISTS "Enable read access for all users" ON storage.objects;
    DROP POLICY IF EXISTS "Enable insert for authenticated users" ON storage.objects;
    DROP POLICY IF EXISTS "public_read_policy" ON storage.objects;
    DROP POLICY IF EXISTS "authenticated_all_policy" ON storage.objects;
EXCEPTION
    WHEN others THEN
        -- Ignore errors if policies don't exist
        NULL;
END $$;

-- Step 5: Create new simple policies
-- Public can read all files
CREATE POLICY "allow_public_read" ON storage.objects
    FOR SELECT USING (true);

-- Authenticated users can upload to our buckets
CREATE POLICY "allow_authenticated_upload" ON storage.objects
    FOR INSERT 
    WITH CHECK (
        auth.role() = 'authenticated' AND 
        bucket_id IN ('community-images', 'content-media', 'profile-pictures')
    );

-- Authenticated users can update/delete files in our buckets  
CREATE POLICY "allow_authenticated_modify" ON storage.objects
    FOR ALL USING (
        auth.role() = 'authenticated' AND 
        bucket_id IN ('community-images', 'content-media', 'profile-pictures')
    );

-- Step 6: Verify policies were created
SELECT policyname, cmd, qual 
FROM pg_policies 
WHERE tablename = 'objects' AND schemaname = 'storage';
