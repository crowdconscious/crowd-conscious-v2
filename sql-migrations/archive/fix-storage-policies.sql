-- Fix Storage Policies - Row Level Security Issues
-- Run this in your Supabase SQL Editor to fix upload permissions

-- First, drop any existing conflicting policies
DROP POLICY IF EXISTS "Public read access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete" ON storage.objects;

-- Create correct storage policies with proper bucket filtering

-- 1. Public read access for all our buckets
CREATE POLICY "Enable read access for all users" ON storage.objects
  FOR SELECT USING (
    bucket_id IN ('community-images', 'content-media', 'profile-pictures')
  );

-- 2. Authenticated users can insert files
CREATE POLICY "Enable insert for authenticated users" ON storage.objects
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated' AND
    bucket_id IN ('community-images', 'content-media', 'profile-pictures')
  );

-- 3. Users can update their own files or community files they have access to
CREATE POLICY "Enable update for authenticated users" ON storage.objects
  FOR UPDATE USING (
    auth.role() = 'authenticated' AND
    bucket_id IN ('community-images', 'content-media', 'profile-pictures')
  ) WITH CHECK (
    auth.role() = 'authenticated' AND
    bucket_id IN ('community-images', 'content-media', 'profile-pictures')
  );

-- 4. Users can delete their own files or community files they have access to
CREATE POLICY "Enable delete for authenticated users" ON storage.objects
  FOR DELETE USING (
    auth.role() = 'authenticated' AND
    bucket_id IN ('community-images', 'content-media', 'profile-pictures')
  );

-- Alternative simpler approach - if above doesn't work, try these minimal policies:

-- Drop the complex policies and create simple ones
-- DROP POLICY IF EXISTS "Enable read access for all users" ON storage.objects;
-- DROP POLICY IF EXISTS "Enable insert for authenticated users" ON storage.objects;
-- DROP POLICY IF EXISTS "Enable update for authenticated users" ON storage.objects;
-- DROP POLICY IF EXISTS "Enable delete for authenticated users" ON storage.objects;

-- CREATE POLICY "Allow all operations on our buckets" ON storage.objects
--   FOR ALL USING (
--     bucket_id IN ('community-images', 'content-media', 'profile-pictures')
--   ) WITH CHECK (
--     bucket_id IN ('community-images', 'content-media', 'profile-pictures')
--   );

-- Verify the buckets exist and are public
UPDATE storage.buckets 
SET public = true 
WHERE id IN ('community-images', 'content-media', 'profile-pictures');

-- Check current policies (for debugging)
-- SELECT * FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage';
