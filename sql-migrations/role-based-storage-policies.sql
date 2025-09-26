-- Role-Based Storage Policies for Community Media
-- Only founders can upload/delete, everyone can read

-- First, remove all existing storage policies
DROP POLICY IF EXISTS "Public read access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete" ON storage.objects;
DROP POLICY IF EXISTS "Enable read access for all users" ON storage.objects;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON storage.objects;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON storage.objects;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON storage.objects;

-- 1. PUBLIC READ ACCESS - Anyone can view images
CREATE POLICY "Public can read all media" ON storage.objects
  FOR SELECT USING (
    bucket_id IN ('community-images', 'content-media', 'profile-pictures')
  );

-- 2. FOUNDERS CAN UPLOAD COMMUNITY MEDIA - Only founders can upload community images
CREATE POLICY "Founders can upload community media" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id IN ('community-images', 'content-media') AND
    auth.role() = 'authenticated' AND
    -- Check if user is a founder of the community
    EXISTS (
      SELECT 1 FROM community_members cm
      WHERE cm.user_id = auth.uid()
      AND cm.role = 'founder'
      -- Extract community ID from the storage path (e.g., logos/community-id/filename)
      AND cm.community_id::text = split_part(name, '/', 2)
    )
  );

-- 3. FOUNDERS CAN UPDATE COMMUNITY MEDIA
CREATE POLICY "Founders can update community media" ON storage.objects
  FOR UPDATE USING (
    bucket_id IN ('community-images', 'content-media') AND
    auth.role() = 'authenticated' AND
    EXISTS (
      SELECT 1 FROM community_members cm
      WHERE cm.user_id = auth.uid()
      AND cm.role = 'founder'
      AND cm.community_id::text = split_part(name, '/', 2)
    )
  ) WITH CHECK (
    bucket_id IN ('community-images', 'content-media') AND
    auth.role() = 'authenticated' AND
    EXISTS (
      SELECT 1 FROM community_members cm
      WHERE cm.user_id = auth.uid()
      AND cm.role = 'founder'
      AND cm.community_id::text = split_part(name, '/', 2)
    )
  );

-- 4. FOUNDERS CAN DELETE COMMUNITY MEDIA
CREATE POLICY "Founders can delete community media" ON storage.objects
  FOR DELETE USING (
    bucket_id IN ('community-images', 'content-media') AND
    auth.role() = 'authenticated' AND
    EXISTS (
      SELECT 1 FROM community_members cm
      WHERE cm.user_id = auth.uid()
      AND cm.role = 'founder'
      AND cm.community_id::text = split_part(name, '/', 2)
    )
  );

-- 5. USERS CAN MANAGE THEIR OWN PROFILE PICTURES
CREATE POLICY "Users can manage own profile pictures" ON storage.objects
  FOR ALL USING (
    bucket_id = 'profile-pictures' AND
    auth.role() = 'authenticated' AND
    -- Check if the file belongs to the current user
    split_part(name, '/', 2) = auth.uid()::text
  ) WITH CHECK (
    bucket_id = 'profile-pictures' AND
    auth.role() = 'authenticated' AND
    split_part(name, '/', 2) = auth.uid()::text
  );

-- Alternative simpler approach if the above doesn't work:
-- Temporarily disable RLS to test uploads, then re-enable with simpler policies

-- UNCOMMENT THESE LINES TO TEST (TEMPORARY):
-- ALTER TABLE storage.objects DISABLE ROW LEVEL SECURITY;

-- OR use simple policies:
-- CREATE POLICY "Allow all for our buckets" ON storage.objects
--   FOR ALL USING (
--     bucket_id IN ('community-images', 'content-media', 'profile-pictures')
--   ) WITH CHECK (
--     bucket_id IN ('community-images', 'content-media', 'profile-pictures')
--   );

-- Ensure buckets are public for read access
UPDATE storage.buckets 
SET public = true 
WHERE id IN ('community-images', 'content-media', 'profile-pictures');

-- Check current policies (for debugging)
SELECT policyname, cmd, qual FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage';
