-- Create Supabase Storage Buckets for Evidence Images
-- Run this in your Supabase SQL Editor

-- 1. Create bucket for employee evidence photos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'employee-evidence',
  'employee-evidence',
  true, -- Public access for easy display
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- 2. Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 3. Policy: Anyone can view public evidence images
CREATE POLICY "Public evidence images are viewable by everyone"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'employee-evidence');

-- 4. Policy: Authenticated users can upload evidence
CREATE POLICY "Employees can upload evidence"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'employee-evidence' 
  AND (storage.foldername(name))[1] = auth.uid()::text -- Files stored in user's folder
);

-- 5. Policy: Users can update their own evidence
CREATE POLICY "Employees can update their own evidence"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'employee-evidence' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 6. Policy: Users can delete their own evidence
CREATE POLICY "Employees can delete their own evidence"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'employee-evidence' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 7. Policy: Corporate admins can view all evidence in their account
CREATE POLICY "Corporate admins can view all company evidence"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'employee-evidence'
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.corporate_role = 'admin'
    AND profiles.corporate_account_id IN (
      SELECT corporate_account_id FROM profiles
      WHERE id::text = (storage.foldername(storage.objects.name))[1]
    )
  )
);

-- Verify bucket creation
SELECT id, name, public, file_size_limit, allowed_mime_types
FROM storage.buckets
WHERE id = 'employee-evidence';

-- Test query: Check if policies are created
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE tablename = 'objects'
AND schemaname = 'storage';
