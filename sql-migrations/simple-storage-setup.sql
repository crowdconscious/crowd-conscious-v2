-- Simple Storage Setup - Run this in Supabase Dashboard SQL Editor
-- This should work without owner permissions

-- Method 1: Create policies using proper Supabase functions
SELECT storage.create_policy(
  'public_read_policy',
  'objects',
  'SELECT',
  'true',
  'public'
);

SELECT storage.create_policy(
  'authenticated_all_policy', 
  'objects',
  'ALL',
  'true',
  'authenticated'
);

-- Method 2: If above doesn't work, try updating bucket settings
UPDATE storage.buckets 
SET 
  public = true,
  file_size_limit = 52428800,
  allowed_mime_types = '{image/jpeg,image/png,image/webp,image/gif}'::text[]
WHERE id IN ('community-images', 'content-media', 'profile-pictures');

-- Method 3: Check if buckets exist
SELECT id, name, public, file_size_limit, allowed_mime_types 
FROM storage.buckets 
WHERE id IN ('community-images', 'content-media', 'profile-pictures');
