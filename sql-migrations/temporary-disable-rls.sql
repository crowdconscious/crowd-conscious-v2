-- TEMPORARY FIX: Disable RLS to test uploads
-- Run this to temporarily allow uploads while we debug

-- Disable RLS on storage.objects table
ALTER TABLE storage.objects DISABLE ROW LEVEL SECURITY;

-- Ensure buckets are public
UPDATE storage.buckets 
SET public = true 
WHERE id IN ('community-images', 'content-media', 'profile-pictures');

-- After testing uploads work, run this to re-enable with simple policies:

-- ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- CREATE POLICY "Allow authenticated users all operations" ON storage.objects
--   FOR ALL TO authenticated USING (
--     bucket_id IN ('community-images', 'content-media', 'profile-pictures')
--   ) WITH CHECK (
--     bucket_id IN ('community-images', 'content-media', 'profile-pictures')
--   );

-- CREATE POLICY "Allow public read access" ON storage.objects
--   FOR SELECT TO public USING (
--     bucket_id IN ('community-images', 'content-media', 'profile-pictures')
--   );
